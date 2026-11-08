const fs = require('fs');
const path = 'd:/Projects/SM/backend/src/office/office-management.service.ts';
let content = fs.readFileSync(path, 'utf8');

const oldRequestJoinStart = `  async requestJoin(userId: string, rawCode: unknown) {
    if (typeof rawCode !== 'string' || rawCode.length > 200) throw new BadRequestException('Geçerli ofis davet kodunu girin.');
    const sanitized = rawCode.trim().toUpperCase();
    return this.prisma.$transaction(async tx => {
      let officeId: string;
      let codeHash: string;

      if (sanitized.includes('.')) {
        const [targetOfficeId, codePart, extra] = rawCode.trim().split('.');
        if (!targetOfficeId || !/^[A-F0-9]{12,36}$/i.test(codePart || '') || extra) throw new BadRequestException('Ofis davet kodu geçersiz.');
        officeId = targetOfficeId;
        codeHash = digest(codePart.toUpperCase());
      } else {
        const cleanCode = sanitized.replace(/[\s-]/g, '');
        if (!/^[A-F0-9]{12}$/.test(cleanCode)) throw new BadRequestException('Ofis davet kodu geçersiz.');
        codeHash = digest(cleanCode);
        const lookup = await tx.systemSetting.findUnique({ where: { key: \`EPH_OFFICE_CODE_\${codeHash}\` } });
        const lookupVal = lookup?.valueJson as any;
        if (!lookupVal?.officeId || typeof lookupVal.officeId !== 'string') {
          throw new BadRequestException('Davet kodu geçersiz veya süresi dolmuş.');
        }
        officeId = lookupVal.officeId;
      }

      await officeLock(tx, \`office-user:\${userId}\`);
      await officeLock(tx, \`office-policy:\${officeId}\`);
      const user = await tx.user.findUnique({ where: { id: userId } });
      const office = await tx.office.findUnique({ where: { id: officeId } });
      const lookup = await tx.systemSetting.findUnique({ where: { key: \`EPH_OFFICE_CODE_\${codeHash}\` } });
      const lookupValue = lookup?.valueJson as Prisma.JsonObject | undefined;
      if (lookupValue?.recipientUserId && lookupValue.recipientUserId !== userId) throw new ForbiddenException('Bu davet başka bir emlakçıya ait.');
      const inviteKey = lookupValue?.recipientUserId ? \`EPH_OFFICE_INVITE_\${officeId}_\${userId}\` : \`EPH_OFFICE_INVITE_\${officeId}\`;
      const invite = await tx.systemSetting.findUnique({ where: { key: inviteKey } });
      const value = invite?.valueJson as any;
      if (user?.role !== Role.EMLAKCI || user.officeId || await tx.office.count({ where: { ownerUserId: userId, isActive: true } })) throw new BadRequestException('Mevcut ofis bağlantısı bulunan veya danışman olmayan hesap başvuramaz.');
      if (!office?.isActive || !office.ownerUserId || value?.hash !== codeHash || typeof value.expiresAt !== 'string' || !Number.isFinite(Date.parse(value.expiresAt)) || Date.parse(value.expiresAt) <= Date.now()) throw new BadRequestException('Davet kodu geçersiz veya süresi dolmuş.');
      const key = requestKey(officeId, userId);
      const data = { officeId, userId, status: 'PENDING', requestedAt: new Date().toISOString() };
      await tx.systemSetting.upsert({ where: { key }, create: { key, valueJson: data }, update: { valueJson: data } });
      await this.notifications?.notify(office.ownerUserId, { type: 'OFFICE_JOIN_REQUEST', priority: 'ACIL',
        title: 'Yeni ofis başvurusu', body: 'Ofisinize katılım başvurusu geldi.', actionUrl: '/office',
        eventKey: \`office-request:\${key}:\${data.requestedAt}\` }, tx);
      return { ok: true, message: \`\${office.name} ofis sahibinin onayı bekleniyor.\` };
    });
  }`;

const newRequestJoin = `  async requestJoin(userId: string, rawCode: unknown) {
    if (typeof rawCode !== 'string' || rawCode.trim().length === 0 || rawCode.length > 200) {
      throw new BadRequestException('Geçerli bir Ofis ID numarası veya davet kodu girin.');
    }
    const sanitized = rawCode.trim().toUpperCase();
    return this.prisma.$transaction(async tx => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new NotFoundException('Kullanıcı bulunamadı.');

      if (user.role === Role.MUTEAHHIT || user.role === Role.INSAAT_FIRMASI) {
        throw new BadRequestException('Müteahhit veya inşaat firmaları emlak ofisine dahil olamaz.');
      }
      if (user.role !== Role.EMLAKCI && user.role !== Role.ADAY) {
        throw new BadRequestException('Yalnızca emlak danışmanları ofise katılma talebinde bulunabilir.');
      }
      if (user.officeId) {
        throw new BadRequestException('Zaten bir ofise bağlısınız.');
      }
      if (await tx.office.count({ where: { ownerUserId: userId, isActive: true } })) {
        throw new BadRequestException('Ofis sahipleri başka bir ofise katılamaz.');
      }

      let officeId: string | null = null;

      // 1. Doğrudan Ofis Kodu (OFS-...) veya Ofis ID kontrolü
      const directOffice = await tx.office.findFirst({
        where: {
          OR: [
            { code: sanitized },
            { code: sanitized.replace('OFS-', '') },
            { id: rawCode.trim() },
          ],
          isActive: true,
        },
      });

      if (directOffice) {
        officeId = directOffice.id;
      } else {
        // 2. Davet kodu formatı kontrolü
        let codeHash: string;
        if (sanitized.includes('.')) {
          const [targetOfficeId, codePart, extra] = rawCode.trim().split('.');
          if (!targetOfficeId || !/^[A-F0-9]{12,36}$/i.test(codePart || '') || extra) {
            throw new BadRequestException('Ofis ID numarası veya davet kodu bulunamadı.');
          }
          officeId = targetOfficeId;
          codeHash = digest(codePart.toUpperCase());
        } else {
          const cleanCode = sanitized.replace(/[\\s-]/g, '');
          if (/^[A-F0-9]{12}$/.test(cleanCode)) {
            codeHash = digest(cleanCode);
            const lookup = await tx.systemSetting.findUnique({ where: { key: \`EPH_OFFICE_CODE_\${codeHash}\` } });
            const lookupVal = lookup?.valueJson as any;
            if (lookupVal?.officeId && typeof lookupVal.officeId === 'string') {
              officeId = lookupVal.officeId;
            }
          }
        }
      }

      if (!officeId) {
        throw new BadRequestException('Girilen Ofis ID numarası veya davet kodu geçerli bir ofisle eşleşmedi.');
      }

      await officeLock(tx, \`office-user:\${userId}\`);
      await officeLock(tx, \`office-policy:\${officeId}\`);

      const office = await tx.office.findUnique({ where: { id: officeId } });
      if (!office || !office.isActive || !office.ownerUserId) {
        throw new BadRequestException('Ofis bulunamadı veya aktif değil.');
      }

      const key = requestKey(officeId, userId);
      const data = { officeId, userId, status: 'PENDING', requestedAt: new Date().toISOString() };
      await tx.systemSetting.upsert({ where: { key }, create: { key, valueJson: data }, update: { valueJson: data } });

      const applicantName = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Bir danışman';
      await this.notifications?.notify(office.ownerUserId, {
        type: 'OFFICE_JOIN_REQUEST',
        priority: 'ACIL',
        title: 'Yeni ofis başvurusu',
        body: \`\${applicantName} (\${user.phone || ''}) ofisinize katılmak için talepte bulundu.\`,
        actionUrl: '/office',
        eventKey: \`office-request:\${key}:\${data.requestedAt}\`,
      }, tx);

      return {
        ok: true,
        message: \`\${office.name} (Ofis ID: \${office.code || office.id}) ofis sahibine katılım talebiniz iletildi. Onay bekleniyor.\`,
      };
    });
  }`;

if (content.includes('async requestJoin(userId: string, rawCode: unknown)')) {
  // Let's replace requestJoin
  const startIndex = content.indexOf('  async requestJoin(userId: string, rawCode: unknown) {');
  const endIndex = content.indexOf('  async decide(userId: string, officeId: string, applicantId: string, approve: unknown) {');
  if (startIndex !== -1 && endIndex !== -1) {
    content = content.substring(0, startIndex) + newRequestJoin + '\n\n' + content.substring(endIndex);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Successfully updated requestJoin in office-management.service.ts');
  } else {
    console.error('Could not find start or end index for requestJoin replacement');
  }
}

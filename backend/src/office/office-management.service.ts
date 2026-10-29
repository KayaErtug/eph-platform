import { promises as fs } from 'fs';
import { resolveMaxTeams } from './office-team-quota';
import * as path from 'path';
import { officeLogoExtension, officeProfile, officeProfileInput, officeProfileKey } from './office-profile';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { PushService } from '../push/push.service';
import { Capability, KontorHareketTuru, KontorIslemTuru, Prisma, Role } from '@prisma/client';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { OfficeDb, officeLock, officeMembershipEnforced, officePolicyKey, spendingMode } from './office-wallet.rules';

const digest = (s: string) => createHash('sha256').update(s).digest('hex');
const requestKey = (officeId: string, userId: string) => `EPH_OFFICE_JOIN_${officeId}_${userId}`;
const MAX_PK = 2147483647;
function officeTasksKey(officeId: string) { return `office-tasks:${officeId}`; }
function officeActivitiesKey(officeId: string) { return `office-activities:${officeId}`; }
function officeMatchLogsKey(officeId: string) { return `office-match-logs:${officeId}`; }


@Injectable()
export class OfficeManagementService {
  constructor(private readonly prisma: PrismaService, @Optional() private readonly pushService?: PushService) {}

  async rolloutStatus() {
    const users = await this.prisma.user.findMany({ where: { role: Role.EMLAKCI, isApproved: true, isVerified: true, OR: [{ professionalVerificationStatus: null }, { professionalVerificationStatus: 'VERIFIED' }], office: { isNot: { isActive: true } }, ownedOffices: { none: { isActive: true } } }, select: { id: true, firstName: true, lastName: true } });
    const offices = await this.prisma.office.findMany({ where: { isActive: true }, select: { id: true, name: true } });
    const unconfiguredOffices: typeof offices = [];
    for (const office of offices) {
      const row = await this.prisma.systemSetting.findUnique({ where: { key: officePolicyKey(office.id) } });
      const value = row?.valueJson as Prisma.JsonObject | undefined;
      if (value?.mode !== 'SHARED' && value?.mode !== 'ALLOCATED') unconfiguredOffices.push(office);
    }
    return { enforced: await officeMembershipEnforced(this.prisma), unlinkedCount: users.length, unlinkedAgents: users, unconfiguredOffices, unconfiguredCount: unconfiguredOffices.length };
  }
  async activate(userId: string, enabled: unknown) {
    if (typeof enabled !== 'boolean') throw new BadRequestException('Geçerli etkinlik seçimi gerekli.');
    return this.prisma.$transaction(async tx => {
      await officeLock(tx, 'office-rollout');
      const actor = await tx.user.findUnique({ where: { id: userId }, select: { role: true } });
      if (actor?.role !== Role.SUPER_ADMIN) throw new ForbiddenException('Yalnız Yazılım Ekibi bu kuralı devreye alabilir.');
      const count = await tx.user.count({ where: { role: Role.EMLAKCI, isApproved: true, isVerified: true, OR: [{ professionalVerificationStatus: null }, { professionalVerificationStatus: 'VERIFIED' }], office: { isNot: { isActive: true } }, ownedOffices: { none: { isActive: true } } } });
      if (enabled && count > 0) throw new BadRequestException(`${count} aktif danışmanın ofis bağlantısı eksik. Önce bağlantıları tamamlayın.`);
      if (enabled) {
        const offices = await tx.office.findMany({ where: { isActive: true }, select: { id: true } });
        for (const office of offices) {
          const row = await tx.systemSetting.findUnique({ where: { key: officePolicyKey(office.id) } });
          const value = row?.valueJson as Prisma.JsonObject | undefined;
          if (value?.mode !== 'SHARED' && value?.mode !== 'ALLOCATED') throw new BadRequestException('Önce tüm aktif ofislerde PK kullanım tercihini ofis sahibi onaylamalı.');
        }
      }
      const key = 'EPH_OFFICE_MEMBERSHIP_ENFORCED';
      await tx.systemSetting.upsert({ where: { key }, create: { key, valueJson: enabled }, update: { valueJson: enabled } });
      await tx.adminActionLog.create({ data: { actorId: userId, action: 'OFFICE_MEMBERSHIP_ROLLOUT', entityType: 'SYSTEM_SETTING', entityId: key, description: enabled ? 'Ofise bağlı danışman zorunluluğu devreye alındı.' : 'Ofis geçiş dönemi açıldı.', metadata: { enabled } } });
      return { ok: true, enforced: enabled };
    });
  }

  private async owned(db: OfficeDb, userId: string, officeId: string) {
    await db.$queryRaw`SELECT "id" FROM "Office" WHERE "id" = ${officeId} FOR UPDATE`;
    const user = await db.user.findUnique({ where: { id: userId }, include: { capabilities: true } });
    const hasOwnerCap = user?.capabilities.some(c => c.capability === Capability.OFFICE_OWNER) || user?.role === Role.ADMIN || user?.role === Role.SUPER_ADMIN;
    const office = await db.office.findUnique({ where: { id: officeId } });
    if (!office?.isActive || office.ownerUserId !== userId || !hasOwnerCap) throw new ForbiddenException('Bu işlem yalnız aktif ofisin sahibine açıktır.');
    return office;
  }

  async create(userId: string, name: unknown) {
    const cleanName = typeof name === 'string' ? name.trim().replace(/\s+/g, ' ') : '';
    if (cleanName.length < 2 || cleanName.length > 120) throw new BadRequestException('Ofis adı 2–120 karakter olmalıdır.');
    return this.prisma.$transaction(async tx => {
      await officeLock(tx, `office-user:${userId}`);
      const user = await tx.user.findUnique({ where: { id: userId }, include: { capabilities: true } });
      if (user?.role !== Role.EMLAKCI || !user.capabilities.some(c => c.capability === Capability.OFFICE_OWNER)) throw new ForbiddenException('Ofis açabilmek için doğrulanmış emlak ofisi hesabınız olmalıdır.');
      if (user.officeId || await tx.office.findFirst({ where: { ownerUserId: userId, isActive: true } })) throw new BadRequestException('Mevcut ofis bağlantınızı kullanın.');
      const office = await tx.office.create({ data: { name: cleanName, slug: `ofis-${randomUUID()}`, ownerUserId: userId, city: user.city, district: user.district, isActive: true } });
      await tx.user.update({ where: { id: userId }, data: { officeId: office.id } });
      await tx.systemSetting.create({ data: { key: officePolicyKey(office.id), valueJson: { mode: 'ALLOCATED', updatedBy: userId, updatedAt: new Date().toISOString() } } });
      await tx.adminActionLog.create({ data: { actorId: userId, action: 'OFFICE_SELF_CREATED', entityType: 'OFFICE', entityId: office.id, description: 'Doğrulanmış ofis sahibi kendi ofisini oluşturdu.' } });
      return { ok: true, officeId: office.id };
    });
  }

  async dashboard(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { capabilities: true } });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı.');
    const hasOwnerCap = user.capabilities.some(c => c.capability === Capability.OFFICE_OWNER) || user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN;
    const offices = await this.prisma.office.findMany({ where: { isActive: true, OR: [...(hasOwnerCap ? [{ ownerUserId: userId }] : []), { id: user.officeId || '' }].filter(Boolean) }, include: { owner: { select: { firstName: true, lastName: true } } }, orderBy: { name: 'asc' } });
    const data = await Promise.all(offices.map(async office => {
      const isOwner = office.ownerUserId === userId && hasOwnerCap;
      const mode = await spendingMode(this.prisma, office.id);
      const walletId = isOwner || mode === 'SHARED' ? office.ownerUserId : userId;
      const wallet = walletId ? await this.prisma.kontorCuzdani.findUnique({ where: { kullaniciId: walletId } }) : null;
      const members = isOwner ? await this.prisma.user.findMany({ where: { officeId: office.id, role: Role.EMLAKCI }, select: { id: true, firstName: true, lastName: true, isApproved: true, isVerified: true }, orderBy: { firstName: 'asc' } }) : [];
      const pending = isOwner ? await this.prisma.systemSetting.findMany({ where: { key: { startsWith: `EPH_OFFICE_JOIN_${office.id}_` }, valueJson: { path: ['status'], equals: 'PENDING' } } }) : [];
      const ids = pending.map(r => (r.valueJson as Prisma.JsonObject)?.userId).filter((id): id is string => typeof id === 'string');
      const applicants = ids.length ? await this.prisma.user.findMany({ where: { id: { in: ids }, officeId: null, role: Role.EMLAKCI }, select: { id: true, firstName: true, lastName: true } }) : [];
      const policy = await this.prisma.systemSetting.findUnique({ where: { key: officePolicyKey(office.id) } });
      const profile = await this.prisma.systemSetting.findUnique({ where: { key: officeProfileKey(office.id) } });
      return { id: office.id, name: office.name, ownerName: [office.owner?.firstName, office.owner?.lastName].filter(Boolean).join(' '), city: office.city || '', district: office.district || '', neighborhood: office.neighborhood || '', ...officeProfile(profile?.valueJson), isOwner, mode, modeConfigured: Boolean(policy), balance: wallet?.bakiye ?? 0, walletActive: wallet?.aktifMi === true, memberCount: await this.prisma.user.count({ where: { officeId: office.id, role: Role.EMLAKCI, id: { not: office.ownerUserId || '' } } }), members, applicants };
    }));
    return { actorId: userId, requiresOffice: user.role === Role.EMLAKCI && !data.length,
      canCreate: user.role === Role.EMLAKCI && user.capabilities.some(c => c.capability === Capability.OFFICE_OWNER) && !data.length,
      offices: data };
  }

  async updateProfile(userId: string, officeId: string, raw: unknown) {
    const data = officeProfileInput(raw);
    return this.prisma.$transaction(async tx => {
      await officeLock(tx, `office-policy:${officeId}`);
      await this.owned(tx, userId, officeId);
      const key = officeProfileKey(officeId);
      const previous = await tx.systemSetting.findUnique({ where: { key } });
      const value = { ...officeProfile(previous?.valueJson), address: data.address, phone: data.phone };
      await tx.office.update({ where: { id: officeId }, data: { name: data.name, city: data.city || null, district: data.district || null, neighborhood: data.neighborhood || null } });
      await tx.systemSetting.upsert({ where: { key }, create: { key, valueJson: value }, update: { valueJson: value } });
      await tx.adminActionLog.create({ data: { actorId: userId, action: 'OFFICE_PROFILE_UPDATED', entityType: 'OFFICE', entityId: officeId, description: 'Ofis sahibi kurumsal iletişim bilgilerini güncelledi.' } });
      return { ok: true };
    });
  }

  async uploadLogo(userId: string, officeId: string, file: Express.Multer.File) {
    const ext = officeLogoExtension(file);
    const filename = `office_${randomUUID()}.${ext}`;
    const directory = path.resolve(process.cwd(), 'public', 'profile-images');
    const destination = path.join(directory, filename);
    let written = false;
    try {
      return await this.prisma.$transaction(async tx => {
        await officeLock(tx, `office-policy:${officeId}`);
        await this.owned(tx, userId, officeId);
        const key = officeProfileKey(officeId);
        const previous = await tx.systemSetting.findUnique({ where: { key } });
        const value = { ...officeProfile(previous?.valueJson), logoUrl: `/api/profile/avatar-file/${filename}` };
        await fs.mkdir(directory, { recursive: true });
        await fs.writeFile(destination, file.buffer, { flag: 'wx' });
        written = true;
        await tx.systemSetting.upsert({ where: { key }, create: { key, valueJson: value }, update: { valueJson: value } });
        await tx.adminActionLog.create({ data: { actorId: userId, action: 'OFFICE_LOGO_UPDATED', entityType: 'OFFICE', entityId: officeId, description: 'Ofis sahibi ofis logosunu güncelledi.' } });
        return { ok: true };
      });
    } catch (error) {
      if (written) await fs.unlink(destination).catch(() => undefined);
      throw error;
    }
  }

  async removeLogo(userId: string, officeId: string) {
    return this.prisma.$transaction(async tx => {
      await officeLock(tx, `office-policy:${officeId}`);
      await this.owned(tx, userId, officeId);
      const key = officeProfileKey(officeId);
      const previous = await tx.systemSetting.findUnique({ where: { key } });
      const value = { ...officeProfile(previous?.valueJson), logoUrl: null };
      await tx.systemSetting.upsert({ where: { key }, create: { key, valueJson: value }, update: { valueJson: value } });
      await tx.adminActionLog.create({ data: { actorId: userId, action: 'OFFICE_LOGO_REMOVED', entityType: 'OFFICE', entityId: officeId, description: 'Ofis sahibi kartından logoyu kaldırdı.' } });
      return { ok: true };
    });
  }

  async walletOptions(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true, officeId: true } });
    if (!user) throw new ForbiddenException('Oturum doğrulanamadı.');
    const offices = await this.prisma.office.findMany({ where: { isActive: true, ...(user.role === Role.SUPER_ADMIN ? {} : { OR: [{ ownerUserId: userId }, { id: user.officeId || '' }] }) }, orderBy: { name: 'asc' } });
    const options: Array<{ walletSource: 'PERSONAL' | 'OFFICE'; walletOfficeId?: string; label: string }> = [];
    if (user.role !== Role.EMLAKCI) options.push({ walletSource: 'PERSONAL', label: 'PK bakiyem' });
    for (const office of offices) {
      const mode = await spendingMode(this.prisma, office.id);
      if (office.ownerUserId === userId || mode === 'SHARED') options.push({ walletSource: 'OFFICE', walletOfficeId: office.id, label: `${office.name} · Ortak PK` });
      else if (user.role === Role.EMLAKCI && !options.some(o => o.walletSource === 'PERSONAL')) options.push({ walletSource: 'PERSONAL', label: `${office.name} · Danışman PK bakiyem` });
    }
    return { actorId: userId, requiresOffice: user.role === Role.EMLAKCI && !offices.length, options };
  }

  async mode(userId: string, officeId: string, mode: unknown) {
    if (mode !== 'SHARED' && mode !== 'ALLOCATED') throw new BadRequestException('Dağıtım veya ortak kullanım seçin.');
    return this.prisma.$transaction(async tx => {
      await officeLock(tx, `office-policy:${officeId}`);
      await this.owned(tx, userId, officeId);
      const value = { mode, updatedAt: new Date().toISOString(), updatedBy: userId };
      await tx.systemSetting.upsert({ where: { key: officePolicyKey(officeId) }, create: { key: officePolicyKey(officeId), valueJson: value }, update: { valueJson: value } });
      await tx.adminActionLog.create({ data: { actorId: userId, action: 'OFFICE_SPENDING_MODE_CHANGED', entityType: 'OFFICE', entityId: officeId, description: mode === 'SHARED' ? 'Ofis üyelerine ortak PK kullanımı açıldı.' : 'Ofis dağıtım moduna alındı.', metadata: value } });
      return { ok: true, mode };
    });
  }

  async invite(userId: string, officeId: string) {
    return this.prisma.$transaction(async tx => {
      await officeLock(tx, `office-policy:${officeId}`);
      await this.owned(tx, userId, officeId);
      const code = randomBytes(6).toString('hex').toUpperCase();
      const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();
      const codeHash = digest(code);
      const value = { hash: codeHash, expiresAt };
      const key = `EPH_OFFICE_INVITE_${officeId}`;
      await tx.systemSetting.upsert({ where: { key }, create: { key, valueJson: value }, update: { valueJson: value } });
      const lookupKey = `EPH_OFFICE_CODE_${codeHash}`;
      const lookupValue = { officeId, expiresAt };
      await tx.systemSetting.upsert({ where: { key: lookupKey }, create: { key: lookupKey, valueJson: lookupValue }, update: { valueJson: lookupValue } });
      return { officeId, code, expiresAt };
    });
  }

  async requestJoin(userId: string, rawCode: unknown) {
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
        const lookup = await tx.systemSetting.findUnique({ where: { key: `EPH_OFFICE_CODE_${codeHash}` } });
        const lookupVal = lookup?.valueJson as any;
        if (!lookupVal?.officeId || typeof lookupVal.officeId !== 'string') {
          throw new BadRequestException('Davet kodu geçersiz veya süresi dolmuş.');
        }
        officeId = lookupVal.officeId;
      }

      await officeLock(tx, `office-user:${userId}`);
      await officeLock(tx, `office-policy:${officeId}`);
      const user = await tx.user.findUnique({ where: { id: userId } });
      const office = await tx.office.findUnique({ where: { id: officeId } });
      const invite = await tx.systemSetting.findUnique({ where: { key: `EPH_OFFICE_INVITE_${officeId}` } });
      const value = invite?.valueJson as any;
      if (user?.role !== Role.EMLAKCI || user.officeId || await tx.office.count({ where: { ownerUserId: userId, isActive: true } })) throw new BadRequestException('Mevcut ofis bağlantısı bulunan veya danışman olmayan hesap başvuramaz.');
      if (!office?.isActive || !office.ownerUserId || value?.hash !== codeHash || typeof value.expiresAt !== 'string' || !Number.isFinite(Date.parse(value.expiresAt)) || Date.parse(value.expiresAt) <= Date.now()) throw new BadRequestException('Davet kodu geçersiz veya süresi dolmuş.');
      const key = requestKey(officeId, userId);
      const data = { officeId, userId, status: 'PENDING', requestedAt: new Date().toISOString() };
      await tx.systemSetting.upsert({ where: { key }, create: { key, valueJson: data }, update: { valueJson: data } });
      return { ok: true, message: `${office.name} ofis sahibinin onayı bekleniyor.` };
    });
  }

  async decide(userId: string, officeId: string, applicantId: string, approve: unknown) {
    if (typeof approve !== 'boolean' || typeof applicantId !== 'string' || !applicantId || applicantId.length > 128) throw new BadRequestException('Başvuru ve karar geçersiz.');
    return this.prisma.$transaction(async tx => {
      await officeLock(tx, `office-user:${applicantId}`);
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${applicantId} FOR UPDATE`;
      await officeLock(tx, `office-policy:${officeId}`);
      await this.owned(tx, userId, officeId);
      const key = requestKey(officeId, applicantId);
      const row = await tx.systemSetting.findUnique({ where: { key } });
      const value = row?.valueJson as Prisma.JsonObject | undefined;
      if (value?.status !== 'PENDING') throw new BadRequestException('Bekleyen başvuru bulunamadı.');
      if (approve) {
        const applicant = await tx.user.findUnique({ where: { id: applicantId } });
        if (applicant?.role !== Role.EMLAKCI || applicant.officeId || await tx.office.count({ where: { ownerUserId: applicantId, isActive: true } })) throw new BadRequestException('Danışmanın ofis bağlantısı değişmiş.');
        const subscription = await tx.systemSetting.findUnique({ where: { key: `OFFICE_SUBSCRIPTION_${officeId}` } });
        const sub = subscription?.valueJson as Prisma.JsonObject | undefined;
        const config = await tx.systemSetting.findUnique({ where: { key: 'OFFICE_MEMBERSHIP_PACKAGES' } });
        const current = Array.isArray(config?.valueJson) ? (config.valueJson as Prisma.JsonObject[]).find(p => p.code === sub?.packageCode) : undefined;
        const capacity = current?.agents ?? sub?.agents;
        const limit = typeof capacity === 'number' && Number.isSafeInteger(capacity) && capacity >= 0 ? capacity : 5;
        const count = await tx.user.count({ where: { officeId, role: Role.EMLAKCI, NOT: { id: userId } } });
        if (count >= limit) throw new BadRequestException('Ofisin danışman kapasitesi dolu.');
        await tx.user.update({ where: { id: applicantId }, data: { officeId } });
      }
      await tx.systemSetting.update({ where: { key }, data: { valueJson: { ...value, status: approve ? 'APPROVED' : 'REJECTED', decidedBy: userId, decidedAt: new Date().toISOString() } } });
      await tx.adminActionLog.create({ data: { actorId: userId, targetUserId: applicantId, action: 'OFFICE_JOIN_DECIDED', entityType: 'OFFICE', entityId: officeId, description: approve ? 'Danışman ofise kabul edildi; mesleki doğrulama durumu değiştirilmedi.' : 'Ofis başvurusu reddedildi.' } });
      return { ok: true };
    });
  }

  async transfer(userId: string, officeId: string, input: { memberId?: string; amount?: number; requestId?: string }) {
    const { memberId, amount, requestId } = input;
    if (typeof memberId !== 'string' || !memberId || memberId.length > 128 || typeof requestId !== 'string' || memberId === userId || !Number.isSafeInteger(amount) || amount! <= 0 || amount! > MAX_PK || !/^[A-Za-z0-9_-]{16,100}$/.test(requestId || '')) throw new BadRequestException('Danışman, PK miktarı veya işlem anahtarı geçersiz.');
    return this.prisma.$transaction(async tx => {
      const ids = [userId, memberId].sort();
      for (const id of ids) {
        await officeLock(tx, `office-user:${id}`);
        await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${id} FOR UPDATE`;
      }
      await officeLock(tx, `office-policy:${officeId}`);
      await this.owned(tx, userId, officeId);
      const key = `EPH_OFFICE_TRANSFER_${userId}_${requestId}`;
      const fingerprint = digest(JSON.stringify([officeId, memberId, amount]));
      const previous = await tx.systemSetting.findUnique({ where: { key } });
      if (previous) {
        const value = previous.valueJson as Prisma.JsonObject;
        if (value.fingerprint !== fingerprint) throw new BadRequestException('Bu işlem anahtarı farklı bir PK dağıtımında kullanılmış.');
        return { ok: true, replayed: true, amount, memberId };
      }
      if (await spendingMode(tx, officeId) !== 'ALLOCATED') throw new BadRequestException('PK dağıtmak için önce dağıtım modunu seçin.');
      const member = await tx.user.findUnique({ where: { id: memberId } });
      if (member?.officeId !== officeId || member.role !== Role.EMLAKCI || !member.isApproved || !member.isVerified) throw new ForbiddenException('Aktif ve doğrulanmış ofis danışmanı seçin.');
      for (const id of ids) {
        await officeLock(tx, `wallet:${id}`);
        await tx.kontorCuzdani.upsert({ where: { kullaniciId: id }, create: { kullaniciId: id }, update: {} });
        await tx.$queryRaw`SELECT "id" FROM "KontorCuzdani" WHERE "kullaniciId" = ${id} FOR UPDATE`;
      }
      const source = await tx.kontorCuzdani.findUniqueOrThrow({ where: { kullaniciId: userId } });
      const target = await tx.kontorCuzdani.findUniqueOrThrow({ where: { kullaniciId: memberId } });
      if (!source.aktifMi || !target.aktifMi || source.bakiye < amount! || target.bakiye > MAX_PK - amount!) throw new BadRequestException('PK bakiyesi yetersiz veya cüzdan kullanıma kapalı.');
      await tx.kontorCuzdani.update({ where: { kullaniciId: userId }, data: { bakiye: { decrement: amount } } });
      await tx.kontorCuzdani.update({ where: { kullaniciId: memberId }, data: { bakiye: { increment: amount } } });
      // A transfer does not manufacture credit, count as a purchase, or consume service PK.
      for (const [id, before, after, direction] of [[userId, source.bakiye, source.bakiye - amount!, 'Çıkış'], [memberId, target.bakiye, target.bakiye + amount!, 'Giriş']] as const) {
        await tx.kontorHareketi.create({ data: { kullaniciId: id, hareketTuru: KontorHareketTuru.DUZELTME, islemTuru: KontorIslemTuru.DIGER, miktar: amount!, oncekiBakiye: before, sonrakiBakiye: after, aciklama: `Ofis PK dağıtımı · ${direction}`, ilgiliKayitTuru: 'OFFICE_PK_TRANSFER', ilgiliKayitId: requestId, olusturanId: userId } });
      }
      await tx.systemSetting.create({ data: { key, valueJson: { fingerprint, officeId, memberId, amount: amount!, actorId: userId, createdAt: new Date().toISOString() } } });
      return { ok: true, replayed: false, amount, memberId };
    }, { timeout: 15000 });
  }

  async createTeam(userId: string, officeId: string, name: unknown, leaderId?: string | null) {
    const trimmedName = typeof name === 'string' ? name.trim() : '';
    if (!trimmedName) throw new BadRequestException('Takım adı zorunludur.');
    return this.prisma.$transaction(async tx => {
      await officeLock(tx, `office-policy:${officeId}`);
      await this.owned(tx, userId, officeId);
      const activeTeamsCount = await tx.team.count({ where: { officeId, isActive: true } });
      const subscription = await tx.systemSetting.findUnique({ where: { key: `OFFICE_SUBSCRIPTION_${officeId}` } });
      const sub = subscription?.valueJson as any;
      const config = await tx.systemSetting.findUnique({ where: { key: 'OFFICE_MEMBERSHIP_PACKAGES' } });
      const currentPkg = Array.isArray(config?.valueJson) ? (config.valueJson as any[]).find(p => p.code === sub?.packageCode) : undefined;
      const agentCap = Number(currentPkg?.agents ?? sub?.agents ?? 3);
      const maxTeams = resolveMaxTeams(currentPkg, agentCap);
      if (activeTeamsCount >= maxTeams) {
        throw new BadRequestException(`Mevcut ofis paketinizde en fazla ${maxTeams} takım oluşturabilirsiniz.`);
      }
      if (leaderId) {
        const leader = await tx.user.findUnique({ where: { id: leaderId } });
        if (!leader || leader.officeId !== officeId) throw new BadRequestException('Seçilen lider bu ofise ait değil.');
      }
      const team = await tx.team.create({
        data: { officeId, name: trimmedName, leaderId: leaderId || null, isActive: true },
      });
      if (leaderId) {
        await tx.userCapability.upsert({
          where: { userId_capability: { userId: leaderId, capability: Capability.TEAM_LEADER } },
          create: { userId: leaderId, capability: Capability.TEAM_LEADER, createdById: userId },
          update: { createdById: userId },
        });
        await tx.teamMember.upsert({
          where: { teamId_userId: { teamId: team.id, userId: leaderId } },
          create: { teamId: team.id, userId: leaderId, isActive: true },
          update: { isActive: true, leftAt: null },
        });
      }
      return { ok: true, team };
    });
  }

  async updateTeam(userId: string, officeId: string, teamId: string, body: { name?: string; leaderId?: string | null }) {
    return this.prisma.$transaction(async tx => {
      await officeLock(tx, `office-policy:${officeId}`);
      await this.owned(tx, userId, officeId);
      const team = await tx.team.findUnique({ where: { id: teamId } });
      if (!team || team.officeId !== officeId) throw new NotFoundException('Takım bulunamadı.');
      const data: any = {};
      if (body.name !== undefined) {
        const n = String(body.name || '').trim();
        if (!n) throw new BadRequestException('Takım adı boş olamaz.');
        data.name = n;
      }
      if (body.leaderId !== undefined) {
        const lid = body.leaderId || null;
        if (lid) {
          const leader = await tx.user.findUnique({ where: { id: lid } });
          if (!leader || leader.officeId !== officeId) throw new BadRequestException('Seçilen lider bu ofise ait değil.');
          await tx.userCapability.upsert({
            where: { userId_capability: { userId: lid, capability: Capability.TEAM_LEADER } },
            create: { userId: lid, capability: Capability.TEAM_LEADER, createdById: userId },
            update: { createdById: userId },
          });
          await tx.teamMember.upsert({
            where: { teamId_userId: { teamId: team.id, userId: lid } },
            create: { teamId: team.id, userId: lid, isActive: true },
            update: { isActive: true, leftAt: null },
          });
        }
        data.leaderId = lid;
      }
      const updated = await tx.team.update({ where: { id: teamId }, data });
      return { ok: true, team: updated };
    });
  }

  async deleteTeam(userId: string, officeId: string, teamId: string) {
    return this.prisma.$transaction(async tx => {
      await officeLock(tx, `office-policy:${officeId}`);
      await this.owned(tx, userId, officeId);
      const team = await tx.team.findUnique({ where: { id: teamId } });
      if (!team || team.officeId !== officeId) throw new NotFoundException('Takım bulunamadı.');
      await tx.teamMember.updateMany({ where: { teamId }, data: { isActive: false, leftAt: new Date() } });
      await tx.team.update({ where: { id: teamId }, data: { isActive: false } });
      return { ok: true };
    });
  }

  async addTeamMember(userId: string, officeId: string, teamId: string, memberUserId: string) {
    if (!memberUserId) throw new BadRequestException('Kullanıcı seçilmedi.');
    return this.prisma.$transaction(async tx => {
      await officeLock(tx, `office-policy:${officeId}`);
      await this.owned(tx, userId, officeId);
      const team = await tx.team.findUnique({ where: { id: teamId } });
      if (!team || team.officeId !== officeId || !team.isActive) throw new NotFoundException('Aktif takım bulunamadı.');
      const member = await tx.user.findUnique({ where: { id: memberUserId } });
      if (!member || member.officeId !== officeId) throw new BadRequestException('Danışman bu ofise ait değil.');
      // Task 18: Çoklu takım üyeliği
      await tx.teamMember.upsert({
        where: { teamId_userId: { teamId, userId: memberUserId } },
        create: { teamId, userId: memberUserId, isActive: true },
        update: { isActive: true, leftAt: null },
      });
      return { ok: true };
    });
  }

  async removeTeamMember(userId: string, officeId: string, teamId: string, memberUserId: string) {
    return this.prisma.$transaction(async tx => {
      await officeLock(tx, `office-policy:${officeId}`);
      await this.owned(tx, userId, officeId);
      const team = await tx.team.findUnique({ where: { id: teamId } });
      if (!team || team.officeId !== officeId) throw new NotFoundException('Takım bulunamadı.');
      await tx.teamMember.updateMany({
        where: { teamId, userId: memberUserId },
        data: { isActive: false, leftAt: new Date() },
      });
      if (team.leaderId === memberUserId) {
        await tx.team.update({ where: { id: teamId }, data: { leaderId: null } });
        const otherLed = await tx.team.findFirst({ where: { leaderId: memberUserId, isActive: true, id: { not: teamId } } });
        if (!otherLed) {
          await tx.userCapability.deleteMany({ where: { userId: memberUserId, capability: Capability.TEAM_LEADER } });
        }
      }
      return { ok: true };
    });
  }

  async updatePermissions(userId: string, officeId: string, input: {
    scanPermissions?: Record<string, boolean>;
    autoSpendPermissions?: Record<string, boolean>;
    allowedSharedPoolUserIds?: string[];
    allowedSharedPoolTeamIds?: string[];
  }) {
    return this.prisma.$transaction(async tx => {
      await officeLock(tx, `office-policy:${officeId}`);
      await this.owned(tx, userId, officeId);
      const key = officePolicyKey(officeId);
      const existing = await tx.systemSetting.findUnique({ where: { key } });
      const current = (existing?.valueJson as any) || { mode: 'ALLOCATED' };
      const updated = {
        ...current,
        scanPermissions: { ...(current.scanPermissions || {}), ...(input.scanPermissions || {}) },
        autoSpendPermissions: { ...(current.autoSpendPermissions || {}), ...(input.autoSpendPermissions || {}) },
        ...(input.allowedSharedPoolUserIds !== undefined ? { allowedSharedPoolUserIds: input.allowedSharedPoolUserIds } : {}),
        ...(input.allowedSharedPoolTeamIds !== undefined ? { allowedSharedPoolTeamIds: input.allowedSharedPoolTeamIds } : {}),
        updatedAt: new Date().toISOString(),
        updatedBy: userId,
      };
      await tx.systemSetting.upsert({
        where: { key },
        create: { key, valueJson: updated },
        update: { valueJson: updated },
      });
      return { ok: true, permissions: updated };
    });
  }

  // Task 20: Takım ve Kişilere Görev Atama
  async getOfficeTasks(userId: string, officeId: string) {
    const office = await this.prisma.office.findUnique({ where: { id: officeId } });
    if (!office) throw new NotFoundException('Ofis bulunamadı.');
    const isOwner = office.ownerUserId === userId;
    const isMember = await this.prisma.user.findFirst({ where: { id: userId, officeId } });
    if (!isOwner && !isMember) throw new ForbiddenException('Bu ofisin görevlerine erişim yetkiniz yok.');

    const key = officeTasksKey(officeId);
    const setting = await this.prisma.systemSetting.findUnique({ where: { key } });
    const tasks: any[] = Array.isArray(setting?.valueJson) ? (setting.valueJson as any[]) : [];

    const visible = isOwner ? tasks : tasks.filter(t => t.assignedUserIds?.includes(userId) || t.createdById === userId);
    return { ok: true, tasks: visible };
  }

  async createOfficeTask(userId: string, officeId: string, input: {
    title: string;
    description?: string;
    dueDate?: string;
    teamIds?: string[];
    userIds?: string[];
  }) {
    return this.prisma.$transaction(async tx => {
      await officeLock(tx, `office-policy:${officeId}`);
      await this.owned(tx, userId, officeId);

      const title = input.title?.trim();
      if (!title) throw new BadRequestException('Görev başlığı zorunludur.');

      const teamUserIds = new Set<string>();
      if (Array.isArray(input.teamIds) && input.teamIds.length > 0) {
        const teamMembers = await tx.teamMember.findMany({
          where: { teamId: { in: input.teamIds }, isActive: true },
          select: { userId: true },
        });
        teamMembers.forEach(m => teamUserIds.add(m.userId));
      }

      if (Array.isArray(input.userIds)) {
        input.userIds.forEach(uid => {
          if (uid) teamUserIds.add(uid);
        });
      }

      const assignedUserIds = Array.from(teamUserIds);
      if (assignedUserIds.length === 0) {
        throw new BadRequestException('En az bir takım veya kişi seçmelisiniz.');
      }

      const assignedUsers = await tx.user.findMany({
        where: { id: { in: assignedUserIds } },
        select: { id: true, firstName: true, lastName: true },
      });

      const key = officeTasksKey(officeId);
      const setting = await tx.systemSetting.findUnique({ where: { key } });
      const tasks: any[] = Array.isArray(setting?.valueJson) ? (setting.valueJson as any[]) : [];

      const newTask = {
        id: randomUUID(),
        officeId,
        title,
        description: input.description?.trim() || '',
        dueDate: input.dueDate || null,
        status: 'BEKLIYOR',
        selectedTeamIds: input.teamIds || [],
        selectedUserIds: input.userIds || [],
        assignedUserIds,
        assignedUsers: assignedUsers.map(u => ({ id: u.id, fullName: `${u.firstName || ''} ${u.lastName || ''}`.trim() })),
        createdById: userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updatedTasks = [newTask, ...tasks];
      await tx.systemSetting.upsert({
        where: { key },
        create: { key, valueJson: updatedTasks },
        update: { valueJson: updatedTasks },
      });

      if (this.pushService) {
        assignedUserIds.forEach(recipientId => {
          if (recipientId !== userId) {
            void this.pushService.sendToUser(recipientId, {
              title: 'Yeni Ofis Görevi',
              body: `Ofisinizde size yeni bir görev atandı: ${title}`,
              url: '/office',
            });
          }
        });
      }

      return { ok: true, task: newTask };
    });
  }

  async updateOfficeTask(userId: string, officeId: string, taskId: string, input: {
    status?: string;
    title?: string;
    description?: string;
    dueDate?: string;
  }) {
    return this.prisma.$transaction(async tx => {
      await officeLock(tx, `office-policy:${officeId}`);
      const office = await tx.office.findUnique({ where: { id: officeId } });
      if (!office) throw new NotFoundException('Ofis bulunamadı.');
      const isOwner = office.ownerUserId === userId;

      const key = officeTasksKey(officeId);
      const setting = await tx.systemSetting.findUnique({ where: { key } });
      const tasks: any[] = Array.isArray(setting?.valueJson) ? (setting.valueJson as any[]) : [];

      const taskIndex = tasks.findIndex(t => t.id === taskId);
      if (taskIndex === -1) throw new NotFoundException('Görev bulunamadı.');
      const task = tasks[taskIndex];

      if (!isOwner && !task.assignedUserIds?.includes(userId)) {
        throw new ForbiddenException('Bu görevi güncelleme yetkiniz yok.');
      }

      const updated = {
        ...task,
        ...(input.status ? { status: input.status } : {}),
        ...(isOwner && input.title ? { title: input.title } : {}),
        ...(isOwner && input.description !== undefined ? { description: input.description } : {}),
        ...(isOwner && input.dueDate !== undefined ? { dueDate: input.dueDate } : {}),
        updatedAt: new Date().toISOString(),
        updatedById: userId,
      };
      tasks[taskIndex] = updated;

      await tx.systemSetting.upsert({
        where: { key },
        create: { key, valueJson: tasks },
        update: { valueJson: tasks },
      });

      if (this.pushService) {
        const notifyIds = new Set<string>([...(task.assignedUserIds || []), office.ownerUserId]);
        notifyIds.delete(userId);
        notifyIds.forEach(targetId => {
          if (targetId) {
            void this.pushService.sendToUser(targetId, {
              title: 'Görev Durumu Güncellendi',
              body: `"${task.title}" görevi "${updated.status}" durumuna getirildi.`,
              url: '/office',
            });
          }
        });
      }

      return { ok: true, task: updated };
    });
  }

  // Task 22: Danışman Performansı ve Aktivite Takibi
  async getConsultantActivities(userId: string, officeId: string, query?: {
    consultantId?: string;
    teamId?: string;
    activityType?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const office = await this.prisma.office.findUnique({ where: { id: officeId } });
    if (!office) throw new NotFoundException('Ofis bulunamadı.');
    const isOwner = office.ownerUserId === userId;
    if (!isOwner) {
      if (query?.consultantId && query.consultantId !== userId) {
        throw new ForbiddenException('Yalnızca kendi aktivitelerinizi görüntüleyebilirsiniz.');
      }
    }

    const key = officeActivitiesKey(officeId);
    const setting = await this.prisma.systemSetting.findUnique({ where: { key } });
    let activities: any[] = Array.isArray(setting?.valueJson) ? (setting.valueJson as any[]) : [];

    const targetConsultant = !isOwner ? userId : query?.consultantId;
    if (targetConsultant) {
      activities = activities.filter(a => a.userId === targetConsultant);
    }

    if (query?.teamId) {
      const teamMembers = await this.prisma.teamMember.findMany({
        where: { teamId: query.teamId, isActive: true },
        select: { userId: true },
      });
      const teamUserIds = new Set(teamMembers.map(m => m.userId));
      activities = activities.filter(a => teamUserIds.has(a.userId));
    }

    if (query?.activityType) {
      activities = activities.filter(a => a.activityType === query.activityType);
    }

    if (query?.startDate) {
      const start = new Date(query.startDate).getTime();
      activities = activities.filter(a => new Date(a.dateTime).getTime() >= start);
    }
    if (query?.endDate) {
      const end = new Date(query.endDate).getTime();
      activities = activities.filter(a => new Date(a.dateTime).getTime() <= end);
    }

    const distinctConsultants = new Set(activities.map(a => a.userId)).size;
    const activityCounts: Record<string, number> = {};
    for (const act of activities) {
      activityCounts[act.activityType] = (activityCounts[act.activityType] || 0) + 1;
    }

    return {
      ok: true,
      activities,
      totalCount: activities.length,
      distinctConsultants,
      activityCounts,
    };
  }

  async recordConsultantActivity(userId: string, officeId: string, input: {
    customerId?: string;
    customerName?: string;
    portfolioId?: string;
    portfolioTitle?: string;
    activityType: 'MUSTERI_ZIYARETI' | 'YER_GOSTERIMI' | 'TELEFON_GORUSMESI' | 'DIGER';
    dateTime?: string;
    outcome?: string;
    note?: string;
  }) {
    const office = await this.prisma.office.findUnique({ where: { id: officeId } });
    if (!office) throw new NotFoundException('Ofis bulunamadı.');

    const user = await this.prisma.user.findFirst({ where: { id: userId, officeId } });
    if (!user && office.ownerUserId !== userId) {
      throw new ForbiddenException('Bu ofise ait değilsiniz.');
    }

    if (!input.activityType) {
      throw new BadRequestException('Aktivite türü zorunludur.');
    }

    const key = officeActivitiesKey(officeId);
    const setting = await this.prisma.systemSetting.findUnique({ where: { key } });
    const activities: any[] = Array.isArray(setting?.valueJson) ? (setting.valueJson as any[]) : [];

    const newActivity = {
      id: randomUUID(),
      officeId,
      userId,
      userName: [user?.firstName || '', user?.lastName || ''].filter(Boolean).join(' ') || 'Danışman',
      customerId: input.customerId || null,
      customerName: input.customerName || null,
      portfolioId: input.portfolioId || null,
      portfolioTitle: input.portfolioTitle || null,
      activityType: input.activityType,
      dateTime: input.dateTime || new Date().toISOString(),
      outcome: input.outcome || 'TAKIPTE',
      note: input.note?.trim() || '',
      createdAt: new Date().toISOString(),
    };

    const updated = [newActivity, ...activities];
    await this.prisma.systemSetting.upsert({
      where: { key },
      create: { key, valueJson: updated },
      update: { valueJson: updated },
    });

    return { ok: true, activity: newActivity };
  }

  // Task 25: Tarama/Eşleştirme Logları
  async getOfficeMatchLogs(userId: string, officeId: string, query?: {
    consultantId?: string;
    status?: 'SUCCESS' | 'FAILED' | 'UNAUTHORIZED';
    startDate?: string;
    endDate?: string;
  }) {
    await this.owned(this.prisma as any, userId, officeId);

    const key = officeMatchLogsKey(officeId);
    const setting = await this.prisma.systemSetting.findUnique({ where: { key } });
    let logs: any[] = Array.isArray(setting?.valueJson) ? (setting.valueJson as any[]) : [];

    if (query?.consultantId) {
      logs = logs.filter(l => l.userId === query.consultantId);
    }
    if (query?.status) {
      logs = logs.filter(l => l.status === query.status);
    }
    if (query?.startDate) {
      const start = new Date(query.startDate).getTime();
      logs = logs.filter(l => new Date(l.createdAt).getTime() >= start);
    }
    if (query?.endDate) {
      const end = new Date(query.endDate).getTime();
      logs = logs.filter(l => new Date(l.createdAt).getTime() <= end);
    }

    return { ok: true, logs, total: logs.length };
  }

  async recordOfficeMatchLog(userId: string, officeId: string, input: {
    clientRequestId?: string;
    status: 'SUCCESS' | 'FAILED' | 'UNAUTHORIZED';
    entityType?: string;
    entityId?: string;
    entityTitle?: string;
    criteriaSummary?: string;
    resultCount?: number;
    kontorHareketiId?: string;
    spentPk?: number;
    errorMessage?: string;
  }) {
    const office = await this.prisma.office.findUnique({ where: { id: officeId } });
    if (!office) throw new NotFoundException('Ofis bulunamadı.');

    const user = await this.prisma.user.findFirst({ where: { id: userId, officeId } });
    if (!user && office.ownerUserId !== userId) {
      throw new ForbiddenException('Bu ofise ait değilsiniz.');
    }

    const key = officeMatchLogsKey(officeId);
    const setting = await this.prisma.systemSetting.findUnique({ where: { key } });
    const logs: any[] = Array.isArray(setting?.valueJson) ? (setting.valueJson as any[]) : [];

    // Ağ tekrarında mükerrer log oluşmasını engelle
    if (input.clientRequestId) {
      const existing = logs.find(l => l.clientRequestId === input.clientRequestId);
      if (existing) return { ok: true, log: existing, duplicate: true };
    }

    const newLog = {
      id: randomUUID(),
      officeId,
      userId,
      userName: [user?.firstName || '', user?.lastName || ''].filter(Boolean).join(' ') || 'Danışman',
      clientRequestId: input.clientRequestId || null,
      status: input.status,
      entityType: input.entityType || null,
      entityId: input.entityId || null,
      entityTitle: input.entityTitle || null,
      criteriaSummary: input.criteriaSummary || '',
      resultCount: input.resultCount !== undefined ? input.resultCount : 0,
      kontorHareketiId: input.kontorHareketiId || null,
      spentPk: input.spentPk !== undefined ? input.spentPk : 0,
      errorMessage: input.errorMessage || null,
      createdAt: new Date().toISOString(),
    };

    const updated = [newLog, ...logs];
    await this.prisma.systemSetting.upsert({
      where: { key },
      create: { key, valueJson: updated },
      update: { valueJson: updated },
    });

    return { ok: true, log: newLog };
  }

}

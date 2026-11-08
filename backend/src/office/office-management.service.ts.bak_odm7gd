import { promises as fs } from 'fs';
import { resolveMaxTeams } from './office-team-quota';
import * as path from 'path';
import { officeLogoExtension, officeProfile, officeProfileInput, officeProfileKey } from './office-profile';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { PushService } from '../push/push.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Capability, KontorHareketTuru, KontorIslemTuru, Prisma, Role } from '@prisma/client';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { consumeLots, grantLot, lockPaymentUser, lockWalletsOrdered } from '../kontor/wallet-lots';
import { entitlementSource, loadOfficeSettings, resolveOfficeEntitlements } from './office-entitlement.service';
import { OfficeDb, officeLock, officeMembershipEnforced, officePolicyKey, spendingMode } from './office-wallet.rules';

const digest = (s: string) => createHash('sha256').update(s).digest('hex');
const requestKey = (officeId: string, userId: string) => `EPH_OFFICE_JOIN_${officeId}_${userId}`;
const MAX_PK = 2147483647;
function officeTasksKey(officeId: string) { return `office-tasks:${officeId}`; }
function officeActivitiesKey(officeId: string) { return `office-activities:${officeId}`; }
function officeMatchLogsKey(officeId: string) { return `office-match-logs:${officeId}`; }


@Injectable()
export class OfficeManagementService {
  constructor(private readonly prisma: PrismaService, @Optional() private readonly pushService?: PushService,
    @Optional() private readonly notifications?: NotificationsService) {}

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

  private async isSuperAdmin(db: OfficeDb, userId: string) {
    return (await db.user.findUnique({ where: { id: userId }, select: { role: true } }))?.role === Role.SUPER_ADMIN;
  }

  private async owned(db: OfficeDb, userId: string, officeId: string) {
    await db.$queryRaw`SELECT "id" FROM "Office" WHERE "id" = ${officeId} FOR UPDATE`;
    const user = await db.user.findUnique({ where: { id: userId }, include: { capabilities: true } });
    const hasOwnerCap = user?.capabilities.some(c => c.capability === Capability.OFFICE_OWNER) || user?.role === Role.ADMIN || user?.role === Role.SUPER_ADMIN;
    const office = await db.office.findUnique({ where: { id: officeId } });
    if (!office || (user?.role !== Role.SUPER_ADMIN && (!office.isActive || office.ownerUserId !== userId || !hasOwnerCap))) throw new ForbiddenException('Bu işlem yalnız aktif ofisin sahibine açıktır.');
    return office;
  }

  async deleteOffice(userId: string, officeId: string) {
    return this.prisma.$transaction(async tx => {
      await officeLock(tx, `office-policy:${officeId}`);
      if (!(await this.isSuperAdmin(tx, userId))) throw new ForbiddenException('Ofisi yalnız süper admin silebilir.');
      const office = await this.owned(tx, userId, officeId);
      const teams = await tx.team.findMany({ where: { officeId }, select: { leaderId: true } });
      await tx.unit.updateMany({ where: { project: { OR: [{ owner: { officeId } }, ...(office.ownerUserId ? [{ ownerId: office.ownerUserId }] : [])] } }, data: { sharedWithSisters: false } });
      await tx.user.updateMany({ where: { officeId }, data: { officeId: null } });
      await tx.office.delete({ where: { id: officeId } });
      for (const leaderId of [...new Set(teams.map(team => team.leaderId).filter((id): id is string => Boolean(id)))]) {
        if (!(await tx.team.findFirst({ where: { leaderId, isActive: true } }))) await tx.userCapability.deleteMany({ where: { userId: leaderId, capability: Capability.TEAM_LEADER } });
      }
      await tx.systemSetting.deleteMany({ where: { OR: [
        { key: { in: [officePolicyKey(officeId), officeProfileKey(officeId), `OFFICE_SUBSCRIPTION_${officeId}`, officeTasksKey(officeId), officeActivitiesKey(officeId), officeMatchLogsKey(officeId)] } },
        { key: { startsWith: `EPH_OFFICE_JOIN_${officeId}_` } },
      ] } });
      await tx.adminActionLog.create({ data: { actorId: userId, action: 'OFFICE_DELETED', entityType: 'OFFICE', entityId: officeId, description: `${office.name} ofisi silindi; kullanıcı hesapları ve portföyleri korundu.` } });
      return { ok: true, officeId };
    });
  }

  private async generateUniqueOfficeCode(tx: Prisma.TransactionClient): Promise<string> {
    for (let i = 0; i < 20; i++) {
      const code = 'OFS-' + Math.floor(10000 + Math.random() * 90000).toString();
      const existing = await tx.office.findUnique({ where: { code } });
      if (!existing) return code;
    }
    return 'OFS-' + randomUUID().substring(0, 6).toUpperCase();
  }

  async create(userId: string, name: unknown) {
    const cleanName = typeof name === 'string' ? name.trim().replace(/\s+/g, ' ') : '';
    if (cleanName.length < 2 || cleanName.length > 120) throw new BadRequestException('Ofis adı 2–120 karakter olmalıdır.');
    return this.prisma.$transaction(async tx => {
      await officeLock(tx, `office-user:${userId}`);
      const user = await tx.user.findUnique({ where: { id: userId }, include: { capabilities: true } });
      if (!user || (user.role !== Role.SUPER_ADMIN && (user.role !== Role.EMLAKCI || !user.capabilities.some(c => c.capability === Capability.OFFICE_OWNER)))) throw new ForbiddenException('Ofis açabilmek için doğrulanmış emlak ofisi hesabınız olmalıdır.');
      if (user.role !== Role.SUPER_ADMIN && (user.officeId || await tx.office.findFirst({ where: { ownerUserId: userId, isActive: true } }))) throw new BadRequestException('Mevcut ofis bağlantınızı kullanın.');
      const office = await tx.office.create({ data: { name: cleanName, slug: `ofis-${randomUUID()}`, ownerUserId: userId, city: user.city, district: user.district, isActive: true, code: await this.generateUniqueOfficeCode(tx) } });
      if (user.role !== Role.SUPER_ADMIN) await tx.user.update({ where: { id: userId }, data: { officeId: office.id } });
      await tx.systemSetting.create({ data: { key: officePolicyKey(office.id), valueJson: { mode: 'ALLOCATED', updatedBy: userId, updatedAt: new Date().toISOString() } } });
      await tx.adminActionLog.create({ data: { actorId: userId, action: 'OFFICE_SELF_CREATED', entityType: 'OFFICE', entityId: office.id, description: 'Doğrulanmış ofis sahibi kendi ofisini oluşturdu.' } });
      return { ok: true, officeId: office.id };
    });
  }

  async dashboard(userId: string, officeId?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { capabilities: true } });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı.');
    const hasOwnerCap = user.capabilities.some(c => c.capability === Capability.OFFICE_OWNER) || user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN;
    const offices = await this.prisma.office.findMany({
      where: user.role === Role.SUPER_ADMIN
        ? (officeId ? { id: officeId } : {})
        : { isActive: true, OR: [...(hasOwnerCap ? [{ ownerUserId: userId }] : []), { id: user.officeId || '' }].filter(Boolean) },
      include: { owner: { select: { firstName: true, lastName: true } } },
      orderBy: { name: 'asc' }
    });
    const data = await Promise.all(offices.map(async office => {
      const isOwner = user.role === Role.SUPER_ADMIN || office.ownerUserId === userId && hasOwnerCap;
      const mode = await spendingMode(this.prisma, office.id);
      const walletId = isOwner || mode === 'SHARED' ? office.ownerUserId : userId;
      const wallet = walletId ? await this.prisma.kontorCuzdani.findUnique({ where: { kullaniciId: walletId } }) : null;
      const members = isOwner ? await this.prisma.user.findMany({ where: { officeId: office.id, role: Role.EMLAKCI }, select: { id: true, firstName: true, lastName: true, isApproved: true, isVerified: true }, orderBy: { firstName: 'asc' } }) : [];
      const pending = isOwner ? (await this.prisma.systemSetting.findMany({ where: { key: { startsWith: `EPH_OFFICE_JOIN_${office.id}_` } } })).filter(r => (r.valueJson as Prisma.JsonObject | null)?.status === 'PENDING') : [];
      const ids = pending.map(r => (r.valueJson as Prisma.JsonObject)?.userId).filter((id): id is string => typeof id === 'string');
      const capacity = await this.agentCapacity(this.prisma, office.id);
      const agentCount = await this.prisma.user.count({ where: { officeId: office.id, role: Role.EMLAKCI, id: { not: office.ownerUserId || '' } } });
      const full = user.role !== Role.SUPER_ADMIN && agentCount >= capacity.limit;
      const applicantRows = ids.length ? await this.prisma.user.findMany({ where: { id: { in: ids }, role: Role.EMLAKCI }, select: { id: true, firstName: true, lastName: true, phone: true, officeId: true } }) : [];
      const applicants = applicantRows.map(({ officeId: linked, ...a }) => ({ ...a, capacityFull: full, blockedReason: linked ? 'Danışman başka bir ofise bağlı.' : full ? `Kapasite dolu: paketinizde ${capacity.limit} danışman hakkı var.` : null }));
      const policy = await this.prisma.systemSetting.findUnique({ where: { key: officePolicyKey(office.id) } });
      const profile = await this.prisma.systemSetting.findUnique({ where: { key: officeProfileKey(office.id) } });
      const extras = await this.dashboardExtras(office, isOwner, policy?.valueJson);
      const enrichedMembers = members.map(member => ({
        ...member,
        canScan: extras.permissions?.scanPermissions[member.id] !== false,
        canAutoSpend: extras.permissions?.autoSpendPermissions[member.id] !== false,
        teams: (extras.teams || []).filter(team => team.members.some(m => m.id === member.id)).map(team => ({ id: team.id, name: team.name })),
      }));
      return { id: office.id, name: office.name, code: office.code || ('OFS-' + office.id.substring(0, 5).toUpperCase()), ownerName: [office.owner?.firstName, office.owner?.lastName].filter(Boolean).join(' '), city: office.city || '', district: office.district || '', neighborhood: office.neighborhood || '', ...officeProfile(profile?.valueJson), isOwner, mode, modeConfigured: Boolean(policy), balance: wallet?.bakiye ?? 0, walletActive: wallet?.aktifMi === true, memberCount: agentCount, agentCapacity: { used: agentCount, total: capacity.limit, packageName: capacity.packageName }, members: enrichedMembers, applicants, ...extras };
    }));
    return { actorId: userId, requiresOffice: user.role === Role.EMLAKCI && !data.length,
      canCreate: user.role === Role.SUPER_ADMIN || user.role === Role.EMLAKCI && user.capabilities.some(c => c.capability === Capability.OFFICE_OWNER) && !data.length,
      offices: data };
  }

  // Danışman kontenjanı (sahip hariç): paket kaydı > abonelik > varsayılan 5.
  private async agentCapacity(db: OfficeDb, officeId: string) {
    // EPH-70B2: OFFICE_ENTITLEMENT_SOURCE=relational iken tek çözümleyici (Ofis Boy hariç kullanıcı sayısı, karar 18d; ek kullanıcı dahil)
    if (await entitlementSource(db) === 'relational') {
      const eff = await resolveOfficeEntitlements(db, officeId);
      return { limit: eff.agents, packageName: eff.packageName };
    }
    const subscription = await db.systemSetting.findUnique({ where: { key: `OFFICE_SUBSCRIPTION_${officeId}` } });
    const sub = subscription?.valueJson as Prisma.JsonObject | undefined;
    const config = await db.systemSetting.findUnique({ where: { key: 'OFFICE_MEMBERSHIP_PACKAGES' } });
    const current = Array.isArray(config?.valueJson) ? (config.valueJson as Prisma.JsonObject[]).find(p => p.code === sub?.packageCode) : undefined;
    const capacity = current?.agents ?? sub?.agents;
    const limit = typeof capacity === 'number' && Number.isSafeInteger(capacity) && capacity >= 0 ? capacity : 5;
    const label = [current?.name, current?.title, sub?.packageName, sub?.packageCode].find(v => typeof v === 'string' && v);
    return { limit, packageName: (label as string | undefined) || 'Paket' };
  }

  private async maxTeamsFor(db: OfficeDb, officeId: string) {
    if (await entitlementSource(db) === 'relational') {
      const eff = await resolveOfficeEntitlements(db, officeId);
      const row = eff.packageCode ? (await loadOfficeSettings(db)).catalog.get(eff.packageCode) : undefined;
      return resolveMaxTeams(row as { maxTeams?: unknown } | undefined, eff.agents);
    }
    const subscription = await db.systemSetting.findUnique({ where: { key: `OFFICE_SUBSCRIPTION_${officeId}` } });
    const sub = subscription?.valueJson as any;
    const config = await db.systemSetting.findUnique({ where: { key: 'OFFICE_MEMBERSHIP_PACKAGES' } });
    const currentPkg = Array.isArray(config?.valueJson) ? (config.valueJson as any[]).find(p => p.code === sub?.packageCode) : undefined;
    return resolveMaxTeams(currentPkg, Number(currentPkg?.agents ?? sub?.agents ?? 3));
  }

  // Mobil OfficeWorkspace sözleşmesi: hierarchy herkese; teams, allMembers, maxTeams, permissions yalnız ofis sahibine.
  private async dashboardExtras(office: { id: string; name: string; ownerUserId: string | null; owner?: { firstName: string | null; lastName: string | null } | null }, isOwner: boolean, policyValue: unknown) {
    const fullName = (u?: { firstName?: string | null; lastName?: string | null } | null) => [u?.firstName, u?.lastName].filter(Boolean).join(' ');
    const advisors = await this.prisma.user.findMany({ where: { officeId: office.id, role: Role.EMLAKCI, id: { not: office.ownerUserId || '' } }, select: { id: true, firstName: true, lastName: true, phone: true, isApproved: true, isVerified: true }, orderBy: { firstName: 'asc' } });
    const hierarchy = [
      ...(office.ownerUserId ? [{ officeName: office.name, roleTitle: 'Ofis Sahibi', fullName: fullName(office.owner) || 'Ofis Sahibi', userId: office.ownerUserId }] : []),
      ...advisors.map(a => ({ officeName: office.name, roleTitle: 'Emlak Danışmanı', fullName: fullName(a), userId: a.id })),
    ];
    if (!isOwner) return { hierarchy };
    const policy = policyValue && typeof policyValue === 'object' && !Array.isArray(policyValue) ? policyValue as Record<string, any> : {};
    const scanPermissions: Record<string, boolean> = policy.scanPermissions && typeof policy.scanPermissions === 'object' ? policy.scanPermissions : {};
    const autoSpendPermissions: Record<string, boolean> = policy.autoSpendPermissions && typeof policy.autoSpendPermissions === 'object' ? policy.autoSpendPermissions : {};
    const allowedSharedPoolUserIds: string[] = Array.isArray(policy.allowedSharedPoolUserIds) ? policy.allowedSharedPoolUserIds : [];
    const allowedSharedPoolTeamIds: string[] = Array.isArray(policy.allowedSharedPoolTeamIds) ? policy.allowedSharedPoolTeamIds : [];
    const teamRows = await this.prisma.team.findMany({ where: { officeId: office.id, isActive: true }, include: { leader: { select: { firstName: true, lastName: true } }, members: { where: { isActive: true }, include: { user: { select: { id: true, firstName: true, lastName: true } } } } }, orderBy: { name: 'asc' } });
    const teams = teamRows.map(t => {
      const members = t.members.map(m => ({ id: m.user.id, firstName: m.user.firstName || '', lastName: m.user.lastName || '' }));
      return { id: t.id, name: t.name, leaderId: t.leaderId, leaderName: fullName(t.leader) || null, memberCount: members.length, members };
    });
    const restricted = allowedSharedPoolUserIds.length > 0 || allowedSharedPoolTeamIds.length > 0;
    const allMembers = advisors.map(a => ({
      ...a,
      firstName: a.firstName || '',
      lastName: a.lastName || '',
      roleTitle: 'Emlak Danışmanı',
      canScan: scanPermissions[a.id] !== false,
      canAutoSpend: autoSpendPermissions[a.id] !== false,
      hasSharedPoolAccess: !restricted || allowedSharedPoolUserIds.includes(a.id) || teamRows.some(t => allowedSharedPoolTeamIds.includes(t.id) && t.members.some(m => m.userId === a.id)),
      teams: teamRows.filter(t => t.members.some(m => m.userId === a.id)).map(t => ({ id: t.id, name: t.name })),
    }));
    return { hierarchy, allMembers, teams, maxTeams: await this.maxTeamsFor(this.prisma, office.id), permissions: { scanPermissions, autoSpendPermissions, allowedSharedPoolUserIds, allowedSharedPoolTeamIds } };
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

  async inviteCandidates(userId: string, officeId: string, rawQuery: unknown) {
    const q = typeof rawQuery === 'string' ? rawQuery.trim() : '';
    return this.prisma.$transaction(async tx => {
      await this.owned(tx, userId, officeId);
      if (q.length < 2 || q.length > 80) return { items: [] };
      const words = q.split(/\s+/).filter(Boolean);
      const items = await tx.user.findMany({
        where: { role: { in: [Role.EMLAKCI, Role.OFIS_BOY] }, isApproved: true, isVerified: true, officeId: null,
          ownedOffices: { none: { isActive: true } },
          AND: words.map(word => ({ OR: [{ firstName: { contains: word, mode: 'insensitive' } }, { lastName: { contains: word, mode: 'insensitive' } }, { memberCode: { contains: word, mode: 'insensitive' } }] })),
        }, select: { id: true, firstName: true, lastName: true, memberCode: true, city: true, district: true, role: true },
        orderBy: [{ firstName: 'asc' }, { id: 'asc' }], take: 30,
      });
      return { items };
    });
  }

  async invite(userId: string, officeId: string, recipientId?: unknown) {
    if (typeof recipientId !== 'string' || !recipientId || recipientId.length > 128) throw new BadRequestException('Davet edilecek emlakçıyı seçin.');
    return this.prisma.$transaction(async tx => {
      await officeLock(tx, `office-user:${recipientId}`);
      await officeLock(tx, `office-policy:${officeId}`);
      const office = await this.owned(tx, userId, officeId);
      const recipient = await tx.user.findUnique({ where: { id: recipientId } });
      if (recipient?.role !== Role.EMLAKCI || !recipient.isApproved || !recipient.isVerified || recipient.officeId || await tx.office.count({ where: { ownerUserId: recipientId, isActive: true } })) throw new BadRequestException('Yalnız doğrulanmış ve bir ofise bağlı olmayan emlakçı davet edilebilir.');
      const code = randomBytes(6).toString('hex').toUpperCase();
      const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();
      const codeHash = digest(code);
      const value = { hash: codeHash, expiresAt, recipientUserId: recipientId };
      const key = `EPH_OFFICE_INVITE_${officeId}_${recipientId}`;
      await tx.systemSetting.upsert({ where: { key }, create: { key, valueJson: value }, update: { valueJson: value } });
      const lookupKey = `EPH_OFFICE_CODE_${codeHash}`;
      const lookupValue = { officeId, expiresAt, recipientUserId: recipientId };
      await tx.systemSetting.upsert({ where: { key: lookupKey }, create: { key: lookupKey, valueJson: lookupValue }, update: { valueJson: lookupValue } });
      await this.notifications?.notify(recipientId, { type: 'OFFICE_INVITATION', priority: 'ONEMLI',
        title: 'Ofis davetiniz var', body: `${office.name} sizi ekibine davet ediyor.`,
        actionUrl: `/office?inviteCode=${code}`, eventKey: `office-invite:${officeId}:${codeHash}` }, tx);
      return { officeId, code, expiresAt, ok: true };
    });
  }

  // ODM-7F-D/N5: davet kodu yalnız (a) arama kaydı bu ofise aitse, (b) alıcı bu kullanıcıysa, (c) süresi dolmamışsa ve
  // (d) ofis+alıcı için kayıtlı GÜNCEL davet hash'i ile eşleşiyorsa (rotasyonla eskiyen kod reddedilir) geçerlidir.
  private async assertInviteValid(tx: Prisma.TransactionClient, officeId: string, userId: string, codeHash: string) {
    const invalid = () => new BadRequestException('Davet kodu geçersiz, süresi dolmuş veya yenilenmiş.');
    const notFuture = (v: unknown) => { const t = typeof v === 'string' ? Date.parse(v) : NaN; return !Number.isFinite(t) || t <= Date.now(); };
    const lookup = await tx.systemSetting.findUnique({ where: { key: `EPH_OFFICE_CODE_${codeHash}` } });
    const l = lookup?.valueJson as Prisma.JsonObject | null | undefined;
    if (!l || l.officeId !== officeId) throw invalid();
    if (l.recipientUserId !== userId) throw new ForbiddenException('Bu davet kodu size ait değil.');
    if (notFuture(l.expiresAt)) throw invalid();
    const invite = await tx.systemSetting.findUnique({ where: { key: `EPH_OFFICE_INVITE_${officeId}_${userId}` } });
    const i = invite?.valueJson as Prisma.JsonObject | null | undefined;
    if (!i || i.hash !== codeHash || i.recipientUserId !== userId || notFuture(i.expiresAt)) throw invalid();
  }

  async requestJoin(userId: string, rawCode: unknown) {
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
        // 2. Davet kodu: biçim + (ODM-7F-D/N5) güncel hash, süre ve alıcı doğrulaması
        let codeHash: string | null = null;
        if (sanitized.includes('.')) {
          const [targetOfficeId, codePart, extra] = rawCode.trim().split('.');
          if (!targetOfficeId || !/^[A-F0-9]{12,36}$/i.test(codePart || '') || extra) {
            throw new BadRequestException('Ofis ID numarası veya davet kodu bulunamadı.');
          }
          officeId = targetOfficeId;
          codeHash = digest(codePart.toUpperCase());
        } else {
          const cleanCode = sanitized.replace(/[\s-]/g, '');
          if (/^[A-F0-9]{12}$/.test(cleanCode)) {
            codeHash = digest(cleanCode);
            const lookup = await tx.systemSetting.findUnique({ where: { key: `EPH_OFFICE_CODE_${codeHash}` } });
            const lookupVal = lookup?.valueJson as any;
            if (lookupVal?.officeId && typeof lookupVal.officeId === 'string') {
              officeId = lookupVal.officeId;
            }
          }
        }
        if (officeId && codeHash) await this.assertInviteValid(tx, officeId, userId, codeHash);
      }

      if (!officeId) {
        throw new BadRequestException('Girilen Ofis ID numarası veya davet kodu geçerli bir ofisle eşleşmedi.');
      }

      await officeLock(tx, `office-user:${userId}`);
      await officeLock(tx, `office-policy:${officeId}`);

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
        body: `${applicantName} (${user.phone || ''}) ofisinize katılmak için talepte bulundu.`,
        actionUrl: '/office',
        eventKey: `office-request:${key}:${data.requestedAt}`,
      }, tx);

      return {
        ok: true,
        message: `${office.name} (Ofis ID: ${office.code || office.id}) ofis sahibine katılım talebiniz iletildi. Onay bekleniyor.`,
      };
    });
  }

  async decide(userId: string, officeId: string, applicantId: string, approve: unknown) {
    if (typeof approve !== 'boolean' || typeof applicantId !== 'string' || !applicantId || applicantId.length > 128) throw new BadRequestException('Başvuru ve karar geçersiz.');
    return this.prisma.$transaction(async tx => {
      await officeLock(tx, `office-user:${applicantId}`);
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${applicantId} FOR NO KEY UPDATE`;
      await officeLock(tx, `office-policy:${officeId}`);
      await this.owned(tx, userId, officeId);
      const key = requestKey(officeId, applicantId);
      const row = await tx.systemSetting.findUnique({ where: { key } });
      const value = row?.valueJson as Prisma.JsonObject | undefined;
      if (value?.status !== 'PENDING') throw new BadRequestException('Bekleyen başvuru bulunamadı.');
      if (approve) {
        const applicant = await tx.user.findUnique({ where: { id: applicantId } });
        if (applicant?.role !== Role.EMLAKCI || applicant.officeId || await tx.office.count({ where: { ownerUserId: applicantId, isActive: true } })) throw new BadRequestException('Danışmanın ofis bağlantısı değişmiş.');
        const { limit } = await this.agentCapacity(tx, officeId);
        const count = await tx.user.count({ where: { officeId, role: Role.EMLAKCI, NOT: { id: userId } } });
        if (!(await this.isSuperAdmin(tx, userId)) && count >= limit) throw new BadRequestException(`Kapasite dolu: paketinizde ${limit} danışman hakkı var.`);
        await tx.user.update({ where: { id: applicantId }, data: { officeId } });
      }
      const decidedAt = new Date().toISOString();
      await tx.systemSetting.update({ where: { key }, data: { valueJson: { ...value, status: approve ? 'APPROVED' : 'REJECTED', decidedBy: userId, decidedAt } } });
      await this.notifications?.notify(applicantId, { type: 'OFFICE_JOIN_DECIDED', priority: 'ONEMLI',
        title: 'Ofis başvurunuz sonuçlandı', body: approve ? 'Ofis başvurunuz onaylandı.' : 'Ofis başvurunuz reddedildi.',
        actionUrl: '/office', eventKey: `office-decision:${key}:${decidedAt}` }, tx);
      await tx.adminActionLog.create({ data: { actorId: userId, targetUserId: applicantId, action: 'OFFICE_JOIN_DECIDED', entityType: 'OFFICE', entityId: officeId, description: approve ? 'Danışman ofise kabul edildi; mesleki doğrulama durumu değiştirilmedi.' : 'Ofis başvurusu reddedildi.' } });
      return { ok: true };
    });
  }

  async transfer(userId: string, officeId: string, input: { memberId?: string; amount?: number; requestId?: string }) {
    const { memberId, amount, requestId } = input;
    if (typeof memberId !== 'string' || !memberId || memberId.length > 128 || typeof requestId !== 'string' || memberId === userId || !Number.isSafeInteger(amount) || amount! <= 0 || amount! > MAX_PK || !/^[A-Za-z0-9_-]{16,100}$/.test(requestId || '')) throw new BadRequestException('Danışman, PK miktarı veya işlem anahtarı geçersiz.');
    return this.prisma.$transaction(async tx => {
      // EPH-ODM-7F-D/D7: kilit sırası harcama resolver'ı ile AYNI: payment-user -> office-user -> User(NKU) -> office-policy -> Office satırı -> wallet.
      // owned() Office satırını kilitlediği için önce kilitsiz ön okuma ile kaynak (sahip) bulunur, kilitler alınır, sonra sahiplik kilit altında yeniden doğrulanır.
      const preOffice = await tx.office.findUnique({ where: { id: officeId }, select: { ownerUserId: true } });
      if (!preOffice?.ownerUserId) throw new BadRequestException('PK dağıtımı için önce ofis sahibini atayın.');
      const sourceUserId = preOffice.ownerUserId;
      if (sourceUserId !== userId && !(await this.isSuperAdmin(tx, userId))) throw new ForbiddenException('Bu işlem yalnız aktif ofisin sahibine açıktır.');
      if (memberId === sourceUserId) throw new BadRequestException('Kaynak ve hedef cüzdan aynı olamaz.');
      const ids = [sourceUserId, memberId].sort();
      for (const id of ids) await lockPaymentUser(tx, id);
      for (const id of ids) {
        await officeLock(tx, `office-user:${id}`);
        await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${id} FOR NO KEY UPDATE`;
      }
      await officeLock(tx, `office-policy:${officeId}`);
      const office = await this.owned(tx, userId, officeId);
      if (office.ownerUserId !== sourceUserId) throw new BadRequestException('Ofis sahibi değişti; işlemi yeniden deneyin.');
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
      for (const id of ids) await tx.kontorCuzdani.upsert({ where: { kullaniciId: id }, create: { kullaniciId: id }, update: {} });
      // EPH-70B1F/ODM-7F-D: iki cüzdan -> kullaniciId'ye göre artan sırada ortak kilit (wallet advisory + FOR UPDATE + dönem sonu kapanışı)
      await lockWalletsOrdered(tx, ids);
      const source = await tx.kontorCuzdani.findUniqueOrThrow({ where: { kullaniciId: sourceUserId } });
      const target = await tx.kontorCuzdani.findUniqueOrThrow({ where: { kullaniciId: memberId } });
      if (!source.aktifMi || !target.aktifMi || source.bakiye < amount! || target.bakiye > MAX_PK - amount!) throw new BadRequestException('PK bakiyesi yetersiz veya cüzdan kullanıma kapalı.');
      await tx.kontorCuzdani.update({ where: { kullaniciId: sourceUserId }, data: { bakiye: { decrement: amount } } });
      await tx.kontorCuzdani.update({ where: { kullaniciId: memberId }, data: { bakiye: { increment: amount } } });
      let transferPlan: Awaited<ReturnType<typeof consumeLots>> | null = null;
      // A transfer does not manufacture credit, count as a purchase, or consume service PK.
      for (const [id, before, after, direction] of [[sourceUserId, source.bakiye, source.bakiye - amount!, 'Çıkış'], [memberId, target.bakiye, target.bakiye + amount!, 'Giriş']] as const) {
        const transferMovement = await tx.kontorHareketi.create({ data: { kullaniciId: id, hareketTuru: KontorHareketTuru.DUZELTME, islemTuru: KontorIslemTuru.DIGER, miktar: amount!, oncekiBakiye: before, sonrakiBakiye: after, aciklama: `Ofis PK dağıtımı · ${direction}`, ilgiliKayitTuru: 'OFFICE_PK_TRANSFER', ilgiliKayitId: requestId, olusturanId: userId } });
        // EPH-70B1F/D1+D6: kaynaktan lot düşer; hedefe AYNI vade/tür/kaynakla lot yazılır (vade kaçağı olmasın), izlenmeyen kısım DEVIR.
        if (direction === 'Çıkış') transferPlan = await consumeLots(tx, sourceUserId, amount!, { hareketId: transferMovement.id });

      }
      for (const step of transferPlan?.steps ?? []) {
        await grantLot(tx, { userId: memberId, lotTuru: step.lot.lotTuru as 'PAKET', amount: step.take, sonKullanmaTarihi: step.lot.sonKullanmaTarihi, kaynakKayitTuru: step.lot.kaynakKayitTuru ?? 'OFFICE_PK_TRANSFER', kaynakKayitId: requestId, dedupeKey: `office-transfer:${userId}:${requestId}:${step.lot.id}`, aciklama: 'Ofis PK dağıtımı (devir)' });
      }
      if ((transferPlan?.untracked ?? 0) > 0) await grantLot(tx, { userId: memberId, lotTuru: 'DEVIR', amount: transferPlan!.untracked, kaynakKayitTuru: 'OFFICE_PK_TRANSFER', kaynakKayitId: requestId, dedupeKey: `office-transfer:${userId}:${requestId}:untracked`, aciklama: 'Ofis PK dağıtımı (izlenmeyen kısım)' });
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
      const maxTeams = await this.maxTeamsFor(tx, officeId);
      if (!(await this.isSuperAdmin(tx, userId)) && activeTeamsCount >= maxTeams) {
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
      if (await this.isSuperAdmin(tx, userId)) await tx.team.delete({ where: { id: teamId } });
      else await tx.team.update({ where: { id: teamId }, data: { isActive: false } });
      if (team.leaderId && !(await tx.team.findFirst({ where: { leaderId: team.leaderId, isActive: true } }))) {
        await tx.userCapability.deleteMany({ where: { userId: team.leaderId, capability: Capability.TEAM_LEADER } });
      }
      await tx.adminActionLog.create({ data: { actorId: userId, action: 'OFFICE_TEAM_DELETED', entityType: 'TEAM', entityId: teamId, metadata: { officeId } } });
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

  // EPH-18: Danışmanı ofisten çıkar. Hesap silinmez; portföyleri danışmanda kalır.
  async removeMember(userId: string, officeId: string, memberUserId: string) {
    if (typeof memberUserId !== 'string' || !memberUserId || memberUserId.length > 128) throw new BadRequestException('Danışman seçimi geçersiz.');
    return this.prisma.$transaction(async tx => {
      await officeLock(tx, `office-user:${memberUserId}`);
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${memberUserId} FOR NO KEY UPDATE`;
      await officeLock(tx, `office-policy:${officeId}`);
      const office = await this.owned(tx, userId, officeId);
      if (memberUserId === office.ownerUserId) {
        if (!(await this.isSuperAdmin(tx, userId))) throw new BadRequestException('Ofis sahibi ofisten çıkarılamaz.');
        await tx.office.update({ where: { id: officeId }, data: { ownerUserId: null } });
      }
      const member = await tx.user.findUnique({ where: { id: memberUserId }, select: { id: true, officeId: true, firstName: true, lastName: true } });
      if (!member || member.officeId !== officeId) throw new NotFoundException('Danışman bu ofiste bulunamadı.');
      const now = new Date();
      const teams = await tx.team.findMany({ where: { officeId }, select: { id: true, leaderId: true } });
      const teamIds = teams.map(t => t.id);
      if (teamIds.length) {
        await tx.teamMember.updateMany({ where: { teamId: { in: teamIds }, userId: memberUserId, isActive: true }, data: { isActive: false, leftAt: now } });
        const led = teams.filter(t => t.leaderId === memberUserId).map(t => t.id);
        if (led.length) await tx.team.updateMany({ where: { id: { in: led } }, data: { leaderId: null } });
        if (!(await tx.team.findFirst({ where: { leaderId: memberUserId, isActive: true } }))) {
          await tx.userCapability.deleteMany({ where: { userId: memberUserId, capability: Capability.TEAM_LEADER } });
        }
      }
      await tx.unit.updateMany({ where: { project: { ownerId: memberUserId } }, data: { sharedWithSisters: false } });
      await tx.user.update({ where: { id: memberUserId }, data: { officeId: null } });
      const key = officePolicyKey(officeId);
      const policyRow = await tx.systemSetting.findUnique({ where: { key } });
      const policy = policyRow?.valueJson && typeof policyRow.valueJson === 'object' && !Array.isArray(policyRow.valueJson) ? { ...(policyRow.valueJson as Record<string, any>) } : null;
      if (policy) {
        for (const field of ['scanPermissions', 'autoSpendPermissions']) {
          if (policy[field] && typeof policy[field] === 'object') { const next = { ...policy[field] }; delete next[memberUserId]; policy[field] = next; }
        }
        if (Array.isArray(policy.allowedSharedPoolUserIds)) policy.allowedSharedPoolUserIds = policy.allowedSharedPoolUserIds.filter((id: unknown) => id !== memberUserId);
        await tx.systemSetting.update({ where: { key }, data: { valueJson: policy as Prisma.InputJsonValue } });
      }
      const joinKey = requestKey(officeId, memberUserId);
      const joinRow = await tx.systemSetting.findUnique({ where: { key: joinKey } });
      if (joinRow) await tx.systemSetting.update({ where: { key: joinKey }, data: { valueJson: { ...((joinRow.valueJson as Prisma.JsonObject) || {}), status: 'REMOVED', removedBy: userId, removedAt: now.toISOString() } } });
      await this.notifications?.notify(memberUserId, { type: 'ROLE_CHANGED', priority: 'ONEMLI',
        title: 'Ofis üyeliğiniz sona erdi', body: `${office.name} ofisinden çıkarıldınız. Hesabınız ve portföyleriniz korunur.`,
        actionUrl: '/office', eventKey: `office-removed:${officeId}:${memberUserId}:${now.toISOString()}` }, tx);
      await tx.adminActionLog.create({ data: { actorId: userId, targetUserId: memberUserId, action: 'OFFICE_MEMBER_REMOVED', entityType: 'OFFICE', entityId: officeId, description: 'Danışman ofisten çıkarıldı; hesap ve portföyleri korundu.' } });
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
      if (this.notifications) {
        const members = await tx.user.findMany({ where: { officeId }, select: { id: true } });
        const teams = await tx.team.findMany({ where: { officeId, isActive: true }, include: { members: { where: { isActive: true } } } });
        const access = (policy: any, id: string) => {
          const users: string[] = policy.allowedSharedPoolUserIds || [];
          const allowedTeams: string[] = policy.allowedSharedPoolTeamIds || [];
          return !users.length && !allowedTeams.length || users.includes(id) || teams.some(t => allowedTeams.includes(t.id) && t.members.some(m => m.userId === id));
        };
        for (const member of members) {
          const changed = (current.scanPermissions?.[member.id] !== false) !== (updated.scanPermissions[member.id] !== false)
            || (current.autoSpendPermissions?.[member.id] !== false) !== (updated.autoSpendPermissions[member.id] !== false)
            || access(current, member.id) !== access(updated, member.id);
          if (changed) await this.notifications.notify(member.id, { type: 'ROLE_CHANGED', priority: 'ONEMLI',
            title: 'Ofis yetkileriniz değişti', body: 'Ofis içindeki erişim veya PK kullanım yetkiniz güncellendi.',
            actionUrl: '/office', eventKey: `office-permission:${officeId}:${updated.updatedAt}:${member.id}` }, tx);
        }
      }
      return { ok: true, permissions: updated };
    });
  }

  // Task 20: Takım ve Kişilere Görev Atama
  async getOfficeTasks(userId: string, officeId: string) {
    const office = await this.prisma.office.findUnique({ where: { id: officeId } });
    if (!office) throw new NotFoundException('Ofis bulunamadı.');
    const isOwner = await this.isSuperAdmin(this.prisma, userId) || office.ownerUserId === userId;
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
      const isOwner = await this.isSuperAdmin(tx, userId) || office.ownerUserId === userId;

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
    const isOwner = await this.isSuperAdmin(this.prisma, userId) || office.ownerUserId === userId;
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
    if (!user && office.ownerUserId !== userId && !(await this.isSuperAdmin(this.prisma, userId))) {
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
    if (!user && office.ownerUserId !== userId && !(await this.isSuperAdmin(this.prisma, userId))) {
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

  // FAZ 3: Broker Günlük Mesaj Trafiği & Denetim Raporu
  async getBrokerDailyAuditReport(userId: string, officeId: string) {
    const office = await this.prisma.office.findUnique({ where: { id: officeId }, include: { owner: true } });
    if (!office) throw new NotFoundException('Ofis bulunamadı.');

    const isSuper = await this.isSuperAdmin(this.prisma, userId);
    const isOwner = isSuper || office.ownerUserId === userId;
    if (!isOwner) throw new ForbiddenException('Bu rapor yalnız ofis sahibine veya Süper Admin’e açıktır.');

    const consultants = await this.prisma.user.findMany({
      where: { officeId: office.id, role: Role.EMLAKCI },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true },
      orderBy: { firstName: 'asc' },
    });

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    const consultantIds = consultants.map(c => c.id);
    if (!consultantIds.length) {
      return {
        officeId,
        officeName: office.name,
        date: todayStart.toISOString().split('T')[0],
        totalOfficeMessages: 0,
        activeConsultantCount: 0,
        highVolumeAlert: false,
        summaryText: 'Ofise bağlı danışman bulunmuyor.',
        consultantReports: [],
      };
    }

    const messages = await this.prisma.message.findMany({
      where: {
        senderId: { in: consultantIds },
        createdAt: { gte: todayStart },
      },
      include: {
        Conversation: {
          select: {
            id: true,
            title: true,
            subjectType: true,
            subjectId: true,
            dealStatus: true,
            ConversationParticipant: {
              select: {
                userId: true,
                User: { select: { id: true, firstName: true, lastName: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const consultantMap = new Map<string, {
      id: string;
      fullName: string;
      totalMessages: number;
      recipients: Map<string, { name: string; count: number }>;
      businessTypes: Map<string, number>;
      conversationIds: Set<string>;
      waitingDealsCount: number;
    }>();

    for (const c of consultants) {
      const name = [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email || 'Danışman';
      consultantMap.set(c.id, {
        id: c.id,
        fullName: name,
        totalMessages: 0,
        recipients: new Map(),
        businessTypes: new Map(),
        conversationIds: new Set(),
        waitingDealsCount: 0,
      });
    }

    for (const msg of messages) {
      const rec = consultantMap.get(msg.senderId);
      if (!rec) continue;
      rec.totalMessages += 1;
      const conv = msg.Conversation;
      if (conv) {
        rec.conversationIds.add(conv.id);
        const st = conv.subjectType || 'GENEL';
        rec.businessTypes.set(st, (rec.businessTypes.get(st) || 0) + 1);
        if (conv.dealStatus === 'ONAY_BEKLIYOR' || conv.dealStatus === 'EVRAK_BEKLIYOR') {
          rec.waitingDealsCount += 1;
        }
        for (const p of conv.ConversationParticipant) {
          if (p.userId !== msg.senderId) {
            const peerName = [p.User?.firstName, p.User?.lastName].filter(Boolean).join(' ') || 'EPH Danışmanı';
            const cur = rec.recipients.get(p.userId) || { name: peerName, count: 0 };
            cur.count += 1;
            rec.recipients.set(p.userId, cur);
          }
        }
      }
    }

    const consultantReports = Array.from(consultantMap.values()).map(r => {
      const topRecipients = Array.from(r.recipients.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);
      const isHighVolume = r.totalMessages >= 100;
      return {
        id: r.id,
        fullName: r.fullName,
        totalMessages: r.totalMessages,
        distinctRecipientCount: r.recipients.size,
        topRecipients,
        distinctConversationsCount: r.conversationIds.size,
        talepCount: r.businessTypes.get('TALEP') || 0,
        portfoyCount: r.businessTypes.get('PORTFOY') || 0,
        waitingDealsCount: r.waitingDealsCount,
        isHighVolume,
      };
    }).sort((a, b) => b.totalMessages - a.totalMessages);

    const totalOfficeMessages = consultantReports.reduce((sum, r) => sum + r.totalMessages, 0);
    const activeConsultants = consultantReports.filter(r => r.totalMessages > 0);
    const highVolumeConsultants = consultantReports.filter(r => r.isHighVolume);

    let summaryText = '';
    if (totalOfficeMessages === 0) {
      summaryText = 'Bugün ofisinizde herhangi bir mesajlaşma trafiği gerçekleşmedi.';
    } else {
      const top = activeConsultants[0];
      const topRecDesc = top.topRecipients.length > 0
        ? `En çok mesajlaşılan: ${top.topRecipients[0].name} (${top.topRecipients[0].count} mesaj).`
        : '';
      summaryText = `Bugün ofisinizde ${activeConsultants.length} danışman toplam ${totalOfficeMessages} mesaj gönderdi. En aktif: ${top.fullName} (${top.totalMessages} mesaj, ${top.distinctRecipientCount} kişi). ${topRecDesc} İlgili işler: ${top.talepCount} Talep, ${top.portfoyCount} Portföy.`;
      if (highVolumeConsultants.length > 0) {
        summaryText += ` ⚠️ DİKKAT: ${highVolumeConsultants.map(h => h.fullName).join(', ')} olağandışı mesaj yoğunluğuna sahip (${highVolumeConsultants.map(h => `${h.totalMessages} mesaj`).join(', ')}).`;
      }
    }

    return {
      officeId,
      officeName: office.name,
      date: todayStart.toISOString().split('T')[0],
      totalOfficeMessages,
      activeConsultantCount: activeConsultants.length,
      highVolumeAlert: highVolumeConsultants.length > 0,
      summaryText,
      consultantReports,
    };
  }

  async triggerDailyBrokerAuditNotification(userId: string, officeId: string) {
    const report = await this.getBrokerDailyAuditReport(userId, officeId);
    const office = await this.prisma.office.findUnique({ where: { id: officeId }, select: { ownerUserId: true } });
    if (!office?.ownerUserId) return { ok: false, message: 'Ofis sahibi bulunamadı.' };

    if (this.notifications) {
      await this.notifications.notify(office.ownerUserId, {
        type: 'BROKER_DAILY_AUDIT',
        priority: report.highVolumeAlert ? 'ONEMLI' : 'BILGI',
        title: 'Akşam 21:00 Broker Mesaj Trafiği Raporu',
        body: report.summaryText,
        actionUrl: `/office-section?officeId=${officeId}&section=activities`,
      });
    }

    return { ok: true, report };
  }

  async getBrokerPerformanceLeague(userId: string, officeId: string) {
    const office = await this.prisma.office.findUnique({ where: { id: officeId }, include: { owner: true } });
    if (!office) throw new NotFoundException('Ofis bulunamadı.');
    const isSuper = await this.isSuperAdmin(this.prisma, userId);
    const isOwner = isSuper || office.ownerUserId === userId;
    if (!isOwner) throw new ForbiddenException('Bu lig yalnız ofis sahibine veya Süper Admin’e açıktır.');

    const consultants = await this.prisma.user.findMany({
      where: { officeId: office.id, role: Role.EMLAKCI },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true },
    });

    const consultantIds = consultants.map(c => c.id);

    const units = await this.prisma.unit.findMany({
      where: {
        project: { ownerId: { in: consultantIds } },
      },
      select: {
        id: true,
        status: true,
        project: { select: { ownerId: true } },
      },
    });

    const viewings = await this.prisma.digitalContract.findMany({
      where: {
        createdById: { in: consultantIds },
        contractType: 'YER_GOSTERME',
      },
      select: {
        createdById: true,
        status: true,
      },
    });

    const crmCustomers = await this.prisma.customer.findMany({
      where: {
        ownerId: { in: consultantIds },
      },
      select: {
        ownerId: true,
      },
    });

    const closedStatuses = new Set(['SATILDI', 'KIRALANDI', 'KIRALANDII']);

    const leaderboard = consultants.map(c => {
      const myUnits = units.filter(u => u.project.ownerId === c.id);
      const activeUnitsCount = myUnits.filter(u => !closedStatuses.has(u.status)).length;
      const closedDealsCount = myUnits.filter(u => closedStatuses.has(u.status)).length;
      const myViewings = viewings.filter(v => v.createdById === c.id);
      const confirmedViewingsCount = myViewings.filter(v => v.status === 'SMS_ONAYLANDI' || v.status === 'E_IMZALANDI' || v.status === 'ARSIVLENDI').length;
      const crmCount = crmCustomers.filter(cust => cust.ownerId === c.id).length;

      const score = closedDealsCount * 100 + confirmedViewingsCount * 25 + activeUnitsCount * 10 + crmCount * 5;

      return {
        id: c.id,
        name: `${c.firstName} ${c.lastName}`.trim(),
        email: c.email,
        phone: c.phone,
        activeUnitsCount,
        closedDealsCount,
        viewingsCount: myViewings.length,
        confirmedViewingsCount,
        crmCount,
        score,
      };
    });

    leaderboard.sort((a, b) => b.score - a.score);
    const ranked = leaderboard.map((item, idx) => ({ ...item, rank: idx + 1 }));

    const totalActiveUnits = leaderboard.reduce((acc, curr) => acc + curr.activeUnitsCount, 0);
    const totalViewings = leaderboard.reduce((acc, curr) => acc + curr.viewingsCount, 0);
    const totalClosedDeals = leaderboard.reduce((acc, curr) => acc + curr.closedDealsCount, 0);

    const formattedLeaderboard = ranked.map(item => ({
      ...item,
      advisorId: item.id,
      advisorName: item.name,
      crmContactsCount: item.crmCount,
      weightedScore: item.score,
    }));

    return {
      officeId,
      officeName: office.name,
      totalActiveUnits,
      totalViewings,
      totalClosedDeals,
      generatedAt: new Date().toISOString(),
      consultantCount: ranked.length,
      league: ranked,
      leaderboard: formattedLeaderboard,
    };
  }

  async getStaleRadar(userId: string, officeId: string) {
    const office = await this.prisma.office.findUnique({ where: { id: officeId }, include: { owner: true } });
    if (!office) throw new NotFoundException('Ofis bulunamadı.');
    const isSuper = await this.isSuperAdmin(this.prisma, userId);
    const isOwner = isSuper || office.ownerUserId === userId;
    if (!isOwner) throw new ForbiddenException('Bu radar yalnız ofis sahibine veya Süper Admin’e açıktır.');

    const consultants = await this.prisma.user.findMany({
      where: { officeId: office.id, role: Role.EMLAKCI },
      select: { id: true, firstName: true, lastName: true },
    });
    const consultantIds = consultants.map(c => c.id);
    const consultantMap = new Map(consultants.map(c => [c.id, `${c.firstName} ${c.lastName}`.trim()]));

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const staleUnits = await this.prisma.unit.findMany({
      where: {
        project: { ownerId: { in: consultantIds } },
        status: { in: ['SATILIK', 'DEVREN_SATILIK', 'KIRALIK', 'DEVREN_KIRALIK'] },
        updatedAt: { lt: thirtyDaysAgo },
      },
      select: {
        id: true,
        type: true,
        price: true,
        priceCurrency: true,
        updatedAt: true,
        project: {
          select: {
            name: true,
            city: true,
            district: true,
            ownerId: true,
          },
        },
      },
      take: 20,
    });

    const formattedStale = staleUnits.map(u => ({
      id: u.id,
      unitId: u.id,
      title: u.project.name || 'İsimsiz Portföy',
      city: u.project.city,
      district: u.project.district,
      price: u.price,
      priceCurrency: u.priceCurrency,
      advisorName: consultantMap.get(u.project.ownerId) || 'Danışman',
      lastUpdatedAt: u.updatedAt,
    }));

    return {
      officeId,
      officeName: office.name,
      staleThresholdDays: 30,
      thresholdDays: 30,
      staleUnitsCount: staleUnits.length,
      staleCount: staleUnits.length,
      staleUnits: formattedStale,
      stalePortfolios: formattedStale,
    };
  }

  async getWalletDiscipline(userId: string, officeId: string) {
    const office = await this.prisma.office.findUnique({ where: { id: officeId }, include: { owner: true } });
    if (!office) throw new NotFoundException('Ofis bulunamadı.');
    const isSuper = await this.isSuperAdmin(this.prisma, userId);
    const isOwner = isSuper || office.ownerUserId === userId;
    if (!isOwner) throw new ForbiddenException('Bu veri yalnız ofis sahibine veya Süper Admin’e açıktır.');

    const consultants = await this.prisma.user.findMany({
      where: { officeId: office.id, role: Role.EMLAKCI },
      select: { id: true, firstName: true, lastName: true },
    });
    const consultantMap = new Map(consultants.map(c => [c.id, `${c.firstName} ${c.lastName}`.trim()]));

    const movements = await this.prisma.kontorHareketi.findMany({
      where: {
        kullaniciId: office.ownerUserId,
        hareketTuru: 'HARCAMA',
        olusturanId: { in: consultants.map(c => c.id) },
      },
      select: {
        olusturanId: true,
        miktar: true,
        islemTuru: true,
        olusturulmaTarihi: true,
      },
    });

    const spendMap = new Map();
    for (const c of consultants) {
      spendMap.set(c.id, { totalSpentPk: 0, transactionCount: 0, lastSpentAt: null });
    }

    for (const m of movements) {
      if (!m.olusturanId) continue;
      const entry = spendMap.get(m.olusturanId);
      if (entry) {
        entry.totalSpentPk += m.miktar;
        entry.transactionCount += 1;
        if (!entry.lastSpentAt || m.olusturulmaTarihi > entry.lastSpentAt) {
          entry.lastSpentAt = m.olusturulmaTarihi;
        }
      }
    }

    const disciplineList = consultants.map(c => {
      const stats = spendMap.get(c.id) || { totalSpentPk: 0, transactionCount: 0, lastSpentAt: null };
      return {
        advisorId: c.id,
        advisorName: consultantMap.get(c.id) || 'Danışman',
        totalSpentPk: stats.totalSpentPk,
        transactionCount: stats.transactionCount,
        lastSpentAt: stats.lastSpentAt,
      };
    });

    disciplineList.sort((a, b) => b.totalSpentPk - a.totalSpentPk);

    return {
      officeId,
      officeName: office.name,
      totalOfficeSpentPk: disciplineList.reduce((acc, curr) => acc + curr.totalSpentPk, 0),
      consultants: disciplineList,
    };
  }
}

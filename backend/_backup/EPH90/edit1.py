from pathlib import Path
import shutil
root=Path.cwd(); backup=root/'_backup/EPH90'; backup.mkdir(parents=True,exist_ok=True)
files=['src/coordination/coordination-recalculation.service.ts','src/coordination/coordination.module.ts','src/coordination/commercial-match-scan.service.ts','src/matching/eph-match-engine.service.ts','src/crm/crm.service.ts','src/lina/actions/lina-confirmation-gate.service.ts','src/lina/actions/lina-action-engine.service.ts','src/lina/draft/lina-draft-flow.service.ts','src/lina/dto/lina-chat.dto.ts','src/lina/lina.controller.ts','src/lina/lina.module.ts','src/lina/lina.service.ts','src/lina/openai-tools/lina-openai-live-gateway.service.ts','src/lina/openai-tools/lina-openai-client.service.ts']
for f in files:
 dest=backup/(f+'.bak-eph90'); dest.parent.mkdir(parents=True,exist_ok=True); shutil.copy2(root/f,dest)
(backup/'changed-files.txt').write_text('\n'.join(files),encoding='utf-8')
def edit(f,old,new,count=1):
 p=root/f; s=p.read_text(encoding='utf-8'); assert s.count(old)>=count,(f,old[:100]); p.write_text(s.replace(old,new,count),encoding='utf-8')
f=files[0]
edit(f,'import { LinaGorevOnceligi, LinaModul, Role }',"import { Role }")
edit(f,"import { CommercialMatchScanService }", "import { createHash } from 'node:crypto';\nimport { NotificationsService } from '../notifications/notifications.service';\nimport { CommercialMatchScanService }")
edit(f,'private readonly paidScans: CommercialMatchScanService) {}','private readonly paidScans: CommercialMatchScanService,\n    private readonly notifications: NotificationsService) {}')
edit(f,"await this.notify(ownerId, LinaModul.FORUM, 'Talep kaydedildi', postId, '/network');", "const post = await this.prisma.networkPost.findUnique({ where: { id: postId } });\n      if (post?.isActive) await this.notify(ownerId, 'REQUEST', postId, post, `/network/${encodeURIComponent(postId)}`);")
edit(f,"if (interest?.isActive) await this.notify(interest.customer.ownerId, LinaModul.CRM, 'Müşteri talebi kaydedildi', interestId, '/crm');", "if (interest?.isActive) await this.notify(interest.customer.ownerId, 'CRM', interestId, interest,\n        `/crm?customerId=${encodeURIComponent(interest.customerId)}&interestId=${encodeURIComponent(interestId)}`);")
p=root/f; s=p.read_text(); start=s.index('  private notify('); end=s.index('  async getMatchScanConfig',start)
s=s[:start]+'''  private notify(userId: string, sourceType: 'REQUEST' | 'CRM', sourceId: string, record: any, actionUrl: string) {
    // Only matching criteria participate: notes, lastMatchedAt and updatedAt do not create reminders.
    const keys = ['type', 'city', 'district', 'neighborhood', 'budget', 'minBudget', 'maxBudget',
      'minArea', 'maxArea', 'minRoom', 'maxRoom', 'areas', 'propertyTypes', 'roomCounts', 'features',
      'cardProfileCriteria', 'priceCurrency', 'statuses', 'purchaseIntent', 'landSharePercent', 'tags'];
    const canonical = (value: any): any => Array.isArray(value)
      ? value.map(canonical).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
      : value && typeof value === 'object'
        ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
    const criteria = Object.fromEntries(keys.map(key => [key, canonical(record[key] ?? null)]));
    const hash = createHash('sha256').update(JSON.stringify(criteria)).digest('hex');
    return this.notifications.notify(userId, {
      type: 'MATCH_SCAN_REMINDER', priority: 'BILGI',
      title: 'Talebiniz için eşleşme taraması yapabilirsiniz',
      body: 'Güncel eşleşmeler için ilgili ekrandan PK ücretini onaylayarak tarama başlatabilirsiniz.',
      actionUrl, eventKey: `MATCH_SCAN_REMINDER:${sourceType}:${sourceId}:${hash}`,
    });
  }

'''+s[end:]; p.write_text(s,encoding='utf-8')
f=files[1]; edit(f,"import { Module }", "import { NotificationsModule } from '../notifications/notifications.module';\nimport { Module }"); edit(f,'    PrismaModule,','    PrismaModule,\n    NotificationsModule,')
f=files[3]; edit(f,'  private normalizeDistrict(','  normalizeDistrict(')
f=files[2]
edit(f,"...(demand.district ? { district: { equals: demand.district, mode: 'insensitive' as const } } : {})", "// District is filtered with the engine normalizer before the candidate limit.\n      ")
edit(f,"const max = Number(demand.maxBudget ?? demand.budget), min = Number(demand.minBudget);", "const max = Number(demand.maxBudget ?? demand.budget), min = Number(demand.minBudget);\n    const kat = demand.statuses?.includes('KAT_KARSILIGI') || demand.purchaseIntent === 'KAT_KARSILIGI';")
edit(f,"price: { gt: 0, ...(Number.isFinite(max) && max > 0 ? { lte: max } : {}), ...(Number.isFinite(min) && min > 0 ? { gte: min } : {}) },", "...(!kat ? { price: { gt: 0, ...(Number.isFinite(max) && max > 0 ? { lte: max } : {}), ...(Number.isFinite(min) && min > 0 ? { gte: min } : {}) } } : {}),")
# Cursor batches ensure districts excluded by normalization cannot exhaust the candidate limit.
edit(f,'    const units = await this.prisma.unit.findMany({ where:', '    const units: any[] = [];\n    let cursor: string | undefined;\n    for (;;) {\n      const batch = await this.prisma.unit.findMany({ where:')
edit(f,"orderBy: { id: 'asc' }, take: MAX_CANDIDATES + 1 });\n    this.checkLimit(units.length);", "orderBy: { id: 'asc' }, take: MAX_CANDIDATES + 1,\n      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) });\n      units.push(...batch.filter(unit => context.demands.some(demand => !demand.district ||\n        this.matchEngine.normalizeDistrict(demand.district, demand.city) ===\n        this.matchEngine.normalizeDistrict(unit.project.district, unit.project.city))));\n      this.checkLimit(units.length);\n      if (batch.length <= MAX_CANDIDATES) break;\n      cursor = batch[batch.length - 1].id;\n    }")
# CRM shared transaction support, preserving normal API behavior.
f=files[4]
edit(f,'  private async refreshInterestMatches(', '  async refreshInterestMatches(')
edit(f,'private async findCustomerForAccess(customerId: string, userId: string, userRole: Role) {\n    const customer = await this.prisma.customer.findUnique', 'private async findCustomerForAccess(customerId: string, userId: string, userRole: Role, db: Prisma.TransactionClient = this.prisma) {\n    const customer = await db.customer.findUnique')
edit(f,'async createCustomer(userId: string, data: any) {\n    await this.ensureActiveCrmCapacity(userId);','async createCustomer(userId: string, data: any, tx?: Prisma.TransactionClient) {\n    await this.ensureActiveCrmCapacity(userId, tx);')
edit(f,'return this.prisma.$transaction(async (transaction) => {\n      const customer', 'const persist = async (transaction: Prisma.TransactionClient) => {\n      const customer')
edit(f,'    });\n  }\n\n  async getCustomer(id:', '    };\n    return tx ? persist(tx) : this.prisma.$transaction(persist);\n  }\n\n  async getCustomer(id:')
edit(f,'async addCustomerInterest(customerId: string, userId: string, userRole: Role, data: any) {\n    await this.findCustomerForAccess(customerId, userId, userRole);\n\n    const interest = await this.prisma.customerInterest.create', 'async addCustomerInterest(customerId: string, userId: string, userRole: Role, data: any, tx?: Prisma.TransactionClient) {\n    await this.findCustomerForAccess(customerId, userId, userRole, tx);\n\n    const interest = await (tx || this.prisma).customerInterest.create')
edit(f,'    await this.refreshInterestMatches(interest);\n    return interest;', '    if (!tx) await this.refreshInterestMatches(interest);\n    return interest;')
f=files[7]
edit(f,'    const mukerrer = await this.findDuplicate(userId, a);\n\n    try {\n      const result = mukerrer\n        ? await this.addToExisting(mukerrer.id, userId, user.role, a)\n        : await this.createNew(userId, a);\n      await this.finish(draft.id, "KAYDEDILDI", { customerId: result.customerId, interestId: result.interestId });', '''    try {
      const { result, mukerrer } = await this.prisma.$transaction(async tx => {
        assertLinaBudget();
        const claimed = await tx.linaTaslak.updateMany({
          where: { id: draft.id, kullaniciId: userId, tur: TUR, durum: "ONAY_BEKLIYOR", gecerlilikTarihi: { gt: new Date() },
            alanlar: { equals: draft.alanlar as Prisma.InputJsonValue } },
          data: { durum: "ISLENIYOR" },
        });
        if (claimed.count !== 1) throw new Error("LINA_DRAFT_ALREADY_CONSUMED");
        const mukerrer = await this.findDuplicate(userId, a, tx);
        const result = mukerrer
          ? await this.addToExisting(mukerrer.id, userId, user.role, a, tx)
          : await this.createNew(userId, a, tx);
        assertLinaBudget();
        await this.finish(draft.id, "KAYDEDILDI", { customerId: result.customerId, interestId: result.interestId }, tx);
        return { result, mukerrer };
      });
      if (result.interestId) await this.crmService.refreshInterestMatches({ id: result.interestId, isActive: true });''')
edit(f,'return this.reply(`Kayıt oluşturulamadı: ${reason}\\nTaslağınız korunuyor.`, "crm_customer_create", true, draft.id);','return { ...this.reply("Kayıt oluşturulamadı. Lütfen taslağınızı kontrol edip tekrar deneyin.", "crm_customer_create", true, draft.id), success: false };')
edit(f,'private async createNew(userId: string, a: CrmTaslakAlanlari)', 'private async createNew(userId: string, a: CrmTaslakAlanlari, tx: Prisma.TransactionClient)')
edit(f,'    })) as { id: string; interests?', '    }, tx)) as { id: string; interests?')
edit(f,'a: CrmTaslakAlanlari) {\n    if (!isDemandRole', 'a: CrmTaslakAlanlari, tx: Prisma.TransactionClient) {\n    if (!isDemandRole')
edit(f,'    })) as { id?: string };', '    }, tx)) as { id?: string };')
edit(f,'private async findDuplicate(userId: string, a: CrmTaslakAlanlari)', 'private async findDuplicate(userId: string, a: CrmTaslakAlanlari, db: Prisma.TransactionClient = this.prisma)')
edit(f,'return this.prisma.customer.findFirst(', 'return db.customer.findFirst(')
edit(f,'sonSonuc?: Record<string, unknown>) {\n    await this.prisma.linaTaslak.update', 'sonSonuc?: Record<string, unknown>, db: Prisma.TransactionClient = this.prisma) {\n    await db.linaTaslak.update')
f=files[6]; edit(f,'        message: reason,','        message: "İşlem şu anda tamamlanamadı. Lütfen tekrar deneyin.",')

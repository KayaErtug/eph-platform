from pathlib import Path
import shutil
r=Path.cwd(); b=r/'_backup/EPH90'
def edit(f,o,n):
 p=r/f; s=p.read_text(encoding='utf-8'); assert o in s,(f,o[:70]); p.write_text(s.replace(o,n,1),encoding='utf-8')
fs=['src/coordination/coordination-recalculation.service.spec.ts','src/coordination/request-scan-access.spec.ts','src/lina/openai-tools/lina-openai-live-gateway.service.spec.ts','src/lina/draft/lina-draft.spec.ts','src/coordination/commercial-match-scan.service.spec.ts']
for f in fs:
 p=b/(f+'.bak-eph90'); p.parent.mkdir(parents=True,exist_ok=True); shutil.copy2(r/f,p)
f=fs[0]
edit(f,"networkPost: { findMany:","networkPost: { findUnique: jest.fn(async () => ({ isActive: true })), findMany:")
edit(f,"({ isActive: true, customer:","({ isActive: true, customerId: 'customer', customer:")
edit(f,'    return { db, crm, network, paid, service: new CoordinationRecalculationService(db, crm, network, paid) };','    const notifications: any = { notify: jest.fn(async () => ({})) };\n    return { db, crm, network, paid, notifications, service: new CoordinationRecalculationService(db, crm, network, paid, notifications) };')
edit(f,'expect(t.db.linaBildirim.create).toHaveBeenCalledTimes(2);','expect(t.notifications.notify).toHaveBeenCalledTimes(2); expect(t.db.linaBildirim.create).not.toHaveBeenCalled();')
edit(f,'t.db.linaBildirim.create.mock.calls[0][0].data.mesaj','t.notifications.notify.mock.calls[0][1].body')
f=fs[1]; edit(f,'{} as any, paid)', '{} as any, paid, {} as any)')
f=fs[2]; edit(f,'          configService,','          { readTimeoutMs: async () => 22000 } as any,\n          configService,')
f=fs[3]
edit(f,'        return row[k] === v;', '        if (v && typeof v === "object" && "equals" in v) return JSON.stringify(row[k]) === JSON.stringify(v.equals);\n        return row[k] === v;')
edit(f,'    return {\n      rows,','    const db: any = {\n      rows,')
edit(f,'      linaTaslak: {\n        findFirst:', '      linaTaslak: {\n        updateMany: async ({ where, data }: any) => { const selected = rows.filter(r => match(r, where)); selected.forEach(r => Object.assign(r, data)); return { count: selected.length }; },\n        findFirst:')
edit(f,'      customer: { findFirst: async () => null },\n    };','      customer: { findFirst: async () => null },\n    };\n    db.$transaction = async (work: any) => { const snapshot = structuredClone(rows); try { return await work(db); } catch (error) { rows.splice(0, rows.length, ...snapshot); throw error; } };\n    return db;')
edit(f,'      crm as never,','      { refreshInterestMatches: async () => undefined, ...crm } as never,')
f='src/lina/actions/lina-action-engine.service.ts'
p=r/f; s=p.read_text(encoding='utf-8')
for marker in ['    const post = await this.networkService.create','    const updated = (await this.crmService.updateCustomer','    const updated = (await this.crmService.updateStatus','    const task = await this.crmService.addTask','    const activity = (await this.crmService.addActivity','      await this.crmService.deleteCustomer','    const confirmationResult = await this.handlePendingConfirmation']:
 if marker in s: s=s.replace(marker,marker[:len(marker)-len(marker.lstrip())]+'assertLinaBudget();\n'+marker,1)
s=s.replace('    const activity = await this.crmService.addActivity','    assertLinaBudget();\n    const activity = await this.crmService.addActivity',1)
p.write_text(s,encoding='utf-8')
f='src/lina/draft/lina-draft-flow.service.ts'
edit(f,'? this.prisma.linaTaslak.update({ where: { id }, data })','? this.prisma.linaTaslak.update({ where: { id, durum: { in: ["AKTIF", "ONAY_BEKLIYOR"] } }, data })')
# No duplicate customer notification if delivery infrastructure fails after commit.
edit(f,'if (result.interestId) await this.crmService.refreshInterestMatches({ id: result.interestId, isActive: true });','if (result.interestId) await this.crmService.refreshInterestMatches({ id: result.interestId, isActive: true })\n        .catch(() => this.logger.warn("LINA_CRM_REMINDER_DEFERRED"));')

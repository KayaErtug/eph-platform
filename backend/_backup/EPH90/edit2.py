from pathlib import Path
root=Path.cwd()
def edit(f,old,new,count=1):
 p=root/f; s=p.read_text(encoding='utf-8'); assert s.count(old)>=count,(f,old[:100]); p.write_text(s.replace(old,new,count),encoding='utf-8')
f='src/lina/actions/lina-confirmation-gate.service.ts'
edit(f,'private async loadPlan(userId: string)', 'private async loadPlan(userId: string, sourceModule: LinaActionSourceModule)')
edit(f,'tur: PLAN_TUR, durum: "AKTIF", gecerlilikTarihi:', 'tur: PLAN_TUR, durum: "AKTIF", alanlar: { path: ["sourceModule"], equals: sourceModule }, gecerlilikTarihi:')
edit(f,'return row ? (row.alanlar as unknown as PendingConfirmationPlan) : null;', 'return row ? { ...(row.alanlar as unknown as PendingConfirmationPlan), id: row.id } : null;')
edit(f,'await this.dropPlan(plan.userId);','await this.dropPlan(plan.userId, plan.sourceModule);')
edit(f,'        kullaniciId: plan.userId,','        id: plan.id,\n        kullaniciId: plan.userId,')
edit(f,'private async dropPlan(userId: string): Promise<void>', 'private async dropPlan(userId: string, sourceModule: LinaActionSourceModule, id?: string): Promise<void>')
edit(f,'where: { kullaniciId: userId, tur: PLAN_TUR, durum: "AKTIF" },','where: { id, kullaniciId: userId, tur: PLAN_TUR, durum: "AKTIF", alanlar: { path: ["sourceModule"], equals: sourceModule } },')
edit(f,'    sourceModule: LinaActionSourceModule,\n  ): Promise<LinaConfirmationGateResult>', '    sourceModule: LinaActionSourceModule,\n    confirmationId?: string,\n  ): Promise<LinaConfirmationGateResult>',2)
edit(f,'this.evaluateAsync(rawMessage, userId, sourceModule)', 'this.evaluateAsync(rawMessage, userId, sourceModule, confirmationId)')
edit(f,'const pending = await this.loadPlan(userId);','''assertLinaBudget();
    const pending = await this.loadPlan(userId, sourceModule);
    if (this.isConfirmationWord(message) || this.isCancellationWord(message) || this.isRevisionWord(message)) {
      if (!pending || !confirmationId || pending.id !== confirmationId || pending.sourceModule !== sourceModule) {
        return { handled: true, success: false, requiresConfirmation: false,
          message: "Onay taslağı eşleşmedi veya süresi doldu. Lütfen işlemi yeniden hazırlayın." };
      }
    }''')
edit(f,'await this.dropPlan(userId);','await this.dropPlan(userId, sourceModule, pending?.id);',4)
edit(f,'          pending.stage = "FINAL";', '          const previous = { ...pending };\n          pending.stage = "FINAL";')
edit(f,'          await this.savePlan(pending);','''          const advanced = await this.prisma.linaTaslak.updateMany({
            where: { id: pending.id, kullaniciId: userId, tur: PLAN_TUR, durum: "AKTIF",
              gecerlilikTarihi: { gt: new Date() }, alanlar: { equals: previous as unknown as Prisma.InputJsonValue } },
            data: { alanlar: pending as unknown as Prisma.InputJsonValue, gecerlilikTarihi: new Date(pending.expiresAt) },
          });
          if (advanced.count !== 1) return { handled: true, success: false, message: "Bu onay zaten işlendi. Güncel taslağı kontrol edin." };''')
# Replace consume immediately before execution (other drops remain cancel/revise/new-command).
edit(f,'      await this.dropPlan(userId, sourceModule, pending?.id);\n\n      return {\n        handled: true,\n        success: true,\n        executeMessage:', '''      assertLinaBudget();
      const consumed = await this.prisma.linaTaslak.updateMany({
        where: { id: pending.id, kullaniciId: userId, tur: PLAN_TUR, durum: "AKTIF",
          gecerlilikTarihi: { gt: new Date() }, alanlar: { equals: pending as unknown as Prisma.InputJsonValue } },
        data: { durum: "KAPANDI" },
      });
      if (consumed.count !== 1) return { handled: true, success: false, requiresConfirmation: false,
        message: "Bu onay zaten işlendi. İşlem tekrar çalıştırılmadı." };

      return {
        handled: true,
        success: true,
        executeMessage:''')
f='src/lina/dto/lina-chat.dto.ts'
edit(f,'  @IsOptional()\n  @IsBoolean()', '  @IsOptional()\n  @IsString()\n  @MaxLength(100)\n  confirmationId?: string;\n\n  @IsOptional()\n  @IsBoolean()')
f='src/lina/lina.controller.ts'
edit(f,'    private readonly linaService:', '    private readonly chatBudget: LinaChatBudgetService,\n    private readonly linaService:')
edit(f,'    if (this.linaTemporarilyDisabled) {\n      return {\n        success: false,', '    return this.chatBudget.run(() => this.chatWithinBudget(body, request));\n  }\n\n  private async chatWithinBudget(body: LinaChatDto, request: RequestWithUser) {\n    if (this.linaTemporarilyDisabled) {\n      return {\n        success: false,')
edit(f,'        sourceModule,\n      );\n\n      if (gateResult', '        sourceModule,\n        body.confirmationId,\n      );\n\n      if (gateResult')
# Check budget after slow async scope work and before mutation engines.
edit(f,'    const actionResult = await', '    assertLinaBudget();\n    const actionResult = await')
edit(f,'    // CRM müşteri/talep taslağı:', '    assertLinaBudget();\n    // CRM müşteri/talep taslağı:')
edit(f,'import { JwtAuthGuard }', 'import { LinaChatBudgetService, assertLinaBudget } from "./lina-chat-budget.service";\nimport { JwtAuthGuard }')
f='src/lina/lina.module.ts'
edit(f,'import { Module }','import { LinaChatBudgetService } from "./lina-chat-budget.service";\nimport { Module }')
edit(f,'    LinaService,\n    LinaScopeService,','    LinaService,\n    LinaChatBudgetService,\n    LinaScopeService,')
for f in ['src/lina/actions/lina-confirmation-gate.service.ts','src/lina/draft/lina-draft-flow.service.ts','src/lina/actions/lina-action-engine.service.ts']:
 p=root/f; s=p.read_text(encoding='utf-8'); s='import { assertLinaBudget } from "../lina-chat-budget.service";\n'+s; p.write_text(s,encoding='utf-8')
f='src/lina/actions/lina-action-engine.service.ts'
# Before dispatch and after asynchronous pending reads.
edit(f,'      if (this.isCrmCustomerUpdateCommand(message))', '      assertLinaBudget();\n      if (this.isCrmCustomerUpdateCommand(message))')
f='src/lina/openai-tools/lina-openai-client.service.ts'
edit(f,'          signal: controller.signal,','          signal: linaFetchSignal(controller.signal),')
edit(f,'import { Injectable', 'import { linaFetchSignal } from "../lina-chat-budget.service";\nimport { Injectable')
f='src/lina/openai-tools/lina-openai-live-gateway.service.ts'
edit(f,'import { Injectable', 'import { LinaChatBudgetService, linaFetchSignal, assertLinaBudget } from "../lina-chat-budget.service";\nimport { Injectable')
edit(f,'  constructor(\n','  constructor(\n    private readonly budget: LinaChatBudgetService,\n')
edit(f,'    const apiKey =','    assertLinaBudget();\n    const timeoutMs = await this.budget.readTimeoutMs();\n    assertLinaBudget();\n    const apiKey =')
edit(f,'        method: "POST",','        method: "POST",\n        signal: linaFetchSignal(AbortSignal.timeout(timeoutMs)),')
f='src/lina/lina.service.ts'
edit(f,'import {', 'import { LinaChatBudgetService, linaFetchSignal } from "./lina-chat-budget.service";\nimport {')
# Avoid constructor change by using its existing prisma dependency.
edit(f,'    const response = await fetch(', '    const timeoutMs = await new LinaChatBudgetService(this.prisma).readTimeoutMs();\n    const response = await fetch(')
edit(f,'        method: "POST",','        method: "POST",\n        signal: linaFetchSignal(AbortSignal.timeout(timeoutMs)),')

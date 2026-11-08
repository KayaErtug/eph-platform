from pathlib import Path
root=Path.cwd()
def edit(f,old,new):
 p=root/f; s=p.read_text(encoding='utf-8'); assert old in s,(f,old); p.write_text(s.replace(old,new,1),encoding='utf-8')
f='src/lina/openai-tools/lina-openai-client.service.ts'
p=root/f; p.write_text('import { linaFetchSignal } from "../lina-chat-budget.service";\n'+p.read_text(encoding='utf-8'),encoding='utf-8')
f='src/lina/openai-tools/lina-openai-live-gateway.service.ts'
edit(f,'import { Injectable', 'import { LinaChatBudgetService, linaFetchSignal, assertLinaBudget } from "../lina-chat-budget.service";\nimport { Injectable')
edit(f,'  constructor(\n','  constructor(\n    private readonly budget: LinaChatBudgetService,\n')
edit(f,'    const apiKey =','    assertLinaBudget();\n    const timeoutMs = await this.budget.readTimeoutMs();\n    assertLinaBudget();\n    const apiKey =')
edit(f,'        method: "POST",','        method: "POST",\n        signal: linaFetchSignal(AbortSignal.timeout(timeoutMs)),')
f='src/lina/lina.service.ts'
edit(f,'import {', 'import { LinaChatBudgetService, linaFetchSignal } from "./lina-chat-budget.service";\nimport {')
edit(f,'    const response = await fetch(', '    const timeoutMs = await new LinaChatBudgetService(this.prisma).readTimeoutMs();\n    const response = await fetch(')
edit(f,'        method: "POST",','        method: "POST",\n        signal: linaFetchSignal(AbortSignal.timeout(timeoutMs)),')

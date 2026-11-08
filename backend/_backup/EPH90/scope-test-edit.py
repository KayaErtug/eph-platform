from pathlib import Path
import shutil
p=Path('src/lina/lina-scope.service.spec.ts'); b=Path('_backup/EPH90')/(str(p)+'.bak-eph90'); b.parent.mkdir(parents=True,exist_ok=True); shutil.copy2(p,b)
s=p.read_text(encoding='utf-8'); s='import { LinaChatBudgetService } from "./lina-chat-budget.service";\n'+s
s=s.replace('const controller = Object.create(LinaController.prototype) as LinaController;', '''const controller = Object.create(LinaController.prototype) as LinaController;
    Object.assign(controller, { chatBudget: new LinaChatBudgetService({ systemSetting: { findUnique: async () => ({ valueJson: 22000 }) } } as never) });''')
p.write_text(s,encoding='utf-8')

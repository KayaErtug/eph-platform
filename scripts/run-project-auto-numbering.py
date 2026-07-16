from pathlib import Path
import runpy

page = Path("frontend/src/app/proje-satis-sablonu/page.tsx").read_text(encoding="utf-8-sig")
types = Path("frontend/src/app/proje-satis-sablonu/lib/projectSalesTypes.ts").read_text(encoding="utf-8-sig")
backend = Path("backend/src/project-sales/project-sales-inventory.service.ts").read_text(encoding="utf-8-sig")

already_applied = (
    'ProjectNumberingMode' in types
    and 'ProjectInventoryNumberingPanel' in page
    and 'projectNumberingMode(value: unknown)' in backend
)

if already_applied:
    print("Project automatic numbering patch is already applied.")
else:
    runpy.run_path("scripts/apply-project-auto-numbering.py", run_name="__main__")

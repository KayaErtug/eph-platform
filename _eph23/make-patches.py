from pathlib import Path
import difflib, hashlib, json, shutil
root = Path('D:/Projects/SM')
out = root / '_eph23/paket'
groups = {
 'eph23.patch': [('backend/src/lina/lina.module.ts', root/'backend/src/lina/lina.module.ts', 'lina/lina.module.ts'), ('backend/src/project-sales/project-sales-launch.service.ts', root/'backend/src/project-sales/project-sales-launch.service.ts', 'project-sales/project-sales-launch.service.ts')],
 'eph23-frontend.patch': [('frontend/src/app/proje-sunum/[token]/page.tsx', root/'frontend/src/app/proje-sunum/[token]/page.tsx', 'src/app/proje-sunum/[token]/page.tsx'), ('frontend/src/components/EPHMobileShell.tsx', root/'frontend/src/components/EPHMobileShell.tsx', 'src/components/EPHMobileShell.tsx')],
 'eph23-mobile.patch': [('mobile/src/app/project-sales/[id]/launch.tsx', Path('D:/Projects/eph-mobile-final/src/app/project-sales/[id]/launch.tsx'), 'src/app/project-sales/[id]/launch.tsx')]
}
manifest=[]
for name, files in groups.items():
    patch=[]
    for backup_rel, target, relative in files:
        backup=root/'_eph23/yedek'/(backup_rel+'.bak')
        old=backup.read_text(encoding='utf-8')
        new=target.read_text(encoding='utf-8')
        patch.extend(difflib.unified_diff(old.splitlines(True),new.splitlines(True),fromfile='a/'+relative,tofile='b/'+relative))
        base=root/'_eph23/check'/name.removesuffix('.patch')/relative
        base.parent.mkdir(parents=True,exist_ok=True)
        shutil.copyfile(backup,base)
        manifest.append({'file':str(target),'backup':str(backup),'baseline_sha256':hashlib.sha256(backup.read_bytes()).hexdigest(),'final_sha256':hashlib.sha256(target.read_bytes()).hexdigest()})
    (out/name).write_bytes(''.join(patch).encode('utf-8'))
(out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
print('3 unified diff yaması ve SHA256 manifest hazır; başlangıç = görev öncesi yedekler.')

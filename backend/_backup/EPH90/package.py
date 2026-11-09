from pathlib import Path
import tarfile, hashlib, json
root=Path.cwd(); b=root/'_backup/EPH90'
paths=(b/'changed-files.txt').read_text(encoding='utf-8').splitlines()+['src/lina/lina-chat-budget.service.ts','prisma/migrations/20261031120000_eph90_lina_chat_budget/migration.sql']
assert all(not any(x in f for x in ['.spec.ts','.md','.bak']) for f in paths)
assert all((root/f).is_file() for f in paths)
archive=b/'EPH90_DEPLOY.tgz'
with tarfile.open(archive,'w:gz') as tar:
 for f in paths: tar.add(root/f,arcname=f,recursive=False)
with tarfile.open(archive,'r:gz') as tar:
 members=tar.getmembers(); assert [m.name for m in members]==paths
 for m in members: assert tar.extractfile(m).read()==(root/m.name).read_bytes()
manifest='\n'.join(paths)+'\n'; (b/'EPH90_DEPLOY_FILES.txt').write_text(manifest,encoding='utf-8')
sha=hashlib.sha256(archive.read_bytes()).hexdigest(); (b/'EPH90_DEPLOY.sha256').write_text(sha+'  EPH90_DEPLOY.tgz\n',encoding='utf-8')
print(json.dumps({'archive':str(archive),'files':len(paths),'bytes':archive.stat().st_size,'sha256':sha,'verified':'archive bytes match workspace; no specs/md/backups'},ensure_ascii=False))
print(manifest)

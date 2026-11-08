from pathlib import Path
import tarfile, hashlib, json
root=Path.cwd(); b=root/'_backup/EPH91B'
files=['src/lina/lina.controller.ts','src/lina/actions/lina-confirmation-gate.service.ts','src/lina/actions/lina-action-engine.service.ts']
archive=b/'EPH91B_DEPLOY.tgz'
with tarfile.open(archive,'w:gz') as tar:
 for name in files: tar.add(root/name,arcname=name,recursive=False)
with tarfile.open(archive,'r:gz') as tar:
 assert tar.getnames()==files
 for member in tar.getmembers():
  assert not any(suffix in member.name for suffix in ('.spec.ts','.md','.bak'))
  assert tar.extractfile(member).read()==(root/member.name).read_bytes()
sha=hashlib.sha256(archive.read_bytes()).hexdigest()
(b/'EPH91B_DEPLOY_FILES.txt').write_text('\n'.join(files)+'\n',encoding='utf-8')
(b/'EPH91B_DEPLOY.sha256').write_text(sha+'  EPH91B_DEPLOY.tgz\n',encoding='utf-8')
print(json.dumps({'package':str(archive),'fileCount':len(files),'bytes':archive.stat().st_size,'sha256':sha,'verified':True}))

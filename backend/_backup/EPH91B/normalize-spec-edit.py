from pathlib import Path
p=Path('src/lina/lina-scope.service.spec.ts'); backup=Path('_backup/EPH91B/src/lina/lina-scope.service.spec.ts.bak-eph91b')
s=backup.read_bytes(); old=b"'crm', undefined);"; assert s.count(old)==1; p.write_bytes(s.replace(old,b"'crm', undefined, undefined);"))

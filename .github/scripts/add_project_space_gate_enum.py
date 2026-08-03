from pathlib import Path

path = Path("backend/prisma/schema.prisma")
text = path.read_text(encoding="utf-8")

if "  GIRIS_KAPISI_KEMERI\n" not in text:
    old = "  SUS_HAVUZU\n  DIGER\n}"
    new = "  SUS_HAVUZU\n  GIRIS_KAPISI_KEMERI\n  DIGER\n}"
    count = text.count(old)
    if count != 1:
        raise RuntimeError(
            f"ProjectSpaceType enum insertion point expected once, found {count}"
        )
    text = text.replace(old, new, 1)
    path.write_text(text, encoding="utf-8")

print("ProjectSpaceType gate arch enum ensured.")

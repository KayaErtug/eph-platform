#!/usr/bin/env bash
set -Eeuo pipefail

TEST_DIR="${TEST_DIR:-/var/www/eph-coordination-test}"
TEST_DATABASE_URL="${TEST_DATABASE_URL:-}"
ROLLBACK_DATABASE_URL="${ROLLBACK_DATABASE_URL:-}"
BACKUP_DIR="${BACKUP_DIR:-$TEST_DIR/.rollout-backups}"

fail() { echo "HATA: $*" >&2; exit 1; }
[[ -n "$TEST_DATABASE_URL" ]] || fail "TEST_DATABASE_URL zorunludur."
[[ -n "$ROLLBACK_DATABASE_URL" ]] || fail "ROLLBACK_DATABASE_URL zorunludur ve boş bir prova veritabanını göstermelidir."
[[ "$TEST_DATABASE_URL" != "$ROLLBACK_DATABASE_URL" ]] || fail "Test ve geri dönüş veritabanı aynı olamaz."
[[ -d "$TEST_DIR/backend/prisma" ]] || fail "Prisma dizini bulunamadı."
command -v pg_dump >/dev/null || fail "pg_dump bulunamadı."
command -v pg_restore >/dev/null || fail "pg_restore bulunamadı."
command -v psql >/dev/null || fail "psql bulunamadı."

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_FILE="$BACKUP_DIR/eph_test_before_coordination_${STAMP}.dump"

echo "1/5 Test veritabanı yedekleniyor..."
pg_dump --format=custom --no-owner --no-privileges --dbname="$TEST_DATABASE_URL" --file="$BACKUP_FILE"

echo "2/5 Migration durumu kontrol ediliyor..."
(
  cd "$TEST_DIR/backend"
  DATABASE_URL="$TEST_DATABASE_URL" npx prisma migrate status
)

echo "3/5 Migration yalnız test veritabanına uygulanıyor..."
(
  cd "$TEST_DIR/backend"
  DATABASE_URL="$TEST_DATABASE_URL" npx prisma migrate deploy
)

echo "4/5 Koordinasyon tablosu doğrulanıyor..."
psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -Atc \
  "SELECT CASE WHEN to_regclass('public.\"EphCoordinationLink\"') IS NOT NULL THEN 'OK' ELSE 'MISSING' END;" | grep -qx OK

echo "5/5 Yedekten boş geri dönüş veritabanına dönüş provası yapılıyor..."
pg_restore --clean --if-exists --no-owner --no-privileges --dbname="$ROLLBACK_DATABASE_URL" "$BACKUP_FILE"

SOURCE_TABLES="$(psql "$TEST_DATABASE_URL" -Atc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';")"
RESTORED_TABLES="$(psql "$ROLLBACK_DATABASE_URL" -Atc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';")"
[[ "$SOURCE_TABLES" -eq "$RESTORED_TABLES" ]] || fail "Geri dönüş prova tablosu sayısı uyuşmuyor: source=$SOURCE_TABLES restored=$RESTORED_TABLES"

echo "Migration ve geri dönüş provası başarılı. Yedek: $BACKUP_FILE"

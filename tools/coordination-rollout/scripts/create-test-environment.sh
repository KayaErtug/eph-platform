#!/usr/bin/env bash
set -Eeuo pipefail

REPO_DIR="${REPO_DIR:-/var/www/eph}"
TEST_DIR="${TEST_DIR:-/var/www/eph-coordination-test}"
BRANCH="${BRANCH:-agent/eph-five-module-sync-v1}"
BACKEND_ENV_SOURCE="${BACKEND_ENV_SOURCE:-}"
FRONTEND_ENV_SOURCE="${FRONTEND_ENV_SOURCE:-}"

fail() { echo "HATA: $*" >&2; exit 1; }
[[ -d "$REPO_DIR/.git" ]] || fail "Git deposu bulunamadı: $REPO_DIR"
[[ ! -e "$TEST_DIR" ]] || fail "Test dizini zaten var: $TEST_DIR"
[[ -f "$BACKEND_ENV_SOURCE" ]] || fail "BACKEND_ENV_SOURCE test ortamı dosyasını göstermelidir. Üretim .env dosyasını kullanmayın."
[[ -f "$FRONTEND_ENV_SOURCE" ]] || fail "FRONTEND_ENV_SOURCE test ortamı dosyasını göstermelidir. Üretim .env dosyasını kullanmayın."

echo "Test worktree hazırlanıyor: $TEST_DIR"
git -C "$REPO_DIR" fetch origin "$BRANCH"
git -C "$REPO_DIR" worktree add --detach "$TEST_DIR" "origin/$BRANCH"

install -m 600 "$BACKEND_ENV_SOURCE" "$TEST_DIR/backend/.env"
install -m 600 "$FRONTEND_ENV_SOURCE" "$TEST_DIR/frontend/.env.local"

(
  cd "$TEST_DIR/backend"
  npm ci
  npm run build
)
(
  cd "$TEST_DIR/frontend"
  npm ci
  npm run build
)

echo "Test ortamı hazır. Canlı servisler değiştirilmedi."
echo "Sonraki komut: TEST_DIR='$TEST_DIR' ./tools/coordination-rollout/scripts/start-test-environment.sh"

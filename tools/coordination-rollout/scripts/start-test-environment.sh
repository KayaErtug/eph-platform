#!/usr/bin/env bash
set -Eeuo pipefail

TEST_DIR="${TEST_DIR:-/var/www/eph-coordination-test}"
BACKEND_PORT="${BACKEND_PORT:-3101}"
FRONTEND_PORT="${FRONTEND_PORT:-3100}"

[[ -f "$TEST_DIR/backend/dist/main.js" ]] || { echo "Backend build bulunamadı." >&2; exit 1; }
[[ -d "$TEST_DIR/frontend/.next" ]] || { echo "Frontend build bulunamadı." >&2; exit 1; }
command -v pm2 >/dev/null || { echo "pm2 bulunamadı." >&2; exit 1; }

PORT="$BACKEND_PORT" pm2 start "$TEST_DIR/backend/dist/main.js" \
  --name eph-coordination-test-backend \
  --cwd "$TEST_DIR/backend" \
  --update-env

pm2 start npm \
  --name eph-coordination-test-frontend \
  --cwd "$TEST_DIR/frontend" \
  -- start -- -p "$FRONTEND_PORT"

pm2 save
pm2 status eph-coordination-test-backend eph-coordination-test-frontend

echo "Test servisleri başlatıldı: frontend=$FRONTEND_PORT backend=$BACKEND_PORT"

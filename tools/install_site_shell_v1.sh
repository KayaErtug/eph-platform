#!/usr/bin/env bash
set -u

ROOT="/var/www/eph"
TARGET="$ROOT/frontend/src/app/proje-satis-sablonu/3d/[projectId]/Project3DStudioClient.tsx"
PY_SCRIPT="/tmp/apply_site_shell_v1.py"
ROLLBACK="/tmp/Project3DStudioClient.pre-site-shell.tsx"
LOG="$ROOT/CHAT_CIKTI.txt"
BUILD_LOG="$ROOT/FRONTEND_BUILD_LOG.txt"

cd "$ROOT" || exit 1
cp "$TARGET" "$ROLLBACK"
: > "$LOG"

{
  echo "=== SITE KABUĞU V1 KURULUMU ==="
  echo
} >> "$LOG"

git show FETCH_HEAD:tools/apply_site_shell_v1.py > "$PY_SCRIPT" 2>> "$LOG"
if [ $? -ne 0 ]; then
  echo "FINAL_STATUS=1" >> "$LOG"
  echo "Python kurulum scripti alınamadı." >> "$LOG"
  echo "TAMAMLANDI"
  exit 1
fi

python3 "$PY_SCRIPT" >> "$LOG" 2>&1
PATCH_STATUS=$?

if [ $PATCH_STATUS -ne 0 ]; then
  cp "$ROLLBACK" "$TARGET"
  echo >> "$LOG"
  echo "PATCH_STATUS=$PATCH_STATUS" >> "$LOG"
  echo "FINAL_STATUS=1" >> "$LOG"
  echo "Kaynak dosya otomatik geri alındı." >> "$LOG"
  echo "TAMAMLANDI"
  exit 1
fi

cd "$ROOT" || exit 1
git diff --check >> "$LOG" 2>&1
DIFF_STATUS=$?

if [ $DIFF_STATUS -ne 0 ]; then
  cp "$ROLLBACK" "$TARGET"
  echo >> "$LOG"
  echo "DIFF_STATUS=$DIFF_STATUS" >> "$LOG"
  echo "FINAL_STATUS=1" >> "$LOG"
  echo "Diff kontrolü başarısız; kaynak dosya otomatik geri alındı." >> "$LOG"
  echo "TAMAMLANDI"
  exit 1
fi

cd "$ROOT/frontend" || exit 1
npm run build > "$BUILD_LOG" 2>&1
BUILD_STATUS=$?

if [ $BUILD_STATUS -ne 0 ]; then
  cp "$ROLLBACK" "$TARGET"
  cd "$ROOT/frontend" || exit 1
  npm run build >> "$BUILD_LOG" 2>&1
  ROLLBACK_BUILD_STATUS=$?
  {
    echo
    echo "DIFF_STATUS=$DIFF_STATUS"
    echo "FRONTEND_BUILD_STATUS=$BUILD_STATUS"
    echo "ROLLBACK_BUILD_STATUS=$ROLLBACK_BUILD_STATUS"
    echo "FINAL_STATUS=1"
    echo "Yeni kod build edilemedi; kaynak dosya otomatik geri alındı."
    echo
    echo "=== BUILD SON 80 SATIR ==="
    tail -n 80 "$BUILD_LOG"
  } >> "$LOG"
  echo "TAMAMLANDI"
  exit 1
fi

pm2 restart eph-frontend >> "$LOG" 2>&1
PM2_STATUS=$?

{
  echo
  echo "PATCH_STATUS=$PATCH_STATUS"
  echo "DIFF_STATUS=$DIFF_STATUS"
  echo "FRONTEND_BUILD_STATUS=$BUILD_STATUS"
  echo "PM2_RESTART_STATUS=$PM2_STATUS"
  echo "FINAL_STATUS=$PM2_STATUS"
  echo
  if [ $PM2_STATUS -eq 0 ]; then
    echo "SITE KABUĞU V1 BAŞARIYLA CANLIYA ALINDI."
  else
    echo "Kod ve build başarılı; PM2 yeniden başlatma kontrol edilmelidir."
  fi
} >> "$LOG"

echo "TAMAMLANDI"

#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="/var/www/eph"

cd "$ROOT_DIR"

echo "=== EPH 3D STUDIO DEPLOY BASLADI ==="

git checkout main
git pull --ff-only origin main

echo "=== BACKEND ==="
cd "$ROOT_DIR/backend"
npm ci
npx prisma migrate deploy
npm run build
pm2 restart eph-backend

echo "=== FRONTEND ==="
cd "$ROOT_DIR/frontend"
npm ci
rm -rf .next
npm run build
pm2 restart eph-frontend

echo "=== SERVIS DURUMU ==="
pm2 status

echo "=== EPH 3D STUDIO DEPLOY BASARILI ==="
echo "Canli adres: https://emlakportfoyhavuzu.com/proje-satis-sablonu/3d"

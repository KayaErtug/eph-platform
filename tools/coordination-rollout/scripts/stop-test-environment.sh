#!/usr/bin/env bash
set -Eeuo pipefail
pm2 delete eph-coordination-test-backend 2>/dev/null || true
pm2 delete eph-coordination-test-frontend 2>/dev/null || true
pm2 save
echo "Geçici koordinasyon test servisleri durduruldu."

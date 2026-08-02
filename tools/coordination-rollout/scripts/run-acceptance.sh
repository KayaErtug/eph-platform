#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "$0")/.."
node src/preflight.mjs
node src/smoke.mjs
node src/security.mjs
node src/load.mjs

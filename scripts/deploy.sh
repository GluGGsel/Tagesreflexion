#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/opt/tagesreflexion"
BRANCH="main"

echo "== Tagesreflexion Deploy =="

cd "$APP_DIR"

echo "[0/4] Checkout $BRANCH"
git fetch origin --prune
git checkout "$BRANCH"

echo "[1/4] Git pull (origin/$BRANCH)"
git pull --rebase origin "$BRANCH"

echo "[2/4] Dependencies installieren"
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

echo "[3/4] Build"
npm run build

echo "[4/4] Service Neustart"
systemctl restart tagesreflexion || true
systemctl status tagesreflexion --no-pager -l || true

echo "Deploy abgeschlossen."

#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/tagesreflexion}"
SERVICE_NAME="${SERVICE_NAME:-tagesreflexion}"

if [[ ! -d "$APP_DIR" ]]; then
  echo "APP_DIR existiert nicht: $APP_DIR"
  exit 1
fi

cd "$APP_DIR"

echo "[1/5] Git pull"
git pull --rebase

echo "[2/5] Install dependencies"
npm ci

echo "[3/5] Build"
npm run build

echo "[4/5] Restart service"
systemctl restart "${SERVICE_NAME}.service"

echo "[5/5] Status"
systemctl --no-pager --full status "${SERVICE_NAME}.service" || true

echo "Deploy fertig."

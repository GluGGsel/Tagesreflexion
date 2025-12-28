#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/tagesreflexion}"
SERVICE_NAME="${SERVICE_NAME:-tagesreflexion}"

echo "== Tagesreflexion Deploy =="

if [[ ! -d "$APP_DIR" ]]; then
  echo "FEHLER: APP_DIR existiert nicht: $APP_DIR"
  exit 1
fi

cd "$APP_DIR"

echo "[1/4] Git pull"
git pull --rebase

echo "[2/4] Dependencies installieren"
if [[ -f package-lock.json ]]; then
  echo "package-lock.json gefunden → npm ci"
  npm ci
else
  echo "kein package-lock.json → npm install"
  npm install
fi

echo "[3/4] Build"
npm run build

echo "[4/4] Service Neustart"
systemctl restart "${SERVICE_NAME}.service"

echo
echo "Deploy abgeschlossen."
systemctl --no-pager --full status "${SERVICE_NAME}.service" || true

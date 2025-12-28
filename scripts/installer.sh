#!/usr/bin/env bash
set -euo pipefail

# ===== Konfiguration (anpassen) =====
REPO_URL="${REPO_URL:-https://github.com/DEIN_USER/Tagesreflexion.git}"
APP_DIR="${APP_DIR:-/opt/tagesreflexion}"
SERVICE_NAME="${SERVICE_NAME:-tagesreflexion}"
# ====================================

echo "== Tagesreflexion Installer =="

echo "[1/7] Pakete installieren"
apt update
apt install -y git curl ca-certificates build-essential

echo "[2/7] Node.js installieren (Node 20 LTS via NodeSource)"
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
fi

echo "[3/7] Repo klonen oder updaten"
if [[ -d "$APP_DIR/.git" ]]; then
  cd "$APP_DIR"
  git pull --rebase
else
  rm -rf "$APP_DIR"
  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

echo "[4/7] npm dependencies installieren"
npm ci

echo "[5/7] Build"
npm run build

echo "[6/7] systemd Service installieren"
cp -f "$APP_DIR/systemd/${SERVICE_NAME}.service" "/etc/systemd/system/${SERVICE_NAME}.service"
systemctl daemon-reload
systemctl enable "${SERVICE_NAME}.service"

echo "[7/7] Start Service"
systemctl restart "${SERVICE_NAME}.service"
systemctl --no-pager --full status "${SERVICE_NAME}.service" || true

echo "Installation fertig."
echo "App läuft auf: http://<LXC-IP>:3000 (z.B. /mann oder /frau)"

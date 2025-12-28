#!/usr/bin/env bash
set -euo pipefail

# ===== Konfiguration (anpassen oder per ENV überschreiben) =====
REPO_URL="${REPO_URL:-https://github.com/DEIN_GITHUB_USER/Tagesreflexion.git}"
APP_DIR="${APP_DIR:-/opt/tagesreflexion}"
SERVICE_NAME="${SERVICE_NAME:-tagesreflexion}"
# =============================================================

echo "== Tagesreflexion Installer =="

echo "[1/7] System vorbereiten"
apt update
apt install -y git curl ca-certificates build-essential

echo "[2/7] Node.js installieren (20 LTS)"
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
fi

node -v
npm -v

echo "[3/7] Repository klonen oder aktualisieren"
if [[ -d "$APP_DIR/.git" ]]; then
  cd "$APP_DIR"
  git pull --rebase
else
  rm -rf "$APP_DIR"
  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

echo "[4/7] npm dependencies installieren"
if [[ -f package-lock.json ]]; then
  echo "package-lock.json gefunden → npm ci"
  npm ci
else
  echo "kein package-lock.json → npm install (erstellt Lockfile)"
  npm install
fi

echo "[5/7] Build"
npm run build

echo "[6/7] systemd Service installieren"
cp -f "$APP_DIR/systemd/${SERVICE_NAME}.service" "/etc/systemd/system/${SERVICE_NAME}.service"
systemctl daemon-reload
systemctl enable "${SERVICE_NAME}.service"

echo "[7/7] Service starten"
systemctl restart "${SERVICE_NAME}.service"

echo
echo "== Installation abgeschlossen =="
echo "App erreichbar unter:"
echo "  http://<LXC-IP>:3000/mann"
echo "  http://<LXC-IP>:3000/frau"

#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/opt/tagesreflexion"
BRANCH_PRIVATE="private"

echo "== Tagesreflexion Deploy =="

cd "$APP_DIR"

echo "[0/5] Sicherstellen: auf Branch $BRANCH_PRIVATE"
git fetch origin --prune
git fetch upstream --prune || true

# Branch anlegen falls nicht vorhanden
if ! git show-ref --verify --quiet "refs/heads/${BRANCH_PRIVATE}"; then
  git checkout -b "$BRANCH_PRIVATE"
else
  git checkout "$BRANCH_PRIVATE"
fi

echo "[1/5] Private Repo pull (origin/$BRANCH_PRIVATE)"
git pull --rebase origin "$BRANCH_PRIVATE"

echo "[2/5] Public Updates einarbeiten (upstream/main -> rebase)"
# upstream kann fehlen, falls nicht konfiguriert
if git remote | grep -q '^upstream$'; then
  git fetch upstream --prune
  git rebase upstream/main
else
  echo "WARN: upstream remote fehlt, überspringe Public-Rebase."
fi

echo "[3/5] Dependencies installieren"
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

echo "[4/5] Build"
npm run build

echo "[5/5] Service Neustart"
systemctl restart tagesreflexion || true
systemctl status tagesreflexion --no-pager -l || true

echo "Deploy abgeschlossen."

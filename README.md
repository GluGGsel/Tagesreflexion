# Tagesreflexion

Heimserver-App (LXC Ubuntu) für tägliche Reflexion:
- /mann und /frau
- 5 Felder pro Person (4 Pflicht + 1 optional -> To talk about)
- Gemeinsame To talk about Liste (älteste oben, abhakbar, synchron)
- Nächster Tag nur wenn beide Pflichtfelder ausgefüllt haben
- Auto-Refresh alle 60s
- SQLite lokal (data/tagesreflexion.sqlite)
- iOS Homescreen Icon via apple-touch-icon

## Installer:

sudo bash scripts/installer.sh


Deploy (nach Änderungen im Repo):

sudo bash scripts/deploy.sh

Icons ersetzen

Ersetze PNGs in:

public/icons/apple-touch-icon.png (180x180)

public/icons/icon-192.png

public/icons/icon-512.png


---

# Was du danach tust (kurz & praktisch)

1) Repo auf GitHub anlegen: `Tagesreflexion`
2) Inhalte so ablegen wie oben
3) Commit + push
4) Auf dem LXC:
   ```bash
   sudo bash scripts/installer.sh


(vorher REPO_URL in der Datei setzen oder als Env mitgeben)

Auf iOS: Safari → URL öffnen (/mann oder /frau) → Teilen → „Zum Home-Bildschirm“

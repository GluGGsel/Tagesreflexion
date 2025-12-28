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

---

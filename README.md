# Tagesreflexion

Minimalistische Heimserver-App (LXC Ubuntu) für tägliche Reflexion zu zweit.

- Zwei Seiten: `/mann` und `/frau`
- 5 Felder pro Person/Tag  
  - **Pflicht:** 1–4  
  - **Optional:** Feld 5 → erzeugt Einträge in **To talk about**
- **To talk about** (gemeinsam)
  - älteste Einträge oben
  - Ersteller wird angezeigt (Mann/Frau)
  - **abhakbar für beide** (wenn einer abhakt, ist es beim anderen sofort weg)
  - beim **„Nächster Tag“**:
    - abgehakte Punkte verschwinden endgültig
    - offene Punkte werden in den nächsten Tag übernommen
- **„Nächster Tag“** ist nur aktiv, wenn beide Pflichtfelder (1–4) ausgefüllt haben
- Auto-Refresh alle 60 Sekunden (ohne dir beim Tippen reinzufunken)
- Lokale Datenhaltung via **SQLite** (liegt unter `data/`)
- iOS Home-Screen Icon via `apple-touch-icon` + `manifest.webmanifest`

---

## Voraussetzungen (LXC Ubuntu)

- Ubuntu (empfohlen 22.04/24.04)
- Ausgehender Internetzugang für `apt` + `git clone`
- Optional: statische IP im Heimnetz oder DHCP-Reservation

---

## Installation im LXC (CLI)

### 1) Repo klonen

> Ersetze `<DEIN_GITHUB_USER>` durch deinen GitHub-User/Org.

```bash
sudo apt update
sudo apt install -y git
cd /opt
sudo git clone https://github.com/<DEIN_GITHUB_USER>/Tagesreflexion.git tagesreflexion
cd /opt/tagesreflexion
```

### 2) Installer starten

Der Installer installiert Node.js (20 LTS), Dependencies, baut die App und richtet einen systemd Service ein.

**Variante A (empfohlen): Repo-URL per ENV setzen**
```bash
sudo REPO_URL="https://github.com/GluGGsel/Tagesreflexion.git" bash scripts/installer.sh
```

**Variante B: Repo-URL direkt in `scripts/installer.sh` eintragen**
- Datei öffnen und `REPO_URL=...` anpassen
- dann ausführen:
```bash
sudo bash scripts/installer.sh
```

Nach der Installation läuft die App auf:

- `http://<LXC-IP>:3000/mann`
- `http://<LXC-IP>:3000/frau`

---

## Update / Live Deploy (nach `git push`)

Im LXC:

```bash
cd /opt/tagesreflexion
sudo bash scripts/deploy.sh
```

Das Skript macht:
1) `git pull --rebase`  
2) `npm ci`  
3) `npm run build`  
4) `systemctl restart tagesreflexion`  

---

## Service-Management

```bash
sudo systemctl status tagesreflexion
sudo systemctl restart tagesreflexion
sudo journalctl -u tagesreflexion -f
```

---

## iOS Home-Screen Icon

Icons liegen hier:

- `public/icons/apple-touch-icon.png` (180×180)  ← iOS wichtig
- `public/icons/icon-192.png`
- `public/icons/icon-512.png`

Ablauf:
1) App in Safari öffnen (`/mann` oder `/frau`)
2) Teilen → **„Zum Home-Bildschirm“**
3) Icon wird aus `apple-touch-icon.png` übernommen

---

## Daten / Backup

SQLite-Datei:

- `/opt/tagesreflexion/data/tagesreflexion.sqlite`

Backup (simpel):
```bash
sudo systemctl stop tagesreflexion
sudo cp /opt/tagesreflexion/data/tagesreflexion.sqlite /opt/tagesreflexion/data/tagesreflexion.sqlite.bak
sudo systemctl start tagesreflexion
```

---

## Hinweis (Heimnetz)

Die App ist ohne Auth gedacht (Heimserver/LXC).  
Bitte **keine Portweiterleitung ins Internet**, außer du möchtest freiwillig ein öffentliches Beziehungstagebuch betreiben.

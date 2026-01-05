# Tagesreflexion

Schlanke Heimserver-App für tägliche Reflexion zu zweit (LXC / Ubuntu).  
Bewusst einfach, lokal, ohne Auth – gedacht für den Einsatz im Heimnetz.

---

## Funktionen

- Zwei Seiten: `/mann` und `/frau`
- Tagesbezogen (automatischer Tageswechsel um Mitternacht – Serverzeit)
- 5 Felder pro Person
  - Pflichtfelder: #1–#4 (Dankbarkeit)
  - Optional: #5 → erzeugt Einträge in To talk about
- To talk about (gemeinsam)
  - älteste Einträge oben
  - Ersteller sichtbar
  - für beide abhackbar, sofort synchron
  - offene Punkte bleiben bestehen, erledigte verschwinden
- Read-only Ansicht für vergangene Tage + Heute-Button
- Auto-Refresh (5 Minuten, ohne Eingaben zu überschreiben)
- Nachtmodus (Systemstandard + manueller Toggle)
- SQLite (lokal)
- iOS Home-Screen Support

---

## Installation (CLI)

```bash
sudo apt update
sudo apt install -y git
cd /opt
sudo git clone https://github.com/GluGGsel/Tagesreflexion.git tagesreflexion
cd /opt/tagesreflexion
sudo bash scripts/installer.sh
```

Danach erreichbar unter:
- http://<LXC-IP>:3000/mann
- http://<LXC-IP>:3000/frau

---

## Update / Deploy

```bash
cd /opt/tagesreflexion
sudo bash scripts/deploy.sh
```

---

## Namen anpassen (optional)

```ts
export const INSTANCE = {
  labels: {
    mann: "Mann",
    frau: "Frau",
    kind1: "Kind1",
    kind2: "Kind2",
  },
} as const;
```

```bash
nano config/instance.ts
sudo bash scripts/deploy.sh
```

---

## Hinweis

Ohne Authentifizierung, nur für das Heimnetz gedacht.

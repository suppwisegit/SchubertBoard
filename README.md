# SchubertBoard 🏂

Echtzeit-Familien-Dashboard für Aufgaben, Ankündigungen und Koordination.

![Node](https://img.shields.io/badge/Node.js-18+-green?logo=node.js)
![React](https://img.shields.io/badge/React-18+-blue?logo=react)
![Socket.io](https://img.shields.io/badge/Socket.io-realtime-black?logo=socket.io)

## Features

- 📋 **Aufgaben-Management** — Erstellen, Status ändern, Kommentare
- 📢 **Ankündigungen** — Eltern → Kinder in Echtzeit
- ⚡ **Presets** — 8 Schnellvorlagen mit einem Klick
- 🔄 **Live-Sync** — Änderungen sofort auf allen Geräten
- 🌙 **Dark Mode** — Mit System-Erkennung
- 💾 **Persistenz** — Daten überleben Neustarts
- 🎉 **Konfetti** — Belohnung beim Erledigen

## Architektur

```
SchubertBoard/
├── backend/          # Express + Socket.io (Port 3001)
│   └── src/index.ts
├── frontend/         # Vite + React (Port 5173)
│   └── src/
└── README.md
```

---

## 🍓 Installation auf Raspberry Pi

### Voraussetzungen

- Raspberry Pi (3B+ oder neuer) mit Raspberry Pi OS
- Zugang per SSH oder Terminal

### 1. Node.js installieren

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
node -v  # sollte v18+ zeigen
```

### 2. Repository klonen

```bash
cd ~
git clone https://github.com/suppwisegit/SchubertBoard.git
cd SchubertBoard
```

### 3. Backend einrichten

```bash
cd backend
npm install
```

### 4. Frontend bauen

```bash
cd ../frontend
npm install
npm run build
```

### 5. Frontend über Backend ausliefern

Damit kein separater Vite-Server nötig ist, kann das Backend die gebauten Dateien direkt ausliefern. Füge dazu diese Zeilen in `backend/src/index.ts` **vor** `httpServer.listen(...)` ein:

```typescript
import path from 'path';
// Statische Dateien aus dem Frontend-Build servieren
app.use(express.static(path.join(__dirname, '../../frontend/dist')));
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
});
```

### 6. Starten

```bash
cd ~/SchubertBoard/backend
npx ts-node src/index.ts
```

Die App läuft jetzt auf `http://<raspberry-pi-ip>:3001`.

### 7. Autostart einrichten (optional)

```bash
sudo npm install -g pm2
cd ~/SchubertBoard/backend
pm2 start "npx ts-node src/index.ts" --name schubertboard
pm2 startup
pm2 save
```

> Der Pi startet SchubertBoard jetzt automatisch nach jedem Neustart.

### 8. Im Netzwerk aufrufen

Öffne auf jedem Gerät im gleichen WLAN:

| Seite | URL |
|---|---|
| Kids-Dashboard | `http://<pi-ip>:3001/kids` |
| Eltern-Dashboard | `http://<pi-ip>:3001/mama123` |

> **Tipp:** Die IP deines Pi findest du mit `hostname -I`.

---

## Lokale Entwicklung

```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev
```

## Lizenz

MIT

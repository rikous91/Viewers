# Dashboard Viewer (Backend + Frontend)

Questa cartella contiene il monitor cloud centralizzato per ricevere heartbeat dai backend clienti.

## Struttura

- `backend_cloud.js`: server HTTP cloud con API heartbeat + storage clienti
- `frontend/index.html`: dashboard web per visualizzare clienti/versione/ultima attività
- `data/clients.json`: archivio creato automaticamente al primo avvio

## Avvio

Prima installa le dipendenze solo della cartella `cloud-monitor`:

```bash
cd cloud-monitor
npm install
```

Poi puoi avviare il backend in due modi.

Dal root progetto:

```bash
yarn run dashboard-viewer:backend
```

Oppure:

```bash
node cloud-monitor/backend_cloud.js
```

Restando dentro `cloud-monitor`:

```bash
npm run start
```

Variabili opzionali:

- `DASHBOARD_VIEWER_HOST` (default `0.0.0.0`)
- `DASHBOARD_VIEWER_PORT` (default `3011`)

## Build Linux (pkg)

Dal root progetto:

```bash
npm run build-cloud
```

Output:

- `cloud-monitor/dist/dashboard-viewer-linux-x64`

Opzioni:

- `PKG_TARGET=node18-linux-x64` (default)
- `SKIP_PKG=1` per preparare solo struttura bundle senza compilare il binario

## API

- `POST /api/heartbeat`
  - body JSON esempio:
    - `customerName`: nome cliente (obbligatorio)
    - `version`: versione client
    - `clientId`: id installazione (es. hostname)
- `GET /api/clients`
  - ritorna elenco clienti registrati
- `DELETE /api/clients/{customerKey}`
  - elimina un centro dal monitor (verra ricreato automaticamente alla prossima heartbeat)
- `GET /health`
  - health check servizio

## Nome Cliente dal Proxy Config

Il backend cliente legge il `customerName` da:

1. `dicomweb-proxy-master/build/config/default.json`
2. fallback: `dicomweb-proxy-master/config/default.json`

Proprietà consigliata da inserire nel file:

```json
"cloudCustomerName": "NOME_CLIENTE"
```

Se file/proprietà non esistono, il backend invia:

`Nome non presente-<clientId>`

## Config Client (backend.js)

La configurazione heartbeat lato client è nella sezione iniziale di `backend.js`:

- `cloudHeartbeatEnabled`
- `cloudHeartbeatUrl` (impostato a `https://dashboard-viewer.nolex.it/api/heartbeat`)
- `cloudHeartbeatIntervalMs`
- `cloudClientIdPreset` (opzionale override)
- `cloudCustomerNamePreset` (opzionale override)

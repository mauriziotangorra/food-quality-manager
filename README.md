# Food Quality Manager — International Food Pivot Srl

Sistema di qualifica fornitori con gestione dei profili, iter di qualifica tecnica/sanitaria e specifiche prodotto.

## Stack

- **Frontend**: React 19 + Vite 8 (`client/`)
- **Backend**: Node.js / Express 5 (`server/`)
- **Database**: MySQL (`food_quality_manager`)

## Requisiti

- Node.js 18+
- MySQL (es. Laragon) in esecuzione su `localhost:3306`
- Credenziali MySQL configurate in `server/.env` (default: user `root`, password vuota)

## Configurazione

```bash
# 1. Installa le dipendenze (root + client)
npm install
cd client && npm install

# 2. Configura il database (copiando .env.example se serve)
copy server\.env.example server\.env

# 3. Crea schema e dati iniziali (una sola volta)
npm run db:init
```

## Avvio (sviluppo)

In **due terminali separati**:

```bash
# Terminale 1 — Backend (porta 5000, con auto-reload)
npm run dev        # alias per: nodemon server/app.js

# Terminale 2 — Frontend (http://localhost:5173)
cd client
npm run dev
```

Vite inoltra automaticamente le chiamate `/api/*` al backend sulla porta 5000 (vedi `client/vite.config.js`).

## Script disponibili (root `package.json`)

| Script         | Descrizione                                          |
| -------------- | ---------------------------------------------------- |
| `npm run dev`        | Avvia il backend con nodemon (auto-reload)    |
| `npm run server`     | Avvia il backend senza auto-reload                   |
| `npm run server:dev` | Alias di `dev`                                       |
| `npm run db:init`    | Crea le tabelle MySQL e i dati iniziali (TEST/DEMO)  |

## Credenziali di accesso

| Profilo | Password Qualifica | Password Tecnica |
| ------- | ------------------ | ---------------- |
| TEST    | `test`             | `test`           |
| DEMO    | `1`                | `1`              |
| Admin   | `0404` (schermata amministratore) | — |

## Struttura del database

| Tabella          | Contenuto                                                        |
| ---------------- | ---------------------------------------------------------------- |
| `suppliers`      | Profili fornitori (`id`, `name`, `qual_pass`, `tech_pass`, `status`) |
| `settings`       | Impostazioni globali (`setting_key` PK, JSON in `setting_value`)  |
| `qualifications` | Dati di qualifica per fornitore (`qual_data`, `product_specs` JSON, `last_update`) |

## API REST

Tutte sotto `/api`:

- `GET /api/bootstrap` — fornitori + impostazioni globali (unica chiamata)
- `GET /api/suppliers` · `POST /api/suppliers` · `PUT /api/suppliers/:id` · `DELETE /api/suppliers/:id`
- `GET /api/settings` · `PUT /api/settings` (logo + templates)
- `GET /api/qualifications/:supplierId` · `PUT /api/qualifications/:supplierId`

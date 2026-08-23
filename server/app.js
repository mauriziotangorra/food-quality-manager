// Carica le variabili d'ambiente da .env (JWT_SECRET, DB_*, GEMINI_API_KEY,
// ...) prima di qualunque altro require: dotenv non sovrascrive variabili
// già impostate nel processo, quindi su hosting che le inietta direttamente
// (es. Railway) questa chiamata resta un no-op innocuo.
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const { initDb } = require('./initDb');

const app = express();

app.use(cors());

// I file (foto, PDF, certificazioni) viaggiano come upload multipart, non più
// come base64 dentro il JSON: il body JSON resta quindi leggero.
app.use(express.json({ limit: '15mb' }));

// Cartella per i file caricati (creata al boot se assente)
const UPLOAD_ROOT = path.join(__dirname, 'uploads');
fs.mkdirSync(UPLOAD_ROOT, { recursive: true });
app.use('/uploads', express.static(UPLOAD_ROOT));

// Le risposte API non vanno mai servite dalla cache del browser: i dati
// (impostazioni, qualifiche) devono riflettere sempre l'ultimo salvataggio.
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// Servi il frontend React (build Vite) come file statici: la cartella
// client/dist viene generata durante il deploy da `npm run build`.
const CLIENT_DIST = path.join(__dirname, '../client/dist');
app.use(express.static(CLIENT_DIST));

// --- ROUTES API ---
app.use('/api/auth', require('./routes/auth'));
app.use('/api/uploads', require('./routes/uploads'));
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/qualifications', require('./routes/qualifications'));
app.use('/api/bootstrap', require('./routes/bootstrap'));
app.use('/api/ai', require('./routes/aiExtract'));

// SPA fallback: qualsiasi rotta non gestita dalle API sopra viene servita
// con l'index.html del frontend, così il router lato client (React Router)
// può prendere il controllo della navigazione.
// NB: Express 5 (path-to-regexp v6+) non accetta più '*' come path di rotta
// (lancia PathError "Missing parameter name" all'avvio) — un middleware
// senza path, montato per ultimo, evita del tutto il parsing del pattern.
app.use((req, res) => {
  res.sendFile(path.join(CLIENT_DIST, 'index.html'));
});

// Su Railway il "pre-deploy command" gira in un contesto dove le reference
// variable del plugin MySQL non sono sempre risolte, e MySQL può non essere
// ancora raggiungibile nell'istante esatto in cui il servizio web parte:
// per questo l'init del DB avviene qui, con qualche retry, prima di aprire
// la porta HTTP.
async function startServer() {
  const PORT = process.env.PORT || 5000;
  const MAX_ATTEMPTS = 5;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await initDb();
      break;
    } catch (err) {
      console.error(`❌ Inizializzazione database fallita (tentativo ${attempt}/${MAX_ATTEMPTS}): ${err.message}`);
      if (attempt === MAX_ATTEMPTS) {
        console.error('Numero massimo di tentativi raggiunto, arresto del processo.');
        process.exit(1);
      }
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on port ${PORT}`);
  });
}

startServer();


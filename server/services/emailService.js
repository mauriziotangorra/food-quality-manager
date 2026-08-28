const nodemailer = require('nodemailer');

// Notifica via email inviata quando un fornitore carica il dossier firmato
// (ultimo passo della qualifica). Configurata via SMTP casella aziendale
// (Office 365 / Google Workspace), stesso pattern di GEMINI_API_KEY: se le
// variabili non sono impostate la funzionalita' resta disattivata senza
// bloccare il salvataggio della qualifica.
function isConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
}

let cachedTransporter = null;
function getTransporter() {
  if (cachedTransporter) return cachedTransporter;
  cachedTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    }
  });
  return cachedTransporter;
}

async function sendQualificationSubmittedEmail({ supplierId, supplierName }) {
  if (!isConfigured()) {
    console.warn('sendQualificationSubmittedEmail: SMTP non configurato, invio saltato');
    return;
  }

  const to = process.env.QUALIFICATION_NOTIFY_EMAIL || 'qualita@italianfoodpivot.it';
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;
  const appUrl = process.env.APP_URL || 'https://qualifica-suppliers.ifptools.com';
  const submittedAt = new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome' });

  try {
    await getTransporter().sendMail({
      from,
      to,
      subject: `Qualifica fornitore completata: ${supplierName}`,
      html: `
        <p>Il fornitore <strong>${supplierName}</strong> (ID: ${supplierId}) ha caricato il dossier firmato,
        completando il processo di qualifica.</p>
        <p>Data invio: ${submittedAt}</p>
        <p><a href="${appUrl}/admin">Apri il pannello amministrativo</a></p>
      `
    });
  } catch (err) {
    console.error('sendQualificationSubmittedEmail: invio fallito', err);
  }
}

// Invio diagnostico da pannello admin ("Test Email"): a differenza di
// sendQualificationSubmittedEmail, qui gli errori vanno RILANCIATI (non solo
// loggati) cosi' la route puo' mostrare all'admin esattamente cosa non va
// (SMTP non configurato, credenziali errate, ecc.), invece di fallire in
// silenzio come nel flusso reale di invio qualifica.
async function sendTestEmail(to) {
  if (!isConfigured()) {
    const err = new Error('SMTP non configurato: imposta SMTP_HOST, SMTP_USER e SMTP_PASSWORD (vedi .env).');
    err.code = 'SMTP_NOT_CONFIGURED';
    throw err;
  }
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;
  const sentAt = new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome' });
  const info = await getTransporter().sendMail({
    from,
    to,
    subject: 'Email di test - Food Quality Manager',
    html: `
      <p>Questa è una email di test inviata dal pannello amministrativo per verificare la configurazione SMTP.</p>
      <p>Se stai leggendo questo messaggio, la configurazione funziona correttamente.</p>
      <p>Inviata il: ${sentAt}</p>
    `
  });
  return info;
}

module.exports = { sendQualificationSubmittedEmail, sendTestEmail };

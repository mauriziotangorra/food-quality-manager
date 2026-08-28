// Notifica via email inviata quando un fornitore carica il dossier firmato
// (ultimo passo della qualifica). Usa l'API HTTPS di Resend (non SMTP
// diretto): il tentativo con SMTP Office 365 da Railway ha fallito prima con
// ENETUNREACH (nessuna rotta IPv6 in uscita) e poi, dopo aver forzato IPv4,
// con ETIMEDOUT — la connessione SMTP viene filtrata/bloccata a livello di
// rete tra Railway e Microsoft, un problema di infrastruttura non risolvibile
// lato codice. L'API HTTPS di Resend gira sulla stessa identica strada di
// rete gia' usata con successo da Railway per Gemini (porta 443, nessuna
// differenza di trattamento), quindi evita il problema del tutto.
// Se RESEND_API_KEY non e' impostata, la funzionalita' resta disattivata
// senza bloccare il salvataggio della qualifica (stesso pattern di
// GEMINI_API_KEY).
const RESEND_API_URL = 'https://api.resend.com/emails';

function isConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

async function sendViaResend({ to, subject, html }) {
  const from = process.env.EMAIL_FROM || 'Food Quality Manager <onboarding@resend.dev>';

  const res = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ from, to, subject, html })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message || `Resend ha risposto con stato ${res.status}`);
    err.code = 'RESEND_API_ERROR';
    throw err;
  }
  return data;
}

async function sendQualificationSubmittedEmail({ supplierId, supplierName }) {
  if (!isConfigured()) {
    console.warn('sendQualificationSubmittedEmail: RESEND_API_KEY non configurata, invio saltato');
    return;
  }

  const to = process.env.QUALIFICATION_NOTIFY_EMAIL || 'qualita@italianfoodpivot.it';
  const appUrl = process.env.APP_URL || 'https://qualifica-suppliers.ifptools.com';
  const submittedAt = new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome' });

  try {
    await sendViaResend({
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
// loggati) cosi' la route puo' mostrare all'admin esattamente cosa non va,
// invece di fallire in silenzio come nel flusso reale di invio qualifica.
async function sendTestEmail(to) {
  if (!isConfigured()) {
    const err = new Error('Email non configurata: imposta RESEND_API_KEY (vedi .env).');
    err.code = 'EMAIL_NOT_CONFIGURED';
    throw err;
  }
  const sentAt = new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome' });
  return sendViaResend({
    to,
    subject: 'Email di test - Food Quality Manager',
    html: `
      <p>Questa è una email di test inviata dal pannello amministrativo per verificare la configurazione email.</p>
      <p>Se stai leggendo questo messaggio, la configurazione funziona correttamente.</p>
      <p>Inviata il: ${sentAt}</p>
    `
  });
}

module.exports = { sendQualificationSubmittedEmail, sendTestEmail };

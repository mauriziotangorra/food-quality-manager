const nodemailer = require('nodemailer');
const dns = require('dns').promises;

// Notifica via email inviata quando un fornitore carica il dossier firmato
// (ultimo passo della qualifica). Configurata via SMTP casella aziendale
// (Office 365 / Google Workspace), stesso pattern di GEMINI_API_KEY: se le
// variabili non sono impostate la funzionalita' resta disattivata senza
// bloccare il salvataggio della qualifica.
function isConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
}

// Alcuni host (es. il container di Railway) non hanno una rotta IPv6 in
// uscita funzionante: smtp.office365.com risolve sia A (IPv4) che AAAA
// (IPv6), e senza intervento Node/Nodemailer possono scegliere l'indirizzo
// IPv6 e fallire con ENETUNREACH anche se l'host e' perfettamente
// raggiungibile via IPv4 (impostare dns.setDefaultResultOrder('ipv4first')
// a livello globale non e' bastato: Nodemailer pare risolvere il DNS per
// conto proprio). Qui si risolve esplicitamente l'indirizzo IPv4 PRIMA di
// connettersi, e lo si passa a Nodemailer come "host" — tls.servername
// mantiene la verifica del certificato sul nome host originale, non
// sull'IP nudo (altrimenti il TLS fallirebbe). Non cachata: gli endpoint
// SMTP di Office 365/Google Workspace sono dietro pool di IP che possono
// cambiare, e qui gli invii sono rari (una email a testata, non un flusso
// ad alto traffico) quindi il costo di una lookup DNS in piu' e' trascurabile.
async function buildTransporter() {
  const host = process.env.SMTP_HOST;
  let connectHost = host;
  try {
    const { address } = await dns.lookup(host, { family: 4 });
    connectHost = address;
  } catch (err) {
    console.warn(`emailService: risoluzione IPv4 di ${host} fallita (${err.message}), uso il nome host direttamente`);
  }

  return nodemailer.createTransport({
    host: connectHost,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    },
    tls: { servername: host },
    // Senza timeout espliciti, un host che blocca/droppa silenziosamente le
    // connessioni SMTP in uscita fa restare la richiesta appesa finche' il
    // proxy della piattaforma di hosting non la interrompe da solo con un
    // 502 generico — questi limiti la fanno fallire in modo pulito e veloce,
    // con un errore leggibile invece che un timeout opaco lato client.
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000
  });
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
    const transporter = await buildTransporter();
    await transporter.sendMail({
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
  const transporter = await buildTransporter();
  const info = await transporter.sendMail({
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

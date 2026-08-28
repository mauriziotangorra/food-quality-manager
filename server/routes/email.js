const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { sendTestEmail } = require('../services/emailService');

const router = express.Router();

// Solo admin: strumento diagnostico per verificare la configurazione SMTP
// dal pannello, senza dover caricare un dossier firmato reale per testarla.
router.use(requireAuth, requireAdmin);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/email/test -> invia una email di test all'indirizzo indicato
router.post('/test', async (req, res) => {
  try {
    const { to } = req.body || {};
    if (!to || typeof to !== 'string' || !EMAIL_RE.test(to)) {
      return res.status(400).json({ error: 'Indirizzo email non valido.' });
    }

    await sendTestEmail(to);
    res.json({ ok: true });
  } catch (err) {
    console.error('POST /api/email/test', err);
    const status = err.code === 'SMTP_NOT_CONFIGURED' ? 503 : 500;
    res.status(status).json({ error: err.message || "Errore durante l'invio dell'email di test.", code: err.code });
  }
});

module.exports = router;

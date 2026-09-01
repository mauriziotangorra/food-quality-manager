const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { getGlobalSettings, saveGlobalSettings, translateMissingInStore } = require('../services/settingsService');

const router = express.Router();

// GET /api/settings -> pubblica (logo + template servono anche in home, senza login)
router.get('/', async (req, res) => {
  try {
    const settings = await getGlobalSettings();
    res.json({ settings });
  } catch (err) {
    console.error('GET /api/settings', err);
    res.status(500).json({ error: 'Errore nel recupero delle impostazioni' });
  }
});

// Solo l'admin può modificare i template globali (dichiarazioni A/B/C,
// griglia allergeni): i fornitori, incluso l'account TEST/DEMO, li vedono
// solo in sola lettura nel pannello di qualifica.
async function canEditGlobalSettings(req) {
  return req.auth.role === 'admin';
}

// PUT /api/settings -> aggiorna parzialmente (logo e/o templates, indipendenti)
router.put('/', requireAuth, async (req, res) => {
  try {
    if (!(await canEditGlobalSettings(req))) {
      return res.status(403).json({ error: 'Non autorizzato a modificare le impostazioni globali' });
    }

    const settings = await saveGlobalSettings(req.body || {});
    res.json({ settings });
  } catch (err) {
    console.error('PUT /api/settings', err);
    res.status(500).json({ error: 'Errore nel salvataggio delle impostazioni' });
  }
});

// POST /api/settings/translate-missing -> "seeder" on-demand: traduce con
// l'AI le sole lingue mancanti nelle dichiarazioni/questionario/allergeni
// GIA' presenti in DB (es. contenuto inserito prima che esistesse questa
// funzione, o inserito solo in una lingua). Non tocca mai una lingua che ha
// gia' un valore. Solo admin, per lo stesso motivo di PUT /api/settings.
router.post('/translate-missing', requireAuth, requireAdmin, async (req, res) => {
  try {
    const summary = await translateMissingInStore();
    res.json({ ok: true, summary });
  } catch (err) {
    console.error('POST /api/settings/translate-missing', err);
    if (err.code === 'AI_NOT_CONFIGURED') {
      return res.status(503).json({ error: err.message });
    }
    res.status(500).json({ error: err.message || 'Errore durante la traduzione automatica' });
  }
});

module.exports = router;

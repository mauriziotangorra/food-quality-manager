const express = require('express');
const pool = require('../db');
const { getGlobalSettings } = require('../services/settingsService');

const router = express.Router();

// GET /api/bootstrap -> carica in un'unica chiamata fornitori + impostazioni globali
// (sostituisce i due listener Firestore del vecchio client)
router.get('/', async (req, res) => {
  try {
    const [suppliers] = await pool.query(
      'SELECT id, name, status, created_at FROM suppliers ORDER BY name ASC'
    );

    const settings = await getGlobalSettings();

    res.json({ suppliers, settings });
  } catch (err) {
    console.error('GET /api/bootstrap', err);
    res.status(500).json({ error: 'Errore nel bootstrap dei dati' });
  }
});

module.exports = router;

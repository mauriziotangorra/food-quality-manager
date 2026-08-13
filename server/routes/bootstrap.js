const express = require('express');
const pool = require('../db');

const router = express.Router();

// GET /api/bootstrap -> carica in un'unica chiamata fornitori + impostazioni globali
// (sostituisce i due listener Firestore del vecchio client)
router.get('/', async (req, res) => {
  try {
    const [suppliers] = await pool.query(
      'SELECT id, name, status, created_at FROM suppliers ORDER BY name ASC'
    );

    const [settingRows] = await pool.query('SELECT setting_value FROM settings WHERE setting_key = ?', ['global']);
    let settings = { logo: null, templates: null };
    if (settingRows.length && settingRows[0].setting_value) {
      try {
        settings = JSON.parse(settingRows[0].setting_value);
      } catch (e) {
        settings = { logo: null, templates: null };
      }
    }

    res.json({ suppliers, settings });
  } catch (err) {
    console.error('GET /api/bootstrap', err);
    res.status(500).json({ error: 'Errore nel bootstrap dei dati' });
  }
});

module.exports = router;

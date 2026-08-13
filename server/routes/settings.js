const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const GLOBAL_KEY = 'global';

// GET /api/settings -> pubblica (logo + template servono anche in home, senza login)
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT setting_value FROM settings WHERE setting_key = ?', [GLOBAL_KEY]);
    let value = { logo: null, templates: null };
    if (rows.length && rows[0].setting_value) {
      try {
        value = JSON.parse(rows[0].setting_value);
      } catch (e) {
        value = { logo: null, templates: null };
      }
    }
    res.json({ settings: value });
  } catch (err) {
    console.error('GET /api/settings', err);
    res.status(500).json({ error: 'Errore nel recupero delle impostazioni' });
  }
});

// Solo l'admin, oppure il fornitore TEST/DEMO (come nel comportamento originale,
// dove solo quegli account potevano modificare i template globali).
async function canEditGlobalSettings(req) {
  if (req.auth.role === 'admin') return true;
  if (req.auth.role !== 'supplier') return false;

  const [rows] = await pool.query('SELECT name FROM suppliers WHERE id = ?', [req.auth.supplierId]);
  if (!rows.length) return false;
  const name = (rows[0].name || '').toUpperCase();
  return name === 'TEST' || name === 'DEMO';
}

// PUT /api/settings -> aggiorna parzialmente (merge) la configurazione globale
router.put('/', requireAuth, async (req, res) => {
  try {
    if (!(await canEditGlobalSettings(req))) {
      return res.status(403).json({ error: 'Non autorizzato a modificare le impostazioni globali' });
    }

    const patch = req.body || {};
    const [rows] = await pool.query('SELECT setting_value FROM settings WHERE setting_key = ?', [GLOBAL_KEY]);

    let current = { logo: null, templates: null };
    if (rows.length && rows[0].setting_value) {
      try {
        current = JSON.parse(rows[0].setting_value);
      } catch (e) {
        current = { logo: null, templates: null };
      }
    }

    const merged = { ...current, ...patch };

    await pool.query(
      'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)',
      [GLOBAL_KEY, JSON.stringify(merged)]
    );

    res.json({ settings: merged });
  } catch (err) {
    console.error('PUT /api/settings', err);
    res.status(500).json({ error: 'Errore nel salvataggio delle impostazioni' });
  }
});

module.exports = router;

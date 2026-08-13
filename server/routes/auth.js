const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../db');
const { signToken, requireAuth } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login-admin { username, password }
router.post('/login-admin', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Username e password sono obbligatori' });
    }

    const [rows] = await pool.query('SELECT id, username, password_hash FROM admins WHERE username = ?', [username]);
    if (!rows.length) return res.status(401).json({ error: 'Credenziali non valide' });

    const admin = rows[0];
    const match = await bcrypt.compare(password, admin.password_hash);
    if (!match) return res.status(401).json({ error: 'Credenziali non valide' });

    const token = signToken({ role: 'admin', adminId: admin.id, username: admin.username });
    res.json({ token, admin: { id: admin.id, username: admin.username } });
  } catch (err) {
    console.error('POST /api/auth/login-admin', err);
    res.status(500).json({ error: "Errore durante l'accesso amministratore" });
  }
});

// POST /api/auth/login-supplier { code, area } - area: 'qual' | 'tech'
router.post('/login-supplier', async (req, res) => {
  try {
    const { code, area } = req.body || {};
    if (!code || !['qual', 'tech'].includes(area)) {
      return res.status(400).json({ error: 'Codice e area (qual/tech) sono obbligatori' });
    }

    const [rows] = await pool.query(
      "SELECT id, name, status, qual_pass, tech_pass FROM suppliers WHERE status = 'active'"
    );

    const passField = area === 'qual' ? 'qual_pass' : 'tech_pass';
    let matched = null;
    for (const row of rows) {
      const hash = row[passField];
      if (!hash) continue;
      // eslint-disable-next-line no-await-in-loop
      if (await bcrypt.compare(code, hash)) {
        matched = row;
        break;
      }
    }

    if (!matched) return res.status(401).json({ error: 'Password non valida' });

    const token = signToken({ role: 'supplier', supplierId: matched.id, area });
    res.json({ token, supplier: { id: matched.id, name: matched.name, status: matched.status } });
  } catch (err) {
    console.error('POST /api/auth/login-supplier', err);
    res.status(500).json({ error: "Errore durante l'accesso fornitore" });
  }
});

// GET /api/auth/me - valida il token corrente e restituisce l'identità
router.get('/me', requireAuth, async (req, res) => {
  try {
    if (req.auth.role === 'admin') {
      const [rows] = await pool.query('SELECT id, username FROM admins WHERE id = ?', [req.auth.adminId]);
      if (!rows.length) return res.status(401).json({ error: 'Sessione non valida' });
      return res.json({ role: 'admin', admin: rows[0] });
    }

    if (req.auth.role === 'supplier') {
      const [rows] = await pool.query(
        "SELECT id, name, status FROM suppliers WHERE id = ? AND status = 'active'",
        [req.auth.supplierId]
      );
      if (!rows.length) return res.status(401).json({ error: 'Sessione non valida' });
      return res.json({ role: 'supplier', area: req.auth.area, supplier: rows[0] });
    }

    return res.status(401).json({ error: 'Sessione non valida' });
  } catch (err) {
    console.error('GET /api/auth/me', err);
    res.status(500).json({ error: 'Errore nel recupero della sessione' });
  }
});

module.exports = router;

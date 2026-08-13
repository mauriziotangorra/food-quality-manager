const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const SALT_ROUNDS = 10;

// Converte le colonne MySQL (snake_case) nelle proprietà usate dal client (camelCase).
// Le password (hash) non vengono mai restituite al client.
const mapRow = (r) => ({
  id: r.id,
  name: r.name,
  status: r.status,
  createdAt: r.created_at
});

// Tutte le route sono riservate agli amministratori.
router.use(requireAuth, requireAdmin);

// GET /api/suppliers -> elenco fornitori (senza password)
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, status, created_at FROM suppliers ORDER BY name ASC'
    );
    res.json({ suppliers: rows.map(mapRow) });
  } catch (err) {
    console.error('GET /api/suppliers', err);
    res.status(500).json({ error: 'Errore nel recupero dei fornitori' });
  }
});

// POST /api/suppliers -> crea un nuovo fornitore (qualPass/techPass obbligatorie)
router.post('/', async (req, res) => {
  try {
    const { id, name, qualPass, techPass, status } = req.body || {};
    if (!name) return res.status(400).json({ error: 'Il nome del fornitore è obbligatorio' });
    if (!qualPass || !techPass) {
      return res.status(400).json({ error: 'Password di qualifica e tecnica sono obbligatorie' });
    }

    const supplierId = id || crypto.randomUUID();
    const [qualHash, techHash] = await Promise.all([
      bcrypt.hash(qualPass, SALT_ROUNDS),
      bcrypt.hash(techPass, SALT_ROUNDS)
    ]);

    await pool.query(
      'INSERT INTO suppliers (id, name, qual_pass, tech_pass, status) VALUES (?, ?, ?, ?, ?)',
      [supplierId, name, qualHash, techHash, status || 'active']
    );

    const [rows] = await pool.query(
      'SELECT id, name, status, created_at FROM suppliers WHERE id = ?',
      [supplierId]
    );
    res.status(201).json({ supplier: mapRow(rows[0]) });
  } catch (err) {
    console.error('POST /api/suppliers', err);
    res.status(500).json({ error: 'Errore nella creazione del fornitore' });
  }
});

// PUT /api/suppliers/:id -> aggiorna un fornitore esistente.
// qualPass/techPass sono opzionali: se omesse/vuote la password resta invariata.
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, qualPass, techPass, status } = req.body || {};

    const sets = ['name = ?', 'status = ?'];
    const params = [name || '', status || 'active'];

    if (qualPass) {
      sets.push('qual_pass = ?');
      params.push(await bcrypt.hash(qualPass, SALT_ROUNDS));
    }
    if (techPass) {
      sets.push('tech_pass = ?');
      params.push(await bcrypt.hash(techPass, SALT_ROUNDS));
    }
    params.push(id);

    const [result] = await pool.query(`UPDATE suppliers SET ${sets.join(', ')} WHERE id = ?`, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Fornitore non trovato' });
    }

    const [rows] = await pool.query(
      'SELECT id, name, status, created_at FROM suppliers WHERE id = ?',
      [id]
    );
    res.json({ supplier: mapRow(rows[0]) });
  } catch (err) {
    console.error('PUT /api/suppliers/:id', err);
    res.status(500).json({ error: "Errore nell'aggiornamento del fornitore" });
  }
});

// DELETE /api/suppliers/:id -> elimina fornitore (la qualifica associata viene
// rimossa automaticamente via ON DELETE CASCADE)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM suppliers WHERE id = ?', [id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/suppliers/:id', err);
    res.status(500).json({ error: 'Errore nella cancellazione del fornitore' });
  }
});

module.exports = router;

const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const SALT_ROUNDS = 10;

// Converte le colonne MySQL (snake_case) nelle proprietà usate dal client (camelCase).
// Le password (hash) non vengono mai restituite al client.
const QUALIFICATION_STATUSES = new Set(['not_qualified', 'under_review', 'qualified']);

const mapRow = (r) => ({
  id: r.id,
  name: r.name,
  status: r.status,
  qualificationStatus: r.qualification_status || 'not_qualified',
  qualificationNotes: r.qualification_notes || '',
  createdAt: r.created_at
});

// Tutte le route sono riservate agli amministratori.
router.use(requireAuth, requireAdmin);

// Le password sono hash bcrypt con salt casuale per riga: non è possibile
// verificarne l'unicità con un confronto SQL diretto, quindi la password in
// chiaro va confrontata (bcrypt.compare) contro ogni hash esistente.
// excludeId esclude il fornitore che si sta modificando, altrimenti la sua
// stessa password invariata risulterebbe sempre "già in uso".
async function isPasswordInUse(password, excludeId) {
  const [rows] = excludeId
    ? await pool.query('SELECT qual_pass, tech_pass FROM suppliers WHERE id != ?', [excludeId])
    : await pool.query('SELECT qual_pass, tech_pass FROM suppliers');

  const hashes = rows.flatMap((r) => [r.qual_pass, r.tech_pass]).filter(Boolean);
  const matches = await Promise.all(hashes.map((hash) => bcrypt.compare(password, hash)));
  return matches.some(Boolean);
}

// GET /api/suppliers -> elenco fornitori (senza password)
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, status, qualification_status, qualification_notes, created_at FROM suppliers ORDER BY name ASC'
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

    if (await isPasswordInUse(qualPass, null)) {
      return res.status(409).json({ error: 'Questa password di qualifica è già utilizzata da un altro fornitore. Scegline una diversa.' });
    }
    if (await isPasswordInUse(techPass, null)) {
      return res.status(409).json({ error: 'Questa password tecnica è già utilizzata da un altro fornitore. Scegline una diversa.' });
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

    if (qualPass && (await isPasswordInUse(qualPass, id))) {
      return res.status(409).json({ error: 'Questa password di qualifica è già utilizzata da un altro fornitore. Scegline una diversa.' });
    }
    if (techPass && (await isPasswordInUse(techPass, id))) {
      return res.status(409).json({ error: 'Questa password tecnica è già utilizzata da un altro fornitore. Scegline una diversa.' });
    }

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

// PATCH /api/suppliers/:id/qualification-status -> aggiorna solo stato di
// avanzamento qualifica + note interne admin. Endpoint separato da PUT /:id
// (che gestisce nome/password/status di login) cosi' la tabella qualifiche
// nell'area admin puo' salvare inline senza toccare il resto del profilo.
router.patch('/:id/qualification-status', async (req, res) => {
  try {
    const { id } = req.params;
    const { qualificationStatus, qualificationNotes } = req.body || {};

    if (qualificationStatus !== undefined && !QUALIFICATION_STATUSES.has(qualificationStatus)) {
      return res.status(400).json({ error: 'Stato qualifica non valido.' });
    }

    const sets = [];
    const params = [];
    if (qualificationStatus !== undefined) { sets.push('qualification_status = ?'); params.push(qualificationStatus); }
    if (qualificationNotes !== undefined) { sets.push('qualification_notes = ?'); params.push(qualificationNotes); }
    if (!sets.length) return res.status(400).json({ error: 'Nessun campo da aggiornare.' });
    params.push(id);

    const [result] = await pool.query(`UPDATE suppliers SET ${sets.join(', ')} WHERE id = ?`, params);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Fornitore non trovato' });
    }

    const [rows] = await pool.query(
      'SELECT id, name, status, qualification_status, qualification_notes, created_at FROM suppliers WHERE id = ?',
      [id]
    );
    res.json({ supplier: mapRow(rows[0]) });
  } catch (err) {
    console.error('PATCH /api/suppliers/:id/qualification-status', err);
    res.status(500).json({ error: 'Errore nel salvataggio dello stato qualifica' });
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

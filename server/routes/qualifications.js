const express = require('express');
const pool = require('../db');
const { requireAuth, requireOwnerOrAdmin } = require('../middleware/auth');

const router = express.Router();

// requireOwnerOrAdmin legge req.params.supplierId, quindi va applicato dopo che
// Express ha risolto il pattern ':supplierId' di ogni singola route (non tramite
// router.use generico, dove i parametri non sarebbero ancora popolati).
router.use(requireAuth);

// GET /api/qualifications/:supplierId -> dati qualifica del fornitore
// Restituisce { qualData, productSpecs, lastUpdate } (null se assenti)
router.get('/:supplierId', requireOwnerOrAdmin, async (req, res) => {
  try {
    const { supplierId } = req.params;
    const [rows] = await pool.query(
      'SELECT qual_data, product_specs, last_update FROM qualifications WHERE supplier_id = ?',
      [supplierId]
    );

    if (!rows.length) {
      return res.json({ qualData: null, productSpecs: null, lastUpdate: null });
    }

    const row = rows[0];
    res.json({
      qualData: row.qual_data ? JSON.parse(row.qual_data) : null,
      productSpecs: row.product_specs ? JSON.parse(row.product_specs) : null,
      lastUpdate: row.last_update ? new Date(row.last_update).toISOString() : null
    });
  } catch (err) {
    console.error('GET /api/qualifications/:supplierId', err);
    res.status(500).json({ error: 'Errore nel recupero della qualifica' });
  }
});

// PUT /api/qualifications/:supplierId -> salva (upsert) la qualifica
// Body: { qualData, productSpecs, lastUpdate }
router.put('/:supplierId', requireOwnerOrAdmin, async (req, res) => {
  try {
    const { supplierId } = req.params;
    const { qualData, productSpecs, lastUpdate } = req.body || {};

    const ts = lastUpdate ? new Date(lastUpdate) : new Date();

    await pool.query(
      `INSERT INTO qualifications (supplier_id, qual_data, product_specs, last_update)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         qual_data = VALUES(qual_data),
         product_specs = VALUES(product_specs),
         last_update = VALUES(last_update)`,
      [
        supplierId,
        qualData ? JSON.stringify(qualData) : null,
        productSpecs ? JSON.stringify(productSpecs) : null,
        ts
      ]
    );

    res.json({ ok: true, lastUpdate: ts.toISOString() });
  } catch (err) {
    console.error('PUT /api/qualifications/:supplierId', err);
    res.status(500).json({ error: 'Errore nel salvataggio della qualifica' });
  }
});

module.exports = router;

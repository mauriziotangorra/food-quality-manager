const express = require('express');
const pool = require('../db');
const { requireAuth, requireOwnerOrAdmin } = require('../middleware/auth');
const { getQualData, saveQualData } = require('../services/qualificationService');

const router = express.Router();

// requireOwnerOrAdmin legge req.params.supplierId, quindi va applicato dopo che
// Express ha risolto il pattern ':supplierId' di ogni singola route (non tramite
// router.use generico, dove i parametri non sarebbero ancora popolati).
router.use(requireAuth);

// GET /api/qualifications/:supplierId -> dati qualifica del fornitore
// Restituisce { qualData, productSpecs, lastUpdate } (null se assenti).
// qualData viene dalle tabelle normalizzate; productSpecs/lastUpdate restano
// sul vecchio blob (Fase 4, fuori scope).
router.get('/:supplierId', requireOwnerOrAdmin, async (req, res) => {
  try {
    const { supplierId } = req.params;

    const [qualData, [rows]] = await Promise.all([
      getQualData(supplierId),
      pool.query('SELECT product_specs, last_update FROM qualifications WHERE supplier_id = ?', [supplierId])
    ]);

    const row = rows[0];
    res.json({
      qualData,
      productSpecs: row?.product_specs ? JSON.parse(row.product_specs) : null,
      lastUpdate: row?.last_update ? new Date(row.last_update).toISOString() : null
    });
  } catch (err) {
    console.error('GET /api/qualifications/:supplierId', err);
    res.status(500).json({ error: 'Errore nel recupero della qualifica' });
  }
});

// PUT /api/qualifications/:supplierId -> salva la qualifica
// Body: { qualData, productSpecs, lastUpdate }. qualData e productSpecs sono
// scritti indipendentemente (tabelle normalizzate vs. colonna blob invariata):
// non serve una transazione condivisa, non toccano le stesse tabelle e non
// c'e' un vincolo di consistenza incrociata tra i due.
router.put('/:supplierId', requireOwnerOrAdmin, async (req, res) => {
  try {
    const { supplierId } = req.params;
    const { qualData, productSpecs, lastUpdate } = req.body || {};

    const ts = lastUpdate ? new Date(lastUpdate) : new Date();

    await pool.query(
      `INSERT INTO qualifications (supplier_id, product_specs, last_update)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE
         product_specs = VALUES(product_specs),
         last_update = VALUES(last_update)`,
      [supplierId, productSpecs ? JSON.stringify(productSpecs) : null, ts]
    );

    if (qualData) {
      await saveQualData(supplierId, qualData);
    }

    res.json({ ok: true, lastUpdate: ts.toISOString() });
  } catch (err) {
    console.error('PUT /api/qualifications/:supplierId', err);
    res.status(500).json({ error: 'Errore nel salvataggio della qualifica' });
  }
});

module.exports = router;

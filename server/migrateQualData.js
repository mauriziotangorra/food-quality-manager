require('dotenv').config();

// Migrazione una tantum: legge il vecchio blob qualifications.qual_data per
// ogni fornitore e lo scrive nelle tabelle normalizzate tramite saveQualData
// — la STESSA funzione usata da PUT /api/qualifications/:id — così la
// migrazione non puo' mai divergere dal reale percorso di scrittura.
//
// A differenza di migrateSettings.js (un solo blob globale), qui ci sono
// potenzialmente molte righe indipendenti: ogni fornitore viene migrato in
// un try/catch separato, così una riga malformata o con indici fuori range
// non blocca l'intero batch.
//
// Idempotente: ogni fornitore viene sovrascritto per intero ad ogni run.
// Non eseguita automaticamente all'avvio — va lanciata manualmente con
// `node server/migrateQualData.js` DOPO che il server è partito almeno una
// volta con lo schema aggiornato (le tabelle qual_* vengono create da
// schema.sql via initDb() al boot) e dopo aver già eseguito
// migrateSettings.js (serve l'ordine dei template per il rekeying idx->id).

const pool = require('./db');
const { saveQualData, getQualData } = require('./services/qualificationService');

async function run() {
  const [rows] = await pool.query('SELECT supplier_id, qual_data FROM qualifications WHERE qual_data IS NOT NULL');

  if (!rows.length) {
    console.log('Nessuna riga qualifications.qual_data da migrare.');
    return;
  }

  console.log(`🔍 Trovate ${rows.length} righe con qual_data da migrare.`);

  let ok = 0;
  let skipped = 0;

  for (const row of rows) {
    const { supplier_id: supplierId } = row;
    try {
      let qualData;
      try {
        qualData = JSON.parse(row.qual_data);
      } catch (e) {
        throw new Error(`qual_data non è JSON valido: ${e.message}`);
      }

      await saveQualData(supplierId, qualData);
      ok++;
      console.log(`✅ ${supplierId}`);
    } catch (e) {
      skipped++;
      console.error(`⚠️  Saltato fornitore ${supplierId}: ${e.message}`);
    }
  }

  console.log(`\n✅ Migrazione completata: ${ok} fornitori migrati, ${skipped} saltati.`);

  // Verifica veloce: rileggi un fornitore a caso tramite il percorso di
  // lettura reale, per conferma visiva che l'assemblaggio funzioni.
  if (rows.length) {
    const sample = rows[0].supplier_id;
    const reassembled = await getQualData(sample);
    console.log(`\n🔍 Verifica di esempio (${sample}):`, JSON.stringify(reassembled, null, 2).slice(0, 500), '...');
  }
}

run()
  .catch((err) => {
    console.error('❌ Migrazione fallita:', err.message);
    console.error(err.stack);
    process.exitCode = 1;
  })
  .finally(() => pool.end());

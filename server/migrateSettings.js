require('dotenv').config();

// Migrazione una tantum: legge il vecchio blob settings.setting_value
// (key='global') e lo scrive nelle tabelle normalizzate (app_settings,
// impegni_a/b/c, allergens) tramite saveGlobalSettings — la STESSA funzione
// usata da PUT /api/settings, per garantire che la migrazione scriva
// esattamente come scriverebbe una richiesta reale, senza logica duplicata.
//
// Idempotente: ogni tabella target viene svuotata e reinserita ad ogni run.
// Non viene eseguita automaticamente all'avvio (a differenza di initDb.js):
// va lanciata manualmente con `node server/migrateSettings.js` DOPO che il
// server è partito almeno una volta con lo schema aggiornato (le tabelle
// app_settings/impegni_a/impegni_b/impegni_c/allergens vengono create da
// schema.sql via initDb() al boot).

const pool = require('./db');
const { saveGlobalSettings, getGlobalSettings } = require('./services/settingsService');

async function run() {
  const [rows] = await pool.query("SELECT setting_value FROM settings WHERE setting_key = 'global'");

  if (!rows.length || !rows[0].setting_value) {
    console.log('Nessun blob settings.global trovato: niente da migrare.');
    return;
  }

  let old;
  try {
    old = JSON.parse(rows[0].setting_value);
  } catch (e) {
    console.error('❌ settings.setting_value non è JSON valido, migrazione interrotta:', e.message);
    process.exitCode = 1;
    return;
  }

  const patch = {};
  if (Object.prototype.hasOwnProperty.call(old, 'logo')) patch.logo = old.logo;
  if (old.templates) patch.templates = old.templates;

  console.log('🔍 Blob letto: logo =', old.logo, '| impegniA =', old.templates?.impegniA?.length || 0,
    '| impegniB =', old.templates?.impegniB?.length || 0, '| impegniC =', old.templates?.impegniC?.length || 0,
    '| allergeni =', old.templates?.allergeni?.length || 0);

  await saveGlobalSettings(patch);

  const verify = await getGlobalSettings();
  console.log('✅ Migrazione completata. Stato nelle tabelle normalizzate:');
  console.log('   logo =', verify.logo);
  console.log('   impegniA =', verify.templates.impegniA.length);
  console.log('   impegniB =', verify.templates.impegniB.length);
  console.log('   impegniC =', verify.templates.impegniC.length);
  console.log('   allergeni =', verify.templates.allergeni.length);
}

run()
  .catch((err) => {
    console.error('❌ Migrazione fallita:', err.message);
    console.error(err.stack);
    process.exitCode = 1;
  })
  .finally(() => pool.end());

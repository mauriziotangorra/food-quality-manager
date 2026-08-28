const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');

const SALT_ROUNDS = 10;

// Contenuto di riferimento del Questionario (Dichiarazione C), dai due
// questionari cliente ("3.1 Service Supplier Questionnaire" e "3.2 MOCA
// Supplier Questionnaire"). Seminato SOLO se la tabella impegni_c e' vuota
// (vedi piu' sotto) — non deve mai sovrascrivere domande gia' modificate
// dall'admin. Il testo e' in inglese (unica lingua fornita dal cliente): lo
// stesso testo va anche in "it" cosi' il fallback imp.it (usato se en/fr/es
// non sono ancora tradotte) non resta mai vuoto.
const DEFAULT_IMPEGNI_C = [
  { id: 'svc-1', section: 'LABORATORY / RETAINED SAMPLES', text: "If you perform laboratory testing activities, are you accredited by ACCREDIA for the tests you perform? If yes, indicate in Notes which tests are accredited and how many accredited tests you perform." },
  { id: 'svc-2', section: 'LABORATORY / RETAINED SAMPLES', text: "Do you retain a representative finished-product sample for each lot, where applicable? If yes, indicate in Notes the retention period and storage conditions." },
  { id: 'svc-3', section: 'TRAINING', text: "Does the company provide training on hygiene and food safety based on the HACCP system?" },
  { id: 'svc-4', section: 'TRAINING', text: "Does the company provide training on occupational health and safety in compliance with Italian Legislative Decree 81/2008?" },
  { id: 'svc-5', section: 'TRANSPORT / LOGISTICS', text: "Does the company hold the Health Authorisation required for the transport vehicles used, as required by DPR 327/80? If yes, indicate in Notes the relevant authorisation details." },
  { id: 'svc-6', section: 'TRANSPORT / LOGISTICS', text: "Does the company provide regular hygiene and food-safety training for transport personnel, as provided for by Regulations (EC) 852/2004 and 853/2004?" },
  { id: 'svc-7', section: 'TRANSPORT / LOGISTICS', allowAttachment: true, text: "For temperature-controlled transport, does the company have a system that ensures monitoring, recording and traceability of vehicle temperature for each individual shipment? If yes, indicate in Notes the system used and attach the company procedure/instruction governing temperature monitoring and control during transport.\n\nINFO: International Food Pivot reserves the right to request, on a sampling basis during the supply relationship, the temperature record/temperature trace relating to one or more specific shipments in order to verify compliance with the required transport conditions." },
  { id: 'svc-8', section: 'VEHICLE CLEANING', text: "Do you have a cleaning programme for the cargo compartments of vehicles used for our transports?" },
  { id: 'svc-9', section: 'VEHICLE CLEANING', text: "If yes, are records of these cleaning activities maintained?" },
  { id: 'moca-1', section: 'GMP AND CERTIFICATIONS', text: "Does the company manufacture food contact materials and articles in compliance with Regulation (EC) 2023/2006 and apply Good Manufacturing Practices?" },
  { id: 'moca-2', section: 'GMP AND CERTIFICATIONS', allowAttachment: true, text: "Are you certified according to BRCGS Packaging Materials, AIB, FEFCO, EN 15593 or other relevant standards? If yes, indicate in Notes the certification held." },
  { id: 'moca-3', section: 'SITE HYGIENE', allowAttachment: true, text: "Does the company operate a pest management system? Attach the relevant file." },
  { id: 'moca-4', section: 'LOT IDENTIFICATION', allowAttachment: true, text: "Do you have a lot identification system? If yes, how do you identify the lot and what is the meaning/decoding of the lot code? Enter the decoding in Notes and, if available, attach the procedure." },
  { id: 'moca-6', section: 'MEASURING EQUIPMENT', text: "Do you have a system/procedure for the calibration of product and process measuring and monitoring equipment, ensuring traceability of the results to ACCREDIA-calibrated or equivalent reference equipment?" },
  { id: 'moca-7', section: 'MIGRATION / RELEASE TESTING', allowAttachment: true, text: "Do you periodically perform migration/release tests on the articles supplied to us or on similar/representative articles? If yes, attach the available test report/certificate." },
  { id: 'moca-8', section: 'MIGRATION / RELEASE TESTING', text: "Are the migration/release tests performed by an ACCREDIA-accredited or equivalent laboratory, where applicable? If yes, indicate in Notes the laboratory used." },
];

// MySQL (a differenza di MariaDB) non supporta "ALTER TABLE ... ADD COLUMN
// IF NOT EXISTS": per aggiungere colonne a tabelle create da versioni
// precedenti di schema.sql in modo idempotente, si verifica prima la loro
// esistenza via information_schema.
async function addColumnIfMissing(connection, dbName, table, column, definition) {
  const [rows] = await connection.query(
    'SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?',
    [dbName, table, column]
  );
  if (rows.length) return;
  await connection.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

// Esegue schema.sql (crea database + tabelle) e poi semina gli account di
// default con password hashate (bcrypt non è disponibile in SQL puro).
// Esportata come funzione (invece che IIFE auto-eseguita) così può essere
// chiamata sia da riga di comando ("npm run db:init") sia da app.js
// all'avvio del server: su Railway il "pre-deploy command" gira in un
// contesto separato dove le reference variable del plugin MySQL non sono
// sempre risolte, mentre il servizio web avviato con `node server/app.js`
// le riceve correttamente iniettate.
async function initDb() {
  console.log('🔍 Environment variables:');
  console.log(`   DB_HOST=${process.env.DB_HOST || 'localhost (default)'}`);
  console.log(`   DB_PORT=${process.env.DB_PORT || '3306 (default)'}`);
  console.log(`   DB_USER=${process.env.DB_USER || 'root (default)'}`);
  console.log(`   DB_PASSWORD=${process.env.DB_PASSWORD ? '***' : '(empty)'}`);
  console.log(`   DB_NAME=${process.env.DB_NAME || 'food_quality_manager (default)'}`);

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
    charset: 'utf8mb4'
  });

  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await connection.query(schema);

    const dbName = process.env.DB_NAME || 'food_quality_manager';
    await connection.changeUser({ database: dbName });

    // Colonne aggiunte a impegni_c dopo la creazione iniziale della tabella
    // (vedi commento in schema.sql): idempotente, sicura da rieseguire ad ogni boot.
    await addColumnIfMissing(connection, dbName, 'impegni_c', 'section', 'TEXT NULL');
    await addColumnIfMissing(connection, dbName, 'impegni_c', 'allow_attachment', 'TINYINT(1) NOT NULL DEFAULT 0');
    await addColumnIfMissing(connection, dbName, 'impegni_c', 'section_en', 'TEXT NULL');
    await addColumnIfMissing(connection, dbName, 'impegni_c', 'section_fr', 'TEXT NULL');
    await addColumnIfMissing(connection, dbName, 'impegni_c', 'section_es', 'TEXT NULL');
    await addColumnIfMissing(connection, dbName, 'qual_raw_materials', 'notes', 'TEXT NULL');

    // --- Questionario (impegni_c): seminato SOLO se la tabella e' vuota, mai
    // se contiene gia' qualcosa (anche una sola domanda di test) — l'admin
    // deve poter svuotare/modificare la lista senza che riappaia da sola ad
    // ogni riavvio del server.
    const [impegniCRows] = await connection.query('SELECT COUNT(*) AS n FROM impegni_c');
    if (impegniCRows[0].n === 0) {
      for (let i = 0; i < DEFAULT_IMPEGNI_C.length; i++) {
        const q = DEFAULT_IMPEGNI_C[i];
        // eslint-disable-next-line no-await-in-loop
        await connection.query(
          `INSERT INTO impegni_c (id, it, en, fr, es, section, section_en, section_fr, section_es, allow_attachment, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [q.id, q.text, q.text, q.text, q.text, q.section, q.section, q.section, q.section, q.allowAttachment ? 1 : 0, i]
        );
      }
      console.log(`   Questionario: ${DEFAULT_IMPEGNI_C.length} domande di riferimento inserite (tabella impegni_c era vuota).`);
    }

    // --- Fornitori di test/demo (come nel vecchio client Firebase) ---
    const seedSuppliers = [
      { id: 'test-profile-sys', name: 'TEST', qualPass: 'test', techPass: 'test' },
      { id: 'demo-profile-sys', name: 'DEMO', qualPass: '1', techPass: '1' }
    ];

    for (const s of seedSuppliers) {
      const [rows] = await connection.query('SELECT id FROM suppliers WHERE id = ?', [s.id]);
      if (rows.length) continue; // non sovrascrivere password già impostate/cambiate
      const qualHash = await bcrypt.hash(s.qualPass, SALT_ROUNDS);
      const techHash = await bcrypt.hash(s.techPass, SALT_ROUNDS);
      await connection.query(
        'INSERT INTO suppliers (id, name, qual_pass, tech_pass, status) VALUES (?, ?, ?, ?, ?)',
        [s.id, s.name, qualHash, techHash, 'active']
      );
    }

    // --- Admin di default ---
    const adminUsername = process.env.ADMIN_DEFAULT_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || '0404';

    const [adminRows] = await connection.query('SELECT id FROM admins WHERE username = ?', [adminUsername]);
    if (!adminRows.length) {
      const adminHash = await bcrypt.hash(adminPassword, SALT_ROUNDS);
      await connection.query(
        'INSERT INTO admins (username, password_hash) VALUES (?, ?)',
        [adminUsername, adminHash]
      );
    }

    console.log('✅ Database "food_quality_manager", tabelle e account di default creati/verificati con successo.');
    console.log(`   Admin: ${adminUsername} / ${adminRows.length ? '(esistente, non modificato)' : adminPassword}`);
    console.log('   Fornitori seed: TEST/test/test, DEMO/1/1 (solo se non già presenti)');
  } finally {
    await connection.end();
  }
}

module.exports = { initDb };

// Eseguito solo quando lanciato direttamente ("npm run db:init"), non
// quando importato da app.js.
if (require.main === module) {
  initDb().catch((err) => {
    console.error('❌ Errore inizializzazione database:', err.message);
    console.error('Stack:', err.stack);
    process.exit(1);
  });
}


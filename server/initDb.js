const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');

const SALT_ROUNDS = 10;

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

    await connection.changeUser({ database: process.env.DB_NAME || 'food_quality_manager' });

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


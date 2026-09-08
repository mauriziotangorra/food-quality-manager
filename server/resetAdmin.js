require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

async function resetAdmin() {
  const newPassword = process.argv[2] || process.env.ADMIN_DEFAULT_PASSWORD || '0404';
  const username = process.argv[3] || process.env.ADMIN_DEFAULT_USERNAME || 'admin';

  console.log(`Aggiornamento password per l'utente admin "${username}"...`);

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'food_quality_manager',
    charset: 'utf8mb4'
  });

  try {
    const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    const [rows] = await connection.query('SELECT id FROM admins WHERE username = ?', [username]);

    if (rows.length > 0) {
      await connection.query('UPDATE admins SET password_hash = ? WHERE username = ?', [hash, username]);
      console.log(`✅ Password per l'amministratore "${username}" aggiornata con successo a "${newPassword}".`);
    } else {
      await connection.query('INSERT INTO admins (username, password_hash) VALUES (?, ?)', [username, hash]);
      console.log(`✅ Nuovo account amministratore "${username}" creato con password "${newPassword}".`);
    }
  } catch (err) {
    console.error('❌ Errore durante l\'aggiornamento della password admin:', err.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

resetAdmin();

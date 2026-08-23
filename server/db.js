const mysql = require('mysql2/promise');

// Pool di connessioni MySQL (configurabile tramite variabili d'ambiente)
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'food_quality_manager',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
});

// Esegue fn(conn) dentro una transazione: commit se fn risolve, rollback se
// lancia. Aggiunta come proprietà del pool (invece di cambiare la forma
// dell'export) così tutte le route esistenti che fanno `pool.query(...)`
// restano invariate.
pool.withTransaction = async function withTransaction(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

module.exports = pool;


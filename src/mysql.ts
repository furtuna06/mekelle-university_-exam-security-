import mysql from 'mysql2/promise';

let db: mysql.Pool | null = null;

function getDbConfig() {
  const {
    DB_HOST,
    DB_USER,
    DB_PASSWORD,
    DB_NAME,
  } = process.env;

  if (!DB_HOST || !DB_USER || !DB_PASSWORD || !DB_NAME) {
    console.warn('MySQL environment variables are missing. Set DB_HOST, DB_USER, DB_PASSWORD, and DB_NAME in .env.');
  }

  return {
    host: DB_HOST || 'localhost',
    user: DB_USER || 'root',
    password: DB_PASSWORD || '',
    database: DB_NAME || 'faceguard',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  };
}

export function getDb() {
  if (!db) {
    db = mysql.createPool(getDbConfig());
  }
  return db;
}

export async function testMysqlConnection() {
  const connection = await getDb().getConnection();
  try {
    await connection.ping();
    return true;
  } finally {
    connection.release();
  }
}

import { getDb } from './src/mysql.js';
import fs from 'fs';
import path from 'path';

async function runMigrations() {
  const db = getDb();

  try {
    console.log('Running database migrations...');

    // Read the init.sql file
    const initSqlPath = path.join(process.cwd(), 'init.sql');
    const sqlContent = fs.readFileSync(initSqlPath, 'utf8');

    // Split into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.substring(0, 50) + '...');
        try {
          await db.execute(statement);
        } catch (error) {
          // Ignore errors for CREATE TABLE IF NOT EXISTS and ALTER TABLE IF NOT EXISTS
          if (!error.message.includes('already exists') && !error.message.includes('Duplicate column name')) {
            console.error('Error executing statement:', error.message);
            throw error;
          } else {
            console.log('Statement already applied, skipping...');
          }
        }
      }
    }

    console.log('Database migrations completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runMigrations();
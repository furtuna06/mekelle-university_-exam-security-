import { getDb } from './src/mysql.js';
import fs from 'fs';
import path from 'path';

async function initializeDatabase() {
  const db = getDb();

  try {
    console.log('Initializing database...');

    // Read the init.sql file
    const initSqlPath = path.join(process.cwd(), 'init.sql');
    const sqlContent = fs.readFileSync(initSqlPath, 'utf8');

    // Split into individual statements and filter out comments and empty lines
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.substring(0, 60) + (statement.length > 60 ? '...' : ''));
        try {
          await db.execute(statement);
          console.log('✓ Success');
        } catch (error) {
          // Handle expected errors gracefully
          const errorMsg = error.message.toLowerCase();
          if (errorMsg.includes('already exists') ||
              errorMsg.includes('duplicate column name') ||
              errorMsg.includes('multiple primary key')) {
            console.log('⚠ Skipped (already exists)');
          } else {
            console.error('✗ Error:', error.message);
            throw error;
          }
        }
      }
    }

    console.log('\n🎉 Database initialized successfully!');
    console.log('You can now start the application with: npm run dev');
  } catch (error) {
    console.error('\n❌ Database initialization failed:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Make sure MySQL server is running');
    console.log('2. Check your .env file has correct DB credentials');
    console.log('3. Try running the SQL commands manually in MySQL client');
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

initializeDatabase();
import 'dotenv/config';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

async function setupDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: {
    rejectUnauthorized: true, // Aiven ላይ ለ SSL ያስፈልጋል
  }
  });

  try {
    console.log('Connected to MySQL...');
    console.log("checking connection to:",process.env.DB_HOST);

    // Read init.sql
    const sqlPath = path.join(process.cwd(), 'init.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    // Split into statements
    const statements = sqlContent.split(';').map(s => s.trim()).filter(s => s && !s.startsWith('--'));

    console.log(`Executing ${statements.length} SQL statements...`);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      console.log(`[${i + 1}/${statements.length}] ${stmt.substring(0, 50)}...`);

      try {
        await connection.execute(stmt);
        console.log('✓ OK');
      } catch (error) {
        if (error.message.includes('already exists') || error.message.includes('Duplicate column')) {
          console.log('⚠ Skipped (already exists)');
        } else {
          console.log('✗ Error:', error.message);
        }
      }
    }

    console.log('\n🎉 Database setup complete!');
    console.log('You can now run: npm run dev');

  } catch (error) {
    console.error('Setup failed:', error.message);
  } finally {
    await connection.end();
  }
}

setupDatabase();
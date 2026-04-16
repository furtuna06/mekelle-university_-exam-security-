import { getDb } from './src/mysql.js';

async function addSoftDeleteColumns() {
  const db = getDb();

  try {
    console.log('Adding soft delete columns to attendance_logs...');

    // Add deleted column
    try {
      await db.execute('ALTER TABLE attendance_logs ADD COLUMN deleted BOOLEAN DEFAULT FALSE');
      console.log('✓ Added deleted column');
    } catch (error) {
      if (error.message.includes('Duplicate column name')) {
        console.log('✓ deleted column already exists');
      } else {
        throw error;
      }
    }

    // Add deleted_at column
    try {
      await db.execute('ALTER TABLE attendance_logs ADD COLUMN deleted_at TIMESTAMP NULL');
      console.log('✓ Added deleted_at column');
    } catch (error) {
      if (error.message.includes('Duplicate column name')) {
        console.log('✓ deleted_at column already exists');
      } else {
        throw error;
      }
    }

    console.log('Soft delete columns added successfully!');
  } catch (error) {
    console.error('Failed to add columns:', error.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

addSoftDeleteColumns();
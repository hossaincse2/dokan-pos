const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../data');
const dbPath = path.join(dataDir, 'pos.db');

try {
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log('✓ Database deleted successfully');
  } else {
    console.log('ℹ No database file found');
  }

  // Also remove WAL files if they exist
  const walPath = `${dbPath}-wal`;
  const shmPath = `${dbPath}-shm`;

  if (fs.existsSync(walPath)) {
    fs.unlinkSync(walPath);
    console.log('✓ WAL file deleted');
  }

  if (fs.existsSync(shmPath)) {
    fs.unlinkSync(shmPath);
    console.log('✓ SHM file deleted');
  }

  console.log('\n✅ Database reset complete. Restart the app to recreate.');
} catch (error) {
  console.error('❌ Error resetting database:', error.message);
  process.exit(1);
}

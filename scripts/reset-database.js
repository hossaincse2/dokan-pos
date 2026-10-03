const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

// Get user data path
const userDataPath = app ? app.getPath('userData') : path.join(process.env.APPDATA || process.env.HOME, 'karbar-pos');
const dataDir = path.join(userDataPath, 'data');
const dbPath = path.join(dataDir, 'pos.db');

console.log('🗄️  Database path:', dbPath);

// Check if database exists
if (fs.existsSync(dbPath)) {
  console.log('📦 Backing up existing database...');
  const backupPath = path.join(dataDir, `pos_backup_${Date.now()}.db`);
  fs.copyFileSync(dbPath, backupPath);
  console.log('✅ Backup created:', backupPath);
  
  console.log('🗑️  Deleting old database...');
  fs.unlinkSync(dbPath);
  console.log('✅ Old database deleted');
} else {
  console.log('ℹ️  No existing database found');
}

console.log('✨ Database will be recreated on next app start');
console.log('');
console.log('Please restart the application now.');

#!/usr/bin/env node

/**
 * Build Script for Different Clients
 * 
 * Usage:
 *   node build-for-client.js karbar
 *   node build-for-client.js megastar
 *   node build-for-client.js custom https://your-api.com "Your Company"
 */

const fs = require('fs');
const { execSync } = require('child_process');
const configs = require('./build-config');

// Get client name from command line
const clientName = process.argv[2];

if (!clientName) {
  console.error('❌ Error: Please specify a client name');
  console.log('\nUsage:');
  console.log('  node build-for-client.js karbar');
  console.log('  node build-for-client.js megastar');
  console.log('  node build-for-client.js custom https://your-api.com "Your Company"');
  console.log('\nAvailable clients:', Object.keys(configs).join(', '));
  process.exit(1);
}

let config;

if (clientName === 'custom') {
  // Custom build with command line arguments
  const apiUrl = process.argv[3];
  const companyName = process.argv[4] || 'POS System';
  
  if (!apiUrl) {
    console.error('❌ Error: Please specify API URL for custom build');
    console.log('Usage: node build-for-client.js custom https://your-api.com "Your Company"');
    process.exit(1);
  }
  
  config = {
    API_BASE_URL: apiUrl,
    COMPANY_NAME: companyName,
    APP_NAME: `${companyName} POS`
  };
} else {
  // Use predefined config
  config = configs[clientName];
  
  if (!config) {
    console.error(`❌ Error: Unknown client "${clientName}"`);
    console.log('Available clients:', Object.keys(configs).join(', '));
    process.exit(1);
  }
}

console.log('🚀 Building for:', clientName);
console.log('📡 API Base URL:', config.API_BASE_URL);
console.log('🏢 Company:', config.COMPANY_NAME);
console.log('📱 App Name:', config.APP_NAME);
console.log('');

// Create .env file with configuration
const envContent = `# Auto-generated for ${clientName} build
API_BASE_URL=${config.API_BASE_URL}
COMPANY_NAME=${config.COMPANY_NAME}
APP_NAME=${config.APP_NAME}
VITE_APP_ENV=production

# Store Configuration
VITE_DEFAULT_STORE_ID=2
VITE_PER_PAGE=12

# Sync Configuration
VITE_AUTO_SYNC_ENABLED=true
VITE_SYNC_INTERVAL_MINUTES=5

# Database Configuration
DB_PATH=./data/pos.db

# Logging
LOG_LEVEL=info
LOG_TO_FILE=true
`;

fs.writeFileSync('.env', envContent);
console.log('✅ Created .env file');

// Run build
console.log('🔨 Building application...\n');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('\n✅ Build completed successfully!');
  console.log('\n📦 To create installer, run:');
  console.log('   npm run build:installer');
} catch (error) {
  console.error('\n❌ Build failed');
  process.exit(1);
}

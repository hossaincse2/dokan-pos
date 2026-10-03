// Main entry point for Electron
// This file handles loading the TypeScript main process

// Load the main process directly
// Path aliases are resolved during TypeScript compilation
try {
  require('./dist/main/main/index.js');
} catch (error) {
  console.error('Error loading main process:');
  console.error(error);
  console.error('\nPlease ensure the app is built before running:');
  console.error('  npm run build:main');
  process.exit(1);
}

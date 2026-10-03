// Simple script to generate a basic icon
// Run: node scripts/generate-icon.js

const fs = require('fs');
const path = require('path');

console.log('📝 Icon Generation Guide\n');
console.log('Option 1: Use online tool');
console.log('  1. Go to: https://www.canva.com or https://www.figma.com');
console.log('  2. Create 512x512 image with "POS" text');
console.log('  3. Export as PNG');
console.log('  4. Save to: assets/icon.png\n');

console.log('Option 2: Use the HTML generator');
console.log('  1. Open: assets/create-icon.html in browser');
console.log('  2. Icon will auto-download');
console.log('  3. Move to: assets/icon.png\n');

console.log('Option 3: Use existing logo');
console.log('  1. Resize your logo to 512x512');
console.log('  2. Save as: assets/icon.png\n');

// Check if icon exists
const iconPath = path.join(__dirname, '..', 'assets', 'icon.png');
if (fs.existsSync(iconPath)) {
  console.log('✅ Icon found at: assets/icon.png');
  console.log('   You can proceed with building!\n');
} else {
  console.log('⚠️  No icon found at: assets/icon.png');
  console.log('   The build will work but may use default icon.\n');
}

console.log('Ready to build? Run: npm run package:win');

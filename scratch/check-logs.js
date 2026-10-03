const path = require('path');
const os = require('os');
const fs = require('fs');

const userDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'electron-pos');
console.log('Searching for logs in:', userDataPath);

function searchLogs(dir) {
  try {
    if (!fs.existsSync(dir)) {
      console.log('Directory does not exist:', dir);
      return;
    }
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        searchLogs(fullPath);
      } else if (file.endsWith('.log') || file.includes('log')) {
        console.log('Found log file:', fullPath, `(${stat.size} bytes)`);
        // Print the last 50 lines of the log file
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n');
        console.log(`--- Last 50 lines of ${file} ---`);
        console.log(lines.slice(-50).join('\n'));
        console.log('--------------------------------');
      }
    }
  } catch (e) {
    console.error(e);
  }
}

searchLogs(userDataPath);

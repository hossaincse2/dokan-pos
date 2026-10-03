const { spawn } = require('child_process');
const path = require('path');

// Start Vite dev server
const vite = spawn('npm', ['run', 'dev:renderer'], {
  shell: true,
  stdio: 'inherit'
});

// Wait a bit for Vite to start, then start Electron
setTimeout(() => {
  const electron = spawn('electron', ['.'], {
    shell: true,
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'development',
      ELECTRON_DISABLE_SECURITY_WARNINGS: 'true'
    }
  });

  electron.on('close', () => {
    vite.kill();
    process.exit();
  });
}, 3000);

process.on('SIGINT', () => {
  vite.kill();
  process.exit();
});

import { app, BrowserWindow, Menu } from 'electron';
import path from 'path';
import { getDatabaseService } from './database';
import { setupIpcHandlers } from './ipc/handlers';
import { getSyncService } from './services/sync.service';
import { getApiService } from './services/api.service';

// Load environment variables in development only
if (!app.isPackaged) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('dotenv').config();
  } catch (e) {
    console.log('dotenv not available, using default config');
  }
}

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: false, // Disable web security for local file loading
    },
    show: false,
  });

  // Load the app
  // Check both NODE_ENV and app.isPackaged to detect development mode
  const isDev = process.env.NODE_ENV === 'development' && !app.isPackaged;
  
  if (isDev) {
    // Development: Load from Vite dev server
    console.log('[Development] Loading from Vite dev server...');
    mainWindow.loadURL('http://localhost:5173');
  } else {
    // Production: Load from packaged files
    // In packaged app: __dirname = resources/app.asar/dist/main/main
    // In built app: __dirname = dist/main/main
    // Renderer is at: dist/renderer/index.html or resources/app.asar/dist/renderer/index.html
    const rendererPath = path.join(__dirname, '../../renderer/index.html');
    
    console.log('[Production] Loading renderer from:', rendererPath);
    console.log('[Production] __dirname:', __dirname);
    console.log('[Production] app.getAppPath():', app.getAppPath());
    console.log('[Production] Resolved path:', path.resolve(rendererPath));
    
    mainWindow.loadFile(rendererPath).catch((err) => {
      console.error('[Production] Failed to load renderer:', err);
      // Show error dialog
      const { dialog } = require('electron');
      dialog.showErrorBox('Failed to Load', `Could not load application: ${err.message}`);
    });
  }
  
  // Log any console messages from renderer
  mainWindow.webContents.on('console-message', (_event, _level, message, line, sourceId) => {
    console.log(`[Renderer Console] ${message} (${sourceId}:${line})`);
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('[Load Error]', errorCode, errorDescription);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[Load Success] Renderer loaded successfully');
  });

  mainWindow.once('ready-to-show', () => {
    console.log('[Window] Ready to show');
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // Prevent window from hiding
  mainWindow.on('hide', () => {
    console.log('[Window] Hide event triggered');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Create application menu
  createMenu();

  // Set sync service main window
  const syncService = getSyncService();
  syncService.setMainWindow(mainWindow);

  // Set API service main window for token expiry notifications
  const apiService = getApiService();
  apiService.setMainWindow(mainWindow);

  return mainWindow;
}

function createMenu() {
  const template: any = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Settings',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            mainWindow?.webContents.send('navigate', '/settings');
          },
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Sync',
      submenu: [
        {
          label: 'Start Sync',
          accelerator: 'CmdOrCtrl+S',
          click: async () => {
            try {
              const syncService = getSyncService();
              await syncService.startSync();
            } catch (error) {
              console.error('Sync error:', error);
            }
          },
        },
        {
          label: 'View Sync History',
          click: () => {
            mainWindow?.webContents.send('navigate', '/sync-history');
          },
        },
      ],
    },
    {
      label: 'Database',
      submenu: [
        {
          label: 'Sync from API',
          click: async () => {
            try {
              const api = getApiService();
              
              // Check if authenticated
              if (!api.isAuthenticated()) {
                const { dialog } = await import('electron');
                dialog.showMessageBox(mainWindow!, {
                  type: 'warning',
                  title: 'Authentication Required',
                  message: 'Please login with real credentials first',
                  detail: 'You need to login with valid credentials from admin.karbar.shop to sync data from the server.',
                  buttons: ['OK']
                });
                return;
              }

              const sync = getSyncService();
              await sync.startSync();
              
              const { dialog } = await import('electron');
              dialog.showMessageBox(mainWindow!, {
                type: 'info',
                title: 'Sync Complete',
                message: 'Data synced successfully!',
                detail: 'Products, categories, customers, and payment methods have been updated from the server.',
                buttons: ['OK']
              });
            } catch (error: any) {
              const { dialog } = await import('electron');
              dialog.showErrorBox('Sync Failed', error.message);
            }
          },
        },
        {
          label: 'Force Full Sync (Reset & Sync)',
          click: async () => {
            try {
              const api = getApiService();
              
              // Check if authenticated
              if (!api.isAuthenticated()) {
                const { dialog } = await import('electron');
                dialog.showMessageBox(mainWindow!, {
                  type: 'warning',
                  title: 'Authentication Required',
                  message: 'Please login with real credentials first',
                  detail: 'You need to login with valid credentials from admin.karbar.shop to sync data from the server.',
                  buttons: ['OK']
                });
                return;
              }

              const { dialog } = await import('electron');
              const response = await dialog.showMessageBox(mainWindow!, {
                type: 'question',
                title: 'Force Full Sync',
                message: 'This will clear all products and re-sync from the server.',
                detail: 'Are you sure you want to continue? This will delete all local product data.',
                buttons: ['Cancel', 'Yes, Force Sync'],
                defaultId: 0,
                cancelId: 0
              });

              if (response.response === 1) {
                const db = getDatabaseService().getDatabase();
                
                // Clear products table
                db.prepare('DELETE FROM products').run();
                
                // Clear last sync timestamp to force full sync
                db.prepare('DELETE FROM meta WHERE key = ?').run('last_sync_at');
                
                // Start sync
                const sync = getSyncService();
                await sync.startSync();
                
                dialog.showMessageBox(mainWindow!, {
                  type: 'info',
                  title: 'Full Sync Complete',
                  message: 'All products have been re-synced from the server!',
                  detail: 'The barcode scanner should now work correctly.',
                  buttons: ['OK']
                });
                
                // Reload the window to refresh products
                mainWindow?.webContents.reload();
              }
            } catch (error: any) {
              const { dialog } = await import('electron');
              dialog.showErrorBox('Sync Failed', error.message);
            }
          },
        },
        {
          label: 'Clear Sync Queue',
          click: async () => {
            try {
              const db = getDatabaseService().getDatabase();
              const result = db.prepare('DELETE FROM sync_queue WHERE synced_at IS NULL').run();
              
              const { dialog } = await import('electron');
              dialog.showMessageBox(mainWindow!, {
                type: 'info',
                title: 'Sync Queue Cleared',
                message: `Cleared ${result.changes} pending sync items`,
                detail: 'Failed order syncs have been removed. You can now create new orders.',
                buttons: ['OK']
              });
            } catch (error: any) {
              const { dialog } = await import('electron');
              dialog.showErrorBox('Clear Failed', error.message);
            }
          },
        },
        { type: 'separator' },
        {
          label: 'Reset Database & Sync',
          click: async () => {
            try {
              const api = getApiService();
              
              const { dialog } = await import('electron');
              const response = await dialog.showMessageBox(mainWindow!, {
                type: 'warning',
                title: 'Reset Database & Sync',
                message: 'This will delete the old database and create a fresh one, then sync all data from the server.',
                detail: 'All local data will be lost. Are you sure you want to continue?',
                buttons: ['Cancel', 'Yes, Reset & Sync'],
                defaultId: 0,
                cancelId: 0
              });

              if (response.response === 1) {
                // Reset database (deletes and recreates)
                const db = getDatabaseService();
                db.reset();
                
                // Check if authenticated
                if (!api.isAuthenticated()) {
                  dialog.showMessageBox(mainWindow!, {
                    type: 'info',
                    title: 'Database Reset',
                    message: 'Database has been reset successfully!',
                    detail: 'Please login with your credentials, then sync data from the server.',
                    buttons: ['OK']
                  });
                  mainWindow?.webContents.reload();
                  return;
                }
                
                // Start sync
                const sync = getSyncService();
                await sync.startSync();
                
                dialog.showMessageBox(mainWindow!, {
                  type: 'info',
                  title: 'Reset & Sync Complete',
                  message: 'Database has been reset and all data synced successfully!',
                  detail: 'The app will now reload.',
                  buttons: ['OK']
                });
                
                // Reload the window
                mainWindow?.webContents.reload();
              }
            } catch (error: any) {
              const { dialog } = await import('electron');
              dialog.showErrorBox('Reset & Sync Failed', error.message);
            }
          },
        },
        { type: 'separator' },
        {
          label: 'Reset Database Only',
          click: async () => {
            const { dialog } = await import('electron');
            const response = await dialog.showMessageBox(mainWindow!, {
              type: 'warning',
              title: 'Reset Database',
              message: 'This will delete the old database and create a fresh empty one.',
              detail: 'All local data will be lost. You will need to login and sync again.',
              buttons: ['Cancel', 'Yes, Reset'],
              defaultId: 0,
              cancelId: 0
            });

            if (response.response === 1) {
              const db = getDatabaseService();
              db.reset();
              
              dialog.showMessageBox(mainWindow!, {
                type: 'info',
                title: 'Database Reset',
                message: 'Database has been reset successfully!',
                detail: 'The app will now reload. Please login and sync data.',
                buttons: ['OK']
              });
              
              mainWindow?.webContents.reload();
            }
          },
        },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => {
            mainWindow?.webContents.send('show-about');
          },
        },
        {
          label: 'Documentation',
          click: async () => {
            const { shell } = await import('electron');
            shell.openExternal('https://github.com/yourcompany/karbar-pos');
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// App lifecycle events
app.whenReady().then(async () => {
  // Initialize database
  const db = getDatabaseService();
  db.initialize();

  // Load API Base URL from database settings and update API service
  try {
    const database = db.getDatabase();
    const settings = database.prepare('SELECT api_base_url FROM app_settings WHERE id = 1').get() as any;
    
    if (settings && settings.api_base_url) {
      const api = getApiService();
      api.updateBaseURL(settings.api_base_url);
      console.log('✅ Loaded API URL from database settings:', settings.api_base_url);
    }
  } catch (error) {
    console.log('Could not load API URL from database, using defaults');
  }

  console.log('[App] Database initialized. Use "Sync from API" to load data from server.');

  // Setup IPC handlers
  setupIpcHandlers();

  // Initialize auto-sync if enabled
  try {
    const database = db.getDatabase();
    const settings = database.prepare('SELECT auto_sync_enabled, sync_interval_minutes FROM app_settings WHERE id = 1').get() as any;
    
    console.log('🔍 [APP-INIT] Checking auto-sync settings:', settings);
    
    if (settings && settings.auto_sync_enabled) {
      const syncService = getSyncService();
      const intervalMinutes = settings.sync_interval_minutes || 5;
      console.log(`🔄 [APP-INIT] Auto-sync is ENABLED. Interval: ${intervalMinutes} minutes`);
      syncService.startAutoSync(intervalMinutes);
      console.log(`✅ [APP-INIT] Auto-sync initialized successfully`);
    } else {
      console.log('ℹ️ [APP-INIT] Auto-sync is DISABLED in settings');
      if (settings) {
        console.log('   - auto_sync_enabled:', settings.auto_sync_enabled);
        console.log('   - sync_interval_minutes:', settings.sync_interval_minutes);
      }
    }
  } catch (error) {
    console.error('❌ [APP-INIT] Failed to initialize auto-sync:', error);
  }

  // Create window
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  // Stop auto-sync
  const syncService = getSyncService();
  syncService.stopAutoSync();

  // Close database
  const db = getDatabaseService();
  db.close();
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

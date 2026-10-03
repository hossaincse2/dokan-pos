import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

// Check if electronAPI is available
if (!window.electronAPI) {
  console.error('electronAPI is not available! Preload script may not have loaded correctly.');
  document.body.innerHTML = `
    <div style="padding: 20px; font-family: Arial, sans-serif;">
      <h1 style="color: red;">Error: Electron API Not Available</h1>
      <p>The preload script did not load correctly. Please check:</p>
      <ul>
        <li>Preload script path is correct</li>
        <li>Context isolation is enabled</li>
        <li>The app was built correctly</li>
      </ul>
      <p>Try rebuilding the app with: <code>npm run build</code></p>
    </div>
  `;
} else {
  console.log('electronAPI is available, starting React app...');
  
  // Add global error handler
  window.addEventListener('error', (event) => {
    console.error('[Global Error]', event.error);
  });
  
  window.addEventListener('unhandledrejection', (event) => {
    console.error('[Unhandled Promise Rejection]', event.reason);
  });
  
  try {
    const root = document.getElementById('root');
    if (!root) {
      throw new Error('Root element not found!');
    }
    
    console.log('Creating React root...');
    ReactDOM.createRoot(root).render(
      <React.StrictMode>
        <ErrorBoundary>
          <Provider store={store}>
            <App />
          </Provider>
        </ErrorBoundary>
      </React.StrictMode>
    );
    console.log('React app rendered successfully');
  } catch (error) {
    console.error('Error rendering React app:', error);
    document.body.innerHTML = `
      <div style="padding: 20px; font-family: Arial, sans-serif;">
        <h1 style="color: red;">Error Starting Application</h1>
        <p>${error}</p>
        <pre style="background: #f5f5f5; padding: 10px; overflow: auto;">${error instanceof Error ? error.stack : ''}</pre>
      </div>
    `;
  }
}

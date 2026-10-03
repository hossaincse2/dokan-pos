import { useEffect, useState } from 'react';
import { HashRouter } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from './store';
import { fetchSettings } from './store/slices/settingsSlice';
import { updateProgress, updateStatus } from './store/slices/syncSlice';
import LoginPage from './pages/LoginPage';
import SetupWizard from './pages/SetupWizard';
import Layout from './components/Layout';
import './App.css';

function App() {
  const dispatch = useDispatch<AppDispatch>();
  const authState = useSelector((state: RootState) => state.auth);
  const [setupComplete, setSetupComplete] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);

  useEffect(() => {
    console.log('[App] Component mounted');
    
    // Check if setup is complete
    const isSetupComplete = localStorage.getItem('setupComplete') === 'true';
    setSetupComplete(isSetupComplete);
    setCheckingSetup(false);
    
    // Setup sync event listeners once on mount
    try {
      window.electronAPI.onSyncProgress((data) => {
        dispatch(updateProgress(data));
      });

      window.electronAPI.onSyncStatusChanged((data) => {
        dispatch(updateStatus(data));
      });
      console.log('[App] Sync listeners setup complete');
    } catch (error: any) {
      console.error('[App] Error setting up sync listeners:', error);
    }

    // Setup token expiry listener
    try {
      window.electronAPI.onTokenExpired(() => {
        console.log('[App] 🔓 Token expired - logging out user');
        
        // Clear auth state from localStorage
        localStorage.removeItem('auth');
        
        // Show notification to user
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-4 rounded-lg shadow-lg z-50 animate-fade-in';
        notification.innerHTML = `
          <div class="flex items-center gap-3">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <div>
              <p class="font-semibold">Session Expired</p>
              <p class="text-sm">Please login again to continue</p>
            </div>
          </div>
        `;
        document.body.appendChild(notification);
        
        // Reload after 2 seconds
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      });
      console.log('[App] Token expiry listener setup complete');
    } catch (error: any) {
      console.error('[App] Error setting up token expiry listener:', error);
    }
  }, [dispatch]);

  // Load settings when authenticated
  useEffect(() => {
    if (authState.isAuthenticated) {
      console.log('[App] User authenticated, loading settings...');
      dispatch(fetchSettings()).catch((error: any) => {
        console.error('[App] fetchSettings failed:', error);
      });
    }
  }, [authState.isAuthenticated, dispatch]);

  console.log('[App] Rendering - setupComplete:', setupComplete, 'isAuthenticated:', authState.isAuthenticated);

  // Show loading while checking setup
  if (checkingSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show setup wizard on first run
  if (!setupComplete) {
    console.log('[App] First run, showing SetupWizard');
    return <SetupWizard onComplete={() => setSetupComplete(true)} />;
  }

  // Show login page if not authenticated
  if (!authState.isAuthenticated) {
    console.log('[App] Not authenticated, showing LoginPage');
    return <LoginPage />;
  }

  // Show main app
  console.log('[App] Authenticated! Rendering main app with Layout');
  
  return (
    <HashRouter>
      <Layout />
    </HashRouter>
  );
}

export default App;

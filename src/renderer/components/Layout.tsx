import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useEffect, useState, useRef } from 'react';
import { AppDispatch, RootState } from '../store';
import { logout } from '../store/slices/authSlice';
import { startSync } from '../store/slices/syncSlice';
import { fetchSettings, fetchSiteSettings } from '../store/slices/settingsSlice';
import POSPage from '../pages/POSPage';
import OrdersPage from '../pages/OrdersPage';
import ProductsPage from '../pages/ProductsPage';
import SettingsPage from '../pages/SettingsPage';
import SyncHistoryPage from '../pages/SyncHistoryPage';
import ExpensesPage from '../pages/ExpensesPage';
import ReportsPage from '../pages/ReportsPage';

export default function Layout() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const { siteSettings, settings } = useSelector((state: RootState) => state.settings);
  const { isRunning, queueCount, lastSyncAt } = useSelector((state: RootState) => state.sync);
  const [isOffline, setIsOffline] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [reportsDropdownOpen, setReportsDropdownOpen] = useState(false);
  const reportsDropdownRef = useRef<HTMLDivElement>(null);

  // Check actual internet connectivity (not just browser online status)
  const checkInternetConnection = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch('https://www.google.com/favicon.ico', {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      console.log('[Layout] Internet connection check: ONLINE');
      return true;
    } catch (error) {
      console.log('[Layout] Internet connection check: OFFLINE');
      return false;
    }
  };

  // Check for offline mode and internet connectivity on mount
  useEffect(() => {
    const checkOfflineMode = async () => {
      try {
        const authData = localStorage.getItem('auth');
        if (authData) {
          const parsed = JSON.parse(authData);
          setIsOffline(parsed.offline_mode === true);
        }
      } catch (error) {
        console.error('Error checking offline mode:', error);
      }
    };
    
    checkOfflineMode();

    // Initial settings pull
    dispatch(fetchSettings());
    dispatch(fetchSiteSettings());

    // Initial internet check
    checkInternetConnection().then(setIsOnline);

    // Listen for browser online/offline events
    const handleOnline = async () => {
      console.log('[Layout] Browser detected online, verifying...');
      const actuallyOnline = await checkInternetConnection();
      setIsOnline(actuallyOnline);
    };

    const handleOffline = () => {
      console.log('[Layout] Browser detected offline');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
    
    // Listen for reconnection events
    window.electronAPI.onReconnected?.(() => {
      console.log('[Layout] Reconnected to internet!');
      setIsOffline(false);
      setReconnecting(false);
      
      // Show success notification
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg z-50 animate-fade-in';
      notification.innerHTML = `
        <div class="flex items-center gap-3">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p class="font-semibold">Back Online!</p>
            <p class="text-sm">Syncing with server...</p>
          </div>
        </div>
      `;
      document.body.appendChild(notification);
      
      setTimeout(() => {
        notification.remove();
      }, 3000);
      
      // Auto-sync when reconnected
      dispatch(startSync());
    });
  }, [dispatch]);

  // Periodic internet connectivity check
  useEffect(() => {
    const checkInterval = setInterval(async () => {
      const online = await checkInternetConnection();
      setIsOnline(online);
    }, 10000); // Check every 10 seconds
    
    return () => clearInterval(checkInterval);
  }, []);

  // Periodic reconnection check when offline
  useEffect(() => {
    if (!isOffline) return;
    
    const checkInterval = setInterval(async () => {
      if (!reconnecting) {
        setReconnecting(true);
        console.log('[Layout] Checking for internet connection...');
        
        try {
          await dispatch(startSync());
          // If sync succeeds, we're back online
          setIsOffline(false);
        } catch (error) {
          // Still offline
          console.log('[Layout] Still offline');
        } finally {
          setReconnecting(false);
        }
      }
    }, 30000); // Check every 30 seconds
    
    return () => clearInterval(checkInterval);
  }, [isOffline, reconnecting, dispatch]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
      if (reportsDropdownRef.current && !reportsDropdownRef.current.contains(event.target as Node)) {
        setReportsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  console.log('[Layout] Rendering, user:', user);

  const handleLogout = async () => {
    setUserDropdownOpen(false);
    console.log('[Layout] Logout clicked');
    await dispatch(logout());
    navigate('/');
  };

  const handleSync = async () => {
    console.log('[Layout] Sync clicked');
    
    try {
      await dispatch(startSync()).unwrap();
      
      // Show success notification
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg z-50 animate-fade-in';
      notification.innerHTML = `
        <div class="flex items-center gap-3">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p class="font-semibold">Sync Complete!</p>
            <p class="text-sm">Data synced successfully</p>
          </div>
        </div>
      `;
      document.body.appendChild(notification);
      
      setTimeout(() => {
        notification.remove();
      }, 3000);
    } catch (error: any) {
      console.error('[Layout] Sync failed:', error);
      
      // Show error notification
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-4 rounded-lg shadow-lg z-50 animate-fade-in';
      
      const errorMessage = error.message || error.toString() || 'Sync failed';
      const isNetworkError = errorMessage.includes('internet') || 
                            errorMessage.includes('connection') || 
                            errorMessage.includes('network');
      
      notification.innerHTML = `
        <div class="flex items-center gap-3">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${isNetworkError ? 'M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414' : 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'}" />
          </svg>
          <div>
            <p class="font-semibold">${isNetworkError ? 'No Internet Connection' : 'Sync Failed'}</p>
            <p class="text-sm">${errorMessage}</p>
          </div>
        </div>
      `;
      document.body.appendChild(notification);
      
      setTimeout(() => {
        notification.remove();
      }, 5000);
    }
  };

  console.log('[Layout] About to render layout HTML');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-indigo-700 shadow-lg">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3">
            <div className="flex items-center space-x-8">
              {/* Logo/Brand */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-md">
                  <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold text-white leading-tight">{siteSettings?.title || siteSettings?.company_name || user?.company_name || 'POS System'}</h1>
                    <span className="bg-white/20 text-white text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wider">v2.0</span>
                  </div>
                  <p className="text-xs text-blue-100">Point of Sale &bull; v2.0</p>
                </div>
              </div>
              
              {/* Navigation */}
              <nav className="flex space-x-1">
                <Link
                  to="/pos"
                  className="text-white hover:bg-white/20 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  POS
                </Link>
                <Link
                  to="/orders"
                  className="text-white hover:bg-white/20 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Orders
                </Link>
                <Link
                  to="/products"
                  className="text-white hover:bg-white/20 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  Products
                </Link>
                <Link
                  to="/expenses"
                  className="text-white hover:bg-white/20 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Expenses
                </Link>
                {/* Reports Dropdown */}
                <div className="relative" ref={reportsDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setReportsDropdownOpen(!reportsDropdownOpen)}
                    className="text-white hover:bg-white/20 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Reports
                    <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${reportsDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {reportsDropdownOpen && (
                    <div className="absolute left-0 mt-2 w-72 bg-white rounded-xl shadow-2xl py-2 z-50 border border-gray-100 animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="px-3.5 py-1.5 border-b border-gray-100 flex items-center justify-between">
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Reports & Analytics</span>
                        <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-1.5 py-0.5 rounded">A4 / PDF</span>
                      </div>
                      <div className="py-1 max-h-[75vh] overflow-y-auto">
                        {[
                          { id: 'dashboard', label: 'Dashboard', desc: 'KPI cards & executive summary', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
                          { id: 'sales', label: 'Total Sales', desc: 'Detailed sales & invoice records', icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z' },
                          { id: 'purchase', label: 'Total Purchase', desc: 'Supplier bills & stock receipts', icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z' },
                          { id: 'expense', label: 'Total Expense', desc: 'Operational costs & petty cash', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' },
                          { id: 'profit', label: 'Total Profit', desc: 'Gross margin & net profit analysis', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
                          { id: 'due', label: 'Total Due', desc: 'Customer unpaid balance list', icon: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
                          { id: 'due_collection', label: 'Due Collection', desc: 'Recovered credit history', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
                          { id: 'best_sellers', label: 'Best Selling Products', desc: 'Top volume & revenue earners', icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z' },
                          { id: 'low_stock', label: 'Low Stock', desc: 'Inventory alerts & reorder levels', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
                          { id: 'payments', label: 'Cash/Card/bKash/Nagad sales', desc: 'Payment method breakdown', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
                        ].map((item) => (
                          <Link
                            key={item.id}
                            to={`/reports?tab=${item.id}`}
                            onClick={() => setReportsDropdownOpen(false)}
                            className="flex items-center gap-3 px-3.5 py-2 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                          >
                            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                              </svg>
                            </div>
                            <div className="overflow-hidden">
                              <p className="font-semibold text-gray-800 leading-tight truncate">{item.label}</p>
                              <p className="text-[10px] text-gray-400 truncate">{item.desc}</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

              </nav>
            </div>

            <div className="flex items-center space-x-3">
              {/* Online/Offline Indicator */}
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                isOnline 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                <div className="relative">
                  <div className={`w-2.5 h-2.5 rounded-full ${
                    isOnline ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  {isOnline && (
                    <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-green-500 animate-ping opacity-75"></div>
                  )}
                </div>
                <span className={`text-xs font-semibold ${
                  isOnline ? 'text-green-700' : 'text-red-700'
                }`}>
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              
              {/* Sync Status */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleSync}
                  disabled={isRunning || isOffline || !isOnline}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-all shadow-sm hover:shadow-md"
                  title={isOffline ? 'Sync disabled in offline mode' : !isOnline ? 'No internet connection' : ''}
                >
                  {isRunning ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Syncing...
                    </span>
                  ) : (
                    'Sync'
                  )}
                </button>
                {queueCount > 0 && (
                  <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
                    {queueCount} pending
                  </span>
                )}
                {lastSyncAt && (
                  <span className="text-xs text-gray-300">
                    Last: {new Date(lastSyncAt).toLocaleTimeString()}
                  </span>
                )}
              </div>

              {/* Super Admin / User Dropdown Menu */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg border transition-all cursor-pointer select-none ${
                    userDropdownOpen
                      ? 'bg-white/25 border-white/40 shadow-inner'
                      : 'bg-white/10 hover:bg-white/20 border-white/20 hover:border-white/30'
                  }`}
                  aria-expanded={userDropdownOpen}
                  aria-haspopup="true"
                >
                  <div className="w-8 h-8 bg-white text-blue-600 rounded-full flex items-center justify-center font-bold text-xs shadow-sm">
                    {user?.name ? user.name.charAt(0).toUpperCase() : 'S'}
                  </div>
                  <div className="text-left hidden sm:block">
                    <span className="text-sm font-semibold text-white block leading-tight">
                      {user?.name || 'Super Admin'}
                    </span>
                    <span className="text-[10px] text-blue-100 font-medium block">
                      {user?.role || 'Administrator'}
                    </span>
                  </div>
                  <svg
                    className={`w-4 h-4 text-white/90 transition-transform duration-200 ${
                      userDropdownOpen ? 'rotate-180 text-white' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown Menu Popup */}
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-60 bg-white rounded-xl shadow-2xl py-2 z-50 border border-gray-100 animate-fade-in divide-y divide-gray-100">
                    {/* User Profile Info Header */}
                    <div className="px-4 py-3 bg-gray-50/80">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0">
                          {user?.name ? user.name.charAt(0).toUpperCase() : 'S'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-gray-900 truncate">
                            {user?.name || 'Super Admin'}
                          </p>
                          <p className="text-xs text-gray-500 font-medium truncate">
                            {user?.email || user?.phone || user?.role || 'Administrator'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-1.5">
                      <Link
                        to="/settings"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-gray-100 group-hover:bg-blue-100 flex items-center justify-center text-gray-600 group-hover:text-blue-600 transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800 group-hover:text-blue-700 leading-tight">Settings</p>
                          <p className="text-[11px] text-gray-400">POS & Store Settings</p>
                        </div>
                      </Link>

                      <Link
                        to="/sync-history"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-gray-100 group-hover:bg-blue-100 flex items-center justify-center text-gray-600 group-hover:text-blue-600 transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800 group-hover:text-blue-700 leading-tight">Sync History</p>
                          <p className="text-[11px] text-gray-400">View synchronization logs</p>
                        </div>
                      </Link>
                    </div>

                    {/* Logout Action */}
                    <div className="py-1.5">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors group text-left cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-lg bg-red-50 group-hover:bg-red-100 flex items-center justify-center text-red-600 transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-semibold text-red-600 leading-tight">Logout</p>
                          <p className="text-[11px] text-red-400">Sign out of POS session</p>
                        </div>
                      </button>
                    </div>

                    {/* Version 2 Badge */}
                    <div className="px-4 py-2 bg-gray-50 text-center border-t border-gray-100">
                      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Karbar POS v2.0.0</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Full Width */}
      <main className="w-full h-full">
        <Routes>
          <Route path="/" element={<POSPage />} />
          <Route path="/pos" element={<POSPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/expenses" element={<ExpensesPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/sync-history" element={<SyncHistoryPage />} />
          <Route path="*" element={<POSPage />} />
        </Routes>
      </main>
    </div>
  );
}


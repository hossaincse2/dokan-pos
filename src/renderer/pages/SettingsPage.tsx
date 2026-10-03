import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { updateSettings, fetchSettings } from '../store/slices/settingsSlice';

export default function SettingsPage() {
  console.log('[SettingsPage] ========== COMPONENT RENDERING ==========');
  
  const dispatch = useDispatch<AppDispatch>();
  const { settings, loading } = useSelector((state: RootState) => state.settings);
  const [stores, setStores] = useState<any[]>([]);
  const [siteSettings, setSiteSettings] = useState<any>(null);
  const [formData, setFormData] = useState({
    apiBaseUrl: '',
    storeId: 1,
    autoSyncEnabled: true,
    syncIntervalMinutes: 5,
    taxRate: 0.15,
    receiptCompanyName: '',
    receiptCompanyAddress: '',
    receiptCompanyPhone: '',
    lowStockThreshold: 10,
    showStockBadge: true,
    showProductTitle: true,
    showProductPrice: true,
    showSaleModal: true,
    zatcaPhase: 1,
    vatNumber: '',
    crNumber: '',
    binNumber: '',
    uaeTrn: '',
    kuwaitTaxId: '',
    qrCodeSize: 256,
    qrCodeMargin: 3,
    country: 'Bangladesh',
    isTaxInclusive: false,
  });

  useEffect(() => {
    loadStores();
    loadApiBaseUrl();
    loadSiteSettings();
  }, []);

  const loadApiBaseUrl = async () => {
    try {
      const baseUrl = await window.electronAPI.getApiBaseUrl();
      setFormData(prev => ({ ...prev, apiBaseUrl: baseUrl }));
    } catch (error) {
      console.error('Failed to load API base URL:', error);
    }
  };

  useEffect(() => {
    if (settings) {
      setFormData({
        apiBaseUrl: settings.apiBaseUrl || '',
        storeId: settings.storeId,
        autoSyncEnabled: !!settings.autoSyncEnabled,
        syncIntervalMinutes: settings.syncIntervalMinutes,
        taxRate: settings.taxRate,
        receiptCompanyName: settings.receiptCompanyName,
        receiptCompanyAddress: settings.receiptCompanyAddress,
        receiptCompanyPhone: settings.receiptCompanyPhone,
        lowStockThreshold: settings.lowStockThreshold,
        showStockBadge: settings.showStockBadge !== undefined ? !!settings.showStockBadge : true,
        showProductTitle: settings.showProductTitle !== undefined ? !!settings.showProductTitle : true,
        showProductPrice: settings.showProductPrice !== undefined ? !!settings.showProductPrice : true,
        showSaleModal: settings.showSaleModal !== undefined ? !!settings.showSaleModal : true,
        zatcaPhase: settings.zatcaPhase || 1,
        vatNumber: settings.vatNumber || '',
        crNumber: settings.crNumber || '',
        binNumber: settings.binNumber || '',
        uaeTrn: settings.uaeTrn || '',
        kuwaitTaxId: settings.kuwaitTaxId || '',
        qrCodeSize: settings.qrCodeSize || 256,
        qrCodeMargin: settings.qrCodeMargin || 3,
        country: settings.country || 'Bangladesh',
        isTaxInclusive: !!settings.isTaxInclusive,
      });
    }
  }, [settings]);

  const loadStores = async () => {
    try {
      const result = await window.electronAPI.getStores();
      const validStores = (result || []).filter((s: any) => s.name !== 'Main Store' || s.remote_id);
      setStores(validStores);
      if (validStores.length > 0) {
        if (!validStores.some((s: any) => s.id === formData.storeId)) {
          setFormData((prev: any) => ({ ...prev, storeId: validStores[0].id }));
        }
      }
    } catch (error) {
      console.error('Failed to load stores:', error);
    }
  };

  const loadSiteSettings = async () => {
    try {
      const result = await window.electronAPI.getSiteSettings();
      setSiteSettings(result);
      console.log('Site settings loaded:', result);
    } catch (error) {
      console.error('Failed to load site settings:', error);
    }
  };

  const getImageUrl = (imagePath: string | null | undefined) => {
    if (!imagePath) return '';
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    const baseURL = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || '';
    return imagePath.startsWith('/') ? `${baseURL}${imagePath}` : `${baseURL}/${imagePath}`;
  };

  const [isApiUrlEditable, setIsApiUrlEditable] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Update API Base URL if changed
      if (formData.apiBaseUrl) {
        await window.electronAPI.updateApiBaseUrl(formData.apiBaseUrl);
      }
      
      await dispatch(updateSettings(formData));
      // Refetch settings to ensure UI is in sync
      await dispatch(fetchSettings());
      setIsApiUrlEditable(false); // Lock the field again after saving
      alert('Settings updated successfully! Please restart the app for API URL changes to take effect.');
    } catch (error) {
      alert('Failed to update settings. Please try again.');
      console.error('Settings update error:', error);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* ... existing code ... */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* API Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">API Settings</h2>
                  <p className="text-sm text-gray-600">Configure API connection</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsApiUrlEditable(!isApiUrlEditable)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isApiUrlEditable 
                  ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' 
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
              >
                {isApiUrlEditable ? (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Lock URL
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Edit URL
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">API Base URL</label>
              <div className="relative">
                <input
                  type="url"
                  value={formData.apiBaseUrl}
                  onChange={(e) => setFormData({ ...formData, apiBaseUrl: e.target.value })}
                  readOnly={!isApiUrlEditable}
                  placeholder="https://admin.karbar.shop"
                  className={`w-full px-4 py-3 border rounded-lg transition-all font-mono text-sm ${
                    isApiUrlEditable 
                    ? 'border-blue-400 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 shadow-sm' 
                    : 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed'
                  }`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {isApiUrlEditable ? (
                    <span className="flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                    </span>
                  ) : (
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  )}
                </div>
              </div>
              <div className="mt-2 flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <p className="text-xs text-blue-700">
                  {isApiUrlEditable 
                    ? 'You are now editing the API URL. Be careful as incorrect URLs will break synchronization.' 
                    : 'The API URL is locked to prevent accidental changes. Click "Edit URL" above to modify it.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Store Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Store Settings</h2>
                <p className="text-sm text-gray-600">Select your store location</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Store Location</label>
              <select
                value={formData.storeId}
                onChange={(e) =>
                  setFormData({ ...formData, storeId: parseInt(e.target.value) })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              >
                {stores.length === 0 ? (
                  <option value={1}>No stores synced yet</option>
                ) : (
                  stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}{store.location ? ` - ${store.location}` : ''}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
        </div>

        {/* Sync Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Sync Settings</h2>
                <p className="text-sm text-gray-600">Configure automatic synchronization</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="autoSync"
                  checked={formData.autoSyncEnabled}
                  onChange={(e) =>
                    setFormData({ ...formData, autoSyncEnabled: e.target.checked })
                  }
                  className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                />
                <label htmlFor="autoSync" className="text-sm font-medium text-gray-900 cursor-pointer">
                  Enable Auto-Sync
                </label>
              </div>
            </div>

            {formData.autoSyncEnabled && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sync Interval</label>
                <select
                  value={formData.syncIntervalMinutes}
                  onChange={(e) =>
                    setFormData({ ...formData, syncIntervalMinutes: parseInt(e.target.value) })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                >
                  <option value={2}>Every 2 minutes</option>
                  <option value={5}>Every 5 minutes</option>
                  <option value={15}>Every 15 minutes</option>
                  <option value={30}>Every 30 minutes</option>
                  <option value={60}>Every hour</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* VAT & Inventory Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">VAT Settings</h2>
                  <p className="text-sm text-gray-600">Configure VAT rate</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">VAT Rate (%)</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  value={formData.taxRate * 100}
                  onChange={(e) => setFormData({ ...formData, taxRate: parseFloat(e.target.value) / 100 })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">%</span>
              </div>
              
              <div className="mt-4 flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="flex items-center h-5">
                    <input
                      id="isTaxInclusive"
                      type="checkbox"
                      checked={formData.isTaxInclusive}
                      onChange={(e) => setFormData({ ...formData, isTaxInclusive: e.target.checked })}
                      className="w-5 h-5 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500 transition-all cursor-pointer"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="isTaxInclusive" className="font-bold text-gray-900 cursor-pointer">Tax-Inclusive Pricing</label>
                    <p className="text-gray-500 text-xs mt-0.5">Product prices already include VAT/Tax</p>
                  </div>
                </div>
                <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${formData.isTaxInclusive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                  {formData.isTaxInclusive ? 'Enabled' : 'Disabled'}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-red-50 to-pink-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Inventory</h2>
                  <p className="text-sm text-gray-600">Stock alerts</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Low Stock Threshold</label>
              <input
                type="number"
                value={formData.lowStockThreshold}
                onChange={(e) => setFormData({ ...formData, lowStockThreshold: parseInt(e.target.value) })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
              />
            </div>
          </div>
        </div>

        {/* Display Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-cyan-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Display & Region</h2>
                <p className="text-sm text-gray-600">Visibility & Localization</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Operating Country</label>
                <select
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                >
                  <option value="Saudi Arabia">Saudi Arabia (ZATCA)</option>
                  <option value="Bangladesh">Bangladesh</option>
                  <option value="India">India</option>
                  <option value="United Arab Emirates">United Arab Emirates</option>
                  <option value="Kuwait">Kuwait</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Show Sales Modal</label>
                <select
                  value={formData.showSaleModal ? 'yes' : 'no'}
                  onChange={(e) => setFormData({ ...formData, showSaleModal: e.target.value === 'yes' })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                >
                  <option value="yes">Yes (Show Modal)</option>
                  <option value="no">No (Direct Order)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Show Stock Badge</label>
                <select
                  value={formData.showStockBadge ? 'yes' : 'no'}
                  onChange={(e) => setFormData({ ...formData, showStockBadge: e.target.value === 'yes' })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Show Product Title</label>
                <select
                  value={formData.showProductTitle ? 'yes' : 'no'}
                  onChange={(e) => setFormData({ ...formData, showProductTitle: e.target.value === 'yes' })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ZATCA & QR Requirements (Saudi Arabia Only) */}
        {formData.country === 'Saudi Arabia' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center shadow-md">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 00-2-2V5a2 2 0 002-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 00-2 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">ZATCA & QR Requirements (Saudi Arabia)</h2>
                  <p className="text-sm text-gray-600">Required fields for ZATCA compliance and invoice QR codes</p>
                </div>
              </div>
            </div>
            
            <div className="p-8 space-y-8">
              {/* Info Box */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-blue-900">ZATCA Compliance Info</p>
                  <p className="text-sm text-blue-700">All fields below can be synced from the server but can also be manually overridden.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form Fields */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">ZATCA Phase *</label>
                      <select
                        value={formData.zatcaPhase}
                        onChange={(e) => setFormData({ ...formData, zatcaPhase: parseInt(e.target.value) })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all bg-white"
                      >
                        <option value={1}>Phase 1 - Generation Only</option>
                        <option value={2}>Phase 2 - Full Integration</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">VAT Registration Number *</label>
                      <input
                        type="text"
                        maxLength={15}
                        value={formData.vatNumber}
                        onChange={(e) => setFormData({ ...formData, vatNumber: e.target.value.replace(/\D/g, '') })}
                        placeholder="15-digit VAT number"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Commercial Registration (CR)</label>
                      <input
                        type="text"
                        maxLength={10}
                        value={formData.crNumber}
                        onChange={(e) => setFormData({ ...formData, crNumber: e.target.value.replace(/\D/g, '') })}
                        placeholder="10-digit CR number"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">QR Code Status</label>
                      <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${siteSettings?.qr_code_enabled ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        {siteSettings?.qr_code_enabled ? 'QR Code Enabled on Server' : 'QR Code Disabled on Server'}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">QR Code Size (px)</label>
                      <input
                        type="number"
                        value={formData.qrCodeSize || 120}
                        onChange={(e) => setFormData({ ...formData, qrCodeSize: parseInt(e.target.value) })}
                        placeholder="Default: 120"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">QR Code Margin</label>
                      <input
                        type="number"
                        value={formData.qrCodeMargin || 1}
                        onChange={(e) => setFormData({ ...formData, qrCodeMargin: parseInt(e.target.value) })}
                        placeholder="Default: 1"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column: Documentation */}
                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                    <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">Quick Links</h3>
                    <div className="space-y-3">
                      <a href="#" className="flex items-center justify-center gap-2 w-full py-2 border border-blue-200 text-blue-700 bg-blue-50 rounded-lg text-xs font-medium hover:bg-blue-100 transition-all">ZATCA Phase 1 Guide</a>
                      <a href="#" className="flex items-center justify-center gap-2 w-full py-2 border border-purple-200 text-purple-700 bg-purple-50 rounded-lg text-xs font-medium hover:bg-purple-100 transition-all">Official Documentation</a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl font-semibold text-lg flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving Settings...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save Settings
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

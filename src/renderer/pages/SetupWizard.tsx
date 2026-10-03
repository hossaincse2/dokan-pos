import { useState, FormEvent } from 'react';

interface SetupWizardProps {
  onComplete: (apiUrl: string) => void;
}

export default function SetupWizard({ onComplete }: SetupWizardProps) {
  const [apiUrl, setApiUrl] = useState(import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || '');
  const [country, setCountry] = useState('Bangladesh');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Save API URL to API service (electron-store)
      await window.electronAPI.updateApiBaseUrl(apiUrl);
      
      // Also save to database settings so it shows in Settings page
      await window.electronAPI.updateSettings({ apiBaseUrl: apiUrl, country });
      
      // Mark setup as complete
      localStorage.setItem('setupComplete', 'true');
      
      console.log('✅ Setup complete! API URL & Country saved:', { apiUrl, country });
      onComplete(apiUrl);
    } catch (error) {
      console.error('Setup failed:', error);
      alert('Failed to save configuration. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-500">
      <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Welcome to Karbar POS</h1>
          <p className="text-gray-600">Let's set up your application</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
            <p className="text-sm text-blue-700">
              <strong>First Time Setup:</strong> Configure your API server URL and operating country.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Operating Country
            </label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg bg-white"
            >
              <option value="Bangladesh">🇧🇩 Bangladesh</option>
              <option value="Saudi Arabia">🇸🇦 Saudi Arabia (ZATCA e-Invoice)</option>
              <option value="United Arab Emirates">🇦🇪 United Arab Emirates</option>
              <option value="India">🇮🇳 India</option>
              <option value="Kuwait">🇰🇼 Kuwait</option>
              <option value="Other">🌍 Other</option>
            </select>
            <p className="mt-2 text-sm text-gray-500">
              Select your operating country for regional invoice formats, taxes, and currency.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              API Base URL
            </label>
            <input
              type="url"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
              placeholder={import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'https://your-api-server.com'}
              required
            />
            <p className="mt-2 text-sm text-gray-500">
              This is the server URL where your POS data will be synced.
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-800 mb-2">Configuration Summary:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Operating Country: <span className="font-semibold text-gray-800">{country}</span></li>
              <li>• API URL: {apiUrl || import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'Not configured'}</li>
              <li>• Database: Local SQLite (offline-first)</li>
              <li>• Auto-sync: Enabled</li>
            </ul>
          </div>

          <div className="flex items-center space-x-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-lg"
            >
              {loading ? 'Saving Configuration...' : 'Continue to Login'}
            </button>
          </div>

          <p className="text-xs text-center text-gray-500">
            You can change these settings later in the Settings page
          </p>
        </form>
      </div>
    </div>
  );
}

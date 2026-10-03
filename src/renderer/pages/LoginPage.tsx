import { useState, FormEvent } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { login, clearError } from '../store/slices/authSlice';

export default function LoginPage() {
  const dispatch = useDispatch<AppDispatch>();
  const authState = useSelector((state: RootState) => state.auth);
  const { loading, error } = authState;
  const [credentials, setCredentials] = useState({
    email_username: 'superadmin@gmail.com',
    password: '@myadmin$24',
  });
  
  console.log('[LoginPage] Rendering - Auth state:', authState);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    console.log('[LoginPage] Submitting login with credentials:', credentials.email_username);
    dispatch(clearError());
    
    try {
      const result = await dispatch(login(credentials));
      console.log('[LoginPage] Login result:', result);
      
      if (login.fulfilled.match(result)) {
        console.log('[LoginPage] ✅ Login successful!');
      } else if (login.rejected.match(result)) {
        console.log('[LoginPage] ❌ Login failed:', result.payload);
      }
    } catch (error) {
      console.error('[LoginPage] Login error:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
      <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Karbar POS</h1>
          <p className="text-gray-600 mt-2">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          
          {authState.user?.offline_mode && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="font-medium">Offline Mode</span>
              </div>
              <p className="text-sm mt-1">No internet connection. You can login with saved credentials.</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email or Username
            </label>
            <input
              type="text"
              value={credentials.email_username}
              onChange={(e) =>
                setCredentials({ ...credentials, email_username: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={credentials.password}
              onChange={(e) =>
                setCredentials({ ...credentials, password: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Demo Credentials:</p>
          <p className="font-mono">superadmin@gmail.com / @myadmin$24</p>
        </div>
      </div>
    </div>
  );
}

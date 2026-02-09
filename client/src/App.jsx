import { useEffect } from 'react';
import useAuth from './hooks/useAuth';
import AuthButton from './components/AuthButton';
import Dashboard from './components/Dashboard';

function App() {
  const { user, loading, login, logout } = useAuth();

  useEffect(() => {
    // Handle auth callback messages
    const params = new URLSearchParams(window.location.search);
    if (params.get('auth') === 'success' || params.get('error')) {
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-900 border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">X Reply Hider</h1>
          <p className="text-gray-600 mb-8">
            Automatically hide unwanted replies to your posts based on keywords.
            Keep your conversations clean without constant moderation.
          </p>
          <AuthButton user={user} onLogin={login} onLogout={logout} />
          <div className="mt-8 text-sm text-gray-500">
            <p>We only request permissions needed to:</p>
            <ul className="mt-2 space-y-1">
              <li>Read your posts</li>
              <li>Hide/unhide replies to your posts</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </div>
            <span className="font-semibold text-gray-900">Reply Hider</span>
          </div>
          <AuthButton user={user} onLogin={login} onLogout={logout} />
        </div>
      </header>
      <main>
        <Dashboard user={user} />
      </main>
    </div>
  );
}

export default App;

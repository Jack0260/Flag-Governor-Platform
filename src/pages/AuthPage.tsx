import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Flag } from 'lucide-react';
import { Button, Input } from '@/components/ui';

export function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fn = mode === 'signin' ? signIn : signUp;
    const { error } = await fn(email, password);
    if (error) {
      let msg = error;
      if (error.includes('Invalid login')) msg = 'Invalid email or password. If you are new, try signing up.';
      else if (error.includes('weak_password') || error.includes('pwned')) msg = 'That password is too common. Please choose a stronger password with at least 8 characters, including a mix of letters, numbers, and symbols.';
      else if (error.includes('user_already_exists')) msg = 'An account with this email already exists. Try signing in instead.';
      setError(msg);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center shadow-lg mb-3">
            <Flag className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Flag Governor</h1>
          <p className="text-sm text-gray-400 mt-1">Feature flag management & progressive delivery</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-6">
            <button
              onClick={() => { setMode('signin'); setError(null); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${mode === 'signin' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode('signup'); setError(null); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${mode === 'signup' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <Input
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="you@company.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <Input
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </Button>
          </form>

          {mode === 'signup' && (
            <p className="text-xs text-gray-500 mt-4 text-center">
              New accounts are automatically added to the demo organization with admin access.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

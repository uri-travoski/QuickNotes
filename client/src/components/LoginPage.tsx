import React, { useState } from 'react';
import {
  LogIn,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Coffee,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useNotes } from '../context/NotesContext';
import { BookmarkStackSymbol } from './icons';

export const LoginPage: React.FC = () => {
  const { login, theme, setTheme, isDarkMode, isCoffeeMode, isKraftMode } = useNotes();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isWarmTheme = isCoffeeMode || isKraftMode;

  const handleToggleTheme = () => {
    const nextTheme = theme === 'default' ? 'dark' : theme === 'dark' ? 'coffee' : 'default';
    setTheme(nextTheme);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please enter both username and password.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await login(username.trim(), password);
    } catch (err: any) {
      setError(err.message || 'Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f1f3f4] dark:bg-[#202124] text-gray-900 dark:text-gray-100 flex flex-col justify-between p-4 sm:p-6 transition-colors">
      {/* Top Header Bar with Theme Toggle */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleToggleTheme}
          title={`Theme: ${theme === 'kraft' ? 'coffee' : theme}`}
          className="p-2.5 rounded-full bg-white dark:bg-[#2d2e30] border border-gray-200 dark:border-[#5f6368]/40 hover:bg-gray-100 dark:hover:bg-[#3c4043] transition-colors shadow-xs cursor-pointer text-gray-700 dark:text-gray-200"
        >
          {isWarmTheme ? (
            <Coffee className="w-4 h-4 text-amber-700" />
          ) : isDarkMode ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-gray-600" />
          )}
        </button>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-sm sm:max-w-md mx-auto my-auto py-6">
        <div className="bg-white dark:bg-[#2d2e30] rounded-2xl border border-gray-200/90 dark:border-[#5f6368]/40 shadow-keep-modal p-8 sm:p-10 space-y-6">
          {/* Logo & Brand Header */}
          <div className="text-center space-y-3">
            <div
              style={{ width: '2.5rem', height: '2.5rem' }}
              className={`rounded-lg ${
                isWarmTheme
                  ? 'bg-gradient-to-tr from-[#7c4a27] to-[#8d5630]'
                  : 'bg-gradient-to-tr from-amber-500 to-amber-400'
              } flex items-center justify-center shadow-md text-white flex-shrink-0 mx-auto`}
            >
              <BookmarkStackSymbol className="w-5 h-5 text-white" />
            </div>

            <h1
              style={{ fontSize: 'calc(1.35rem * var(--font-scale, 1))' }}
              className="font-bold text-gray-900 dark:text-gray-100 tracking-tight leading-none"
            >
              QuickNotes
            </h1>

            <p className="text-xs text-gray-500 dark:text-gray-400">
              Sign in with your account to continue
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="p-3.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/60 rounded-xl flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300 animate-scale-in">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-500" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  autoFocus
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50 dark:bg-[#202124] border border-gray-200 dark:border-[#5f6368] rounded-xl text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all font-medium placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full pl-10 pr-10 py-2.5 bg-gray-50 dark:bg-[#202124] border border-gray-200 dark:border-[#5f6368] rounded-xl text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all font-medium placeholder-gray-400 dark:placeholder-gray-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              <span>{loading ? 'Signing In...' : 'Sign In'}</span>
            </button>
          </form>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-[11px] text-gray-400 dark:text-gray-500 py-2">
        QuickNotes &bull; Private & Self-Hosted Note Taking
      </div>
    </div>
  );
};

export default LoginPage;

import React, { useState } from 'react';
import {
  LogIn,
  Shield,
  Bot,
  X,
  Lock,
  User as UserIcon,
} from 'lucide-react';
import { useNotes } from '../context/NotesContext';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    setIsAuthModalOpen,
    currentUser,
    login,
    logout,
    showToast,
  } = useNotes();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;

    setLoading(true);
    try {
      await login(username.trim(), password);
      setIsAuthModalOpen(false);
      setUsername('');
      setPassword('');
    } catch (err: any) {
      showToast(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (u: string, p: string) => {
    setLoading(true);
    try {
      await login(u, p);
      setIsAuthModalOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={() => setIsAuthModalOpen(false)}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-[#2d2e30] rounded-2xl shadow-keep-modal border border-gray-200 dark:border-[#5f6368] overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-100 dark:border-[#3c4043] flex items-center justify-between">
          <h3 className="font-semibold text-base text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <LogIn className="w-5 h-5 text-amber-500" />
            {currentUser ? 'User Profile & Switch Account' : 'Sign in to QuickNotes'}
          </h3>
          <button
            type="button"
            onClick={() => setIsAuthModalOpen(false)}
            className="p-1 rounded-md text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          {/* Current User Status */}
          {currentUser && (
            <div className="p-3 bg-gray-50 dark:bg-[#202124] rounded-xl border border-gray-200 dark:border-[#3c4043] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {currentUser.role === 'owner' ? (
                  <Shield className="w-5 h-5 text-amber-500" />
                ) : (
                  <Bot className="w-5 h-5 text-blue-500" />
                )}
                <div>
                  <div className="font-bold text-gray-900 dark:text-gray-100">
                    {currentUser.display_name || currentUser.username}
                  </div>
                  <div className="text-[10px] text-gray-400 uppercase font-semibold">
                    Role: {currentUser.role} {currentUser.role === 'owner' ? '(Full Admin)' : '(Restricted API User)'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  logout();
                  setIsAuthModalOpen(false);
                }}
                className="px-2.5 py-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/60 rounded-lg font-semibold cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          )}

          {/* Quick Demo Login Buttons */}
          <div>
            <span className="block font-semibold text-gray-500 uppercase text-[10px] tracking-wider mb-2">
              Quick Role Switching (1-Click)
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('owner', 'quicknotes_owner_password_2026')}
                className="p-3 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-left transition-all"
              >
                <div className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5 mb-0.5">
                  <Shield className="w-3.5 h-3.5 text-amber-500" />
                  App Owner
                </div>
                <div className="text-[10px] text-amber-700 dark:text-amber-400">
                  Full permissions (Settings, Backups, Deletion)
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('api_user', 'quicknotes_api_password_2026')}
                className="p-3 rounded-xl border border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-left transition-all"
              >
                <div className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5 mb-0.5">
                  <Bot className="w-3.5 h-3.5 text-blue-500" />
                  API User
                </div>
                <div className="text-[10px] text-blue-700 dark:text-blue-400">
                  AI Agent tier (No deletion, Labels only)
                </div>
              </button>
            </div>
          </div>

          {/* Manual Login Form */}
          <form onSubmit={handleSubmit} className="space-y-3 pt-2 border-t border-gray-100 dark:border-[#3c4043]">
            <div>
              <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-[#202124] border border-gray-200 dark:border-[#5f6368] rounded-xl text-xs focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-[#202124] border border-gray-200 dark:border-[#5f6368] rounded-xl text-xs focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

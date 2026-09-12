import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Key,
  Trash2,
  Shield,
  Bot,
  X,
  Lock,
  Calendar,
  Check,
} from 'lucide-react';
import { User } from '../../types';
import * as api from '../../api/client';
import { useNotes } from '../../context/NotesContext';

export const UserSettings: React.FC = () => {
  const { isOwner, showToast, openConfirmDialog } = useNotes();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Inline Form States (replaces modal-in-modal anti-pattern)
  const [showCreateCard, setShowCreateCard] = useState(false);
  const [passwordTargetUser, setPasswordTargetUser] = useState<User | null>(null);

  // Create form fields
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'owner' | 'api'>('api');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  // Password form fields
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await api.fetchUsers();
      setUsers(data);
    } catch (err: any) {
      showToast('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOwner) loadUsers();
  }, [isOwner]);

  if (!isOwner) {
    return (
      <div className="p-10 text-center text-gray-500 rounded-xl border border-gray-200 dark:border-[#3c4043] bg-white dark:bg-[#252629]">
        <Shield className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Access Denied</h3>
        <p className="text-xs text-gray-400 mt-1">
          Only Owner users are authorized to manage system users.
        </p>
      </div>
    );
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim()) {
      showToast('Username and password are required');
      return;
    }

    try {
      setIsSubmittingCreate(true);
      await api.createUser({
        username: newUsername.trim(),
        password: newPassword.trim(),
        role: newRole,
        display_name: newDisplayName.trim() || undefined,
      });
      showToast(`User ${newUsername} created successfully`);
      setShowCreateCard(false);
      setNewUsername('');
      setNewPassword('');
      setNewDisplayName('');
      setNewRole('api');
      loadUsers();
    } catch (err: any) {
      showToast(err.message || 'Failed to create user');
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordTargetUser || !newPasswordValue.trim()) return;

    try {
      setIsSubmittingPassword(true);
      await api.changeUserPassword(passwordTargetUser.id, newPasswordValue.trim());
      showToast(`Password updated for ${passwordTargetUser.username}`);
      setPasswordTargetUser(null);
      setNewPasswordValue('');
    } catch (err: any) {
      showToast(err.message || 'Failed to change password');
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  const handleDeleteUser = (user: User) => {
    openConfirmDialog({
      title: 'Delete User Account',
      message: `Are you sure you want to delete user "${user.username}"? This user will permanently lose access to QuickNotes.`,
      confirmText: 'Delete User',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await api.deleteUser(user.id);
          showToast(`User ${user.username} deleted`);
          loadUsers();
        } catch (err: any) {
          showToast(err.message || 'Failed to delete user');
        }
      },
    });
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-[#3c4043]">
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Users className="w-4.5 h-4.5 text-amber-500" />
            Users & Role Management
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Manage authorized logins, administrative privileges, and API accounts.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowCreateCard(!showCreateCard);
            setPasswordTargetUser(null);
          }}
          className="h-9 px-4 bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white rounded-lg text-xs font-medium shadow-xs transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-center whitespace-nowrap"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>{showCreateCard ? 'Close Form' : 'New User'}</span>
        </button>
      </div>

      {/* Inline Create User Panel */}
      {showCreateCard && (
        <div className="p-5 rounded-xl border border-amber-300 dark:border-amber-800/80 bg-amber-50/40 dark:bg-amber-950/20 space-y-4 shadow-xs animate-fade-in">
          <div className="flex items-center justify-between border-b border-amber-200/70 dark:border-amber-900/60 pb-3">
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100">
                Create New User
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateCard(false)}
              className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                  Username *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. jdoe"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-gray-50/70 dark:bg-[#1f2023] border border-gray-200 dark:border-[#3c4043] text-gray-900 dark:text-gray-100 placeholder-gray-400 text-xs focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                  Initial Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-gray-50/70 dark:bg-[#1f2023] border border-gray-200 dark:border-[#3c4043] text-gray-900 dark:text-gray-100 placeholder-gray-400 text-xs focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                  Display Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-gray-50/70 dark:bg-[#1f2023] border border-gray-200 dark:border-[#3c4043] text-gray-900 dark:text-gray-100 placeholder-gray-400 text-xs focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                  Assigned Role
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as 'owner' | 'api')}
                  className="w-full h-9 px-3 rounded-lg bg-gray-50/70 dark:bg-[#1f2023] border border-gray-200 dark:border-[#3c4043] text-gray-900 dark:text-gray-100 text-xs focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all cursor-pointer"
                >
                  <option value="api">API User (REST / Automations only)</option>
                  <option value="owner">Owner (Full UI + Admin Permissions)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-200/60 dark:border-amber-900/60">
              <button
                type="button"
                onClick={() => setShowCreateCard(false)}
                className="h-8 px-3 rounded-lg border border-gray-200 dark:border-[#3c4043] bg-white dark:bg-[#252629] hover:bg-gray-50 text-gray-700 dark:text-gray-300 text-xs font-medium transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingCreate}
                className="h-9 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-medium shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isSubmittingCreate ? 'Creating...' : 'Save User'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Inline Password Reset Panel */}
      {passwordTargetUser && (
        <div className="p-5 rounded-xl border border-blue-300 dark:border-blue-800/80 bg-blue-50/40 dark:bg-blue-950/20 space-y-4 shadow-xs animate-fade-in">
          <div className="flex items-center justify-between border-b border-blue-200/70 dark:border-blue-900/60 pb-3">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100">
                Change Password for <span className="font-mono text-blue-600 dark:text-blue-400">{passwordTargetUser.username}</span>
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setPasswordTargetUser(null)}
              className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-3.5 text-xs">
            <div className="max-w-md space-y-1">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                New Password *
              </label>
              <input
                type="password"
                required
                autoFocus
                placeholder="••••••••••••"
                value={newPasswordValue}
                onChange={(e) => setNewPasswordValue(e.target.value)}
                className="w-full h-9 px-3 rounded-lg bg-gray-50/70 dark:bg-[#1f2023] border border-gray-200 dark:border-[#3c4043] text-gray-900 dark:text-gray-100 placeholder-gray-400 text-xs focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-blue-200/60 dark:border-blue-900/60">
              <button
                type="button"
                onClick={() => setPasswordTargetUser(null)}
                className="h-8 px-3 rounded-lg border border-gray-200 dark:border-[#3c4043] bg-white dark:bg-[#252629] hover:bg-gray-50 text-gray-700 dark:text-gray-300 text-xs font-medium transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingPassword}
                className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{isSubmittingPassword ? 'Updating...' : 'Update Password'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users List Table */}
      {loading ? (
        <div className="py-12 text-center text-gray-400 text-xs font-medium animate-pulse">Loading users...</div>
      ) : (
        <div className="bg-white dark:bg-[#252629] rounded-xl border border-gray-200/80 dark:border-[#3c4043] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-gray-50/80 dark:bg-[#1f2023] border-b border-gray-200/80 dark:border-[#3c4043] text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3">User Account</th>
                  <th className="px-5 py-3">Assigned Role</th>
                  <th className="px-5 py-3">Created</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#3c4043]">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/70 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs border ${
                          user.role === 'owner'
                            ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200/60 dark:border-amber-900/60'
                            : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200/60 dark:border-blue-900/60'
                        }`}>
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-xs text-gray-900 dark:text-gray-100">
                            {user.username}
                          </div>
                          {user.display_name && (
                            <div className="text-gray-400 dark:text-gray-500 text-[11px] mt-0.5">
                              {user.display_name}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                          user.role === 'owner'
                            ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200/60 dark:border-amber-900/60'
                            : 'bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200/60 dark:border-blue-900/60'
                        }`}
                      >
                        {user.role === 'owner' ? <Shield className="w-3 h-3 text-amber-600" /> : <Bot className="w-3 h-3 text-blue-500" />}
                        <span>{user.role === 'owner' ? 'Owner' : 'API User'}</span>
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 dark:text-gray-400 font-mono text-[11px] whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-gray-400" />
                        <span>{user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setPasswordTargetUser(user);
                            setShowCreateCard(false);
                          }}
                          title={`Change password for ${user.username}`}
                          className="h-7 px-2.5 rounded-lg border border-gray-200 dark:border-[#3c4043] hover:bg-gray-100 dark:hover:bg-[#323438] text-gray-600 dark:text-gray-300 text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Key className="w-3 h-3 text-amber-500" />
                          <span>Password</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(user)}
                          title={`Delete ${user.username}`}
                          className="w-7 h-7 rounded-lg border border-gray-200 dark:border-[#3c4043] hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 text-gray-400 hover:text-red-500 transition-colors flex items-center justify-center cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserSettings;

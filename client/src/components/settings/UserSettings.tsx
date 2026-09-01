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
} from 'lucide-react';
import { User } from '../../types';
import * as api from '../../api/client';
import { useNotes } from '../../context/NotesContext';

export const UserSettings: React.FC = () => {
  const { isOwner, showToast, openConfirmDialog } = useNotes();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Create form
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'owner' | 'api'>('api');
  const [newDisplayName, setNewDisplayName] = useState('');

  // Password form
  const [newPasswordValue, setNewPasswordValue] = useState('');

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
      <div className="p-8 text-center text-gray-500">
        <Shield className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">Access Denied</h3>
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
      await api.createUser({
        username: newUsername.trim(),
        password: newPassword.trim(),
        role: newRole,
        display_name: newDisplayName.trim() || undefined,
      });
      showToast(`User ${newUsername} created`);
      setShowCreateModal(false);
      setNewUsername('');
      setNewPassword('');
      setNewDisplayName('');
      loadUsers();
    } catch (err: any) {
      showToast(err.message || 'Failed to create user');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !newPasswordValue.trim()) return;

    try {
      await api.changeUserPassword(selectedUser.id, newPasswordValue.trim());
      showToast(`Password updated for ${selectedUser.username}`);
      setShowPasswordModal(false);
      setNewPasswordValue('');
      setSelectedUser(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to change password');
    }
  };

  const handleDeleteUser = (user: User) => {
    openConfirmDialog({
      title: 'Delete User',
      message: `Are you sure you want to delete user "${user.username}"? This user will permanently lose access.`,
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
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-[#3c4043]">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-500" />
            User Management & Roles
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Manage application users, administrative roles, and API service accounts.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="h-10 px-4 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white rounded-[6px] text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-center whitespace-nowrap"
        >
          <UserPlus className="w-4 h-4" />
          <span>Create User</span>
        </button>
      </div>

      {/* Users List Table */}
      {loading ? (
        <div className="py-12 text-center text-gray-400 text-xs font-medium animate-pulse">Loading users...</div>
      ) : (
        <div className="bg-white dark:bg-[#28292c] rounded-[6px] border border-gray-200 dark:border-[#3c4043] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="min-w-[680px] w-full text-left text-xs border-collapse">
              <thead className="bg-gray-50/90 dark:bg-[#202124] border-b border-gray-200 dark:border-[#3c4043] text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="w-[280px] min-w-[240px] px-6 py-3.5">User Account</th>
                  <th className="w-[160px] min-w-[140px] px-6 py-3.5">Assigned Role</th>
                  <th className="w-[160px] min-w-[140px] px-6 py-3.5">Created Date</th>
                  <th className="w-[90px] min-w-[80px] px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#3c4043]">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-[6px] flex items-center justify-center font-bold text-xs ${
                          user.role === 'owner'
                            ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300'
                            : 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300'
                        }`}>
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                            <span>{user.username}</span>
                          </div>
                          {user.display_name && (
                            <div className="text-gray-400 dark:text-gray-500 text-[11px] mt-0.5">{user.display_name}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          user.role === 'owner'
                            ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'
                            : 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300'
                        }`}
                      >
                        {user.role === 'owner' ? <Shield className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                        <span>{user.role === 'owner' ? 'Owner' : 'API User'}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400 font-mono text-[11px] whitespace-nowrap">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedUser(user);
                            setShowPasswordModal(true);
                          }}
                          title="Change password"
                          className="w-8 h-8 rounded-[6px] text-gray-400 hover:text-amber-500 hover:bg-gray-100 dark:hover:bg-[#3c4043] transition-colors flex items-center justify-center cursor-pointer"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(user)}
                          title="Delete user"
                          className="w-8 h-8 rounded-[6px] text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors flex items-center justify-center cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className="w-full max-w-md bg-white dark:bg-[#28292c] rounded-[6px] shadow-keep-modal border border-gray-200 dark:border-[#3c4043] overflow-hidden animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4.5 border-b border-gray-100 dark:border-[#3c4043] flex items-center justify-between">
              <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-amber-500" />
                Create New User
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-[6px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#3c4043] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Username *
                </label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="e.g. ai_assistant or owner2"
                  className="w-full h-10 px-3.5 bg-gray-50 dark:bg-[#1a1b1e] border border-gray-200 dark:border-[#3c4043] rounded-[6px] text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Display Name (Optional)
                </label>
                <input
                  type="text"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  placeholder="e.g. Claude Agent / Gemini Assistant"
                  className="w-full h-10 px-3.5 bg-gray-50 dark:bg-[#1a1b1e] border border-gray-200 dark:border-[#3c4043] rounded-[6px] text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Password *
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full h-10 px-3.5 bg-gray-50 dark:bg-[#1a1b1e] border border-gray-200 dark:border-[#3c4043] rounded-[6px] text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  User Type / Role
                </label>
                <div className="grid grid-cols-2 gap-2.5 mt-1">
                  <button
                    type="button"
                    onClick={() => setNewRole('api')}
                    className={`p-3 rounded-[6px] border text-left transition-all cursor-pointer ${
                      newRole === 'api'
                        ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 ring-2 ring-blue-400/20'
                        : 'border-gray-200 dark:border-[#3c4043] bg-gray-50 dark:bg-[#1a1b1e] text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5 text-xs mb-1">
                      <Bot className="w-4 h-4 text-blue-500" />
                      API User
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400">
                      Cannot delete notes. Can manage labels & notes.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewRole('owner')}
                    className={`p-3 rounded-[6px] border text-left transition-all cursor-pointer ${
                      newRole === 'owner'
                        ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 ring-2 ring-amber-400/20'
                        : 'border-gray-200 dark:border-[#3c4043] bg-gray-50 dark:bg-[#1a1b1e] text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5 text-xs mb-1">
                      <Shield className="w-4 h-4 text-amber-500" />
                      Owner
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400">
                      Full access to settings, backups & deletion.
                    </div>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-[#3c4043]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="h-9 px-4 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#3c4043] rounded-[6px] text-xs font-semibold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-9 px-4 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white rounded-[6px] text-xs font-semibold shadow-xs transition-all cursor-pointer"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className="w-full max-w-sm bg-white dark:bg-[#28292c] rounded-[6px] shadow-keep-modal border border-gray-200 dark:border-[#3c4043] overflow-hidden animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4.5 border-b border-gray-100 dark:border-[#3c4043] flex items-center justify-between">
              <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-500" />
                Change Password for {selectedUser.username}
              </h3>
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="p-1.5 rounded-[6px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#3c4043] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={newPasswordValue}
                  onChange={(e) => setNewPasswordValue(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full h-10 px-3.5 bg-gray-50 dark:bg-[#1a1b1e] border border-gray-200 dark:border-[#3c4043] rounded-[6px] text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-[#3c4043]">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="h-9 px-4 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#3c4043] rounded-[6px] text-xs font-semibold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-9 px-4 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white rounded-[6px] text-xs font-semibold shadow-xs transition-all cursor-pointer"
                >
                  Save Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserSettings;

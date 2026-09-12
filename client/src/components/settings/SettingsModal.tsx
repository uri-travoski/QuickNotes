import React, { useState } from 'react';
import {
  Palette,
  Bookmark,
  User,
  HardDrive,
  Code,
  X,
  LogOut,
  Archive,
  Database,
  Sliders,
  ShieldCheck,
} from 'lucide-react';
import { SettingsTab, APP_VERSION } from '../../types';
import { useNotes } from '../../context/NotesContext';
import { AppearanceSettings } from './AppearanceSettings';
import { UserSettings } from './UserSettings';
import { ApiSettings } from './ApiSettings';
import { LabelSettings } from './LabelSettings';
import { StorageSettings } from './StorageSettings';
import { BackupSettings } from './BackupSettings';

interface TabItem {
  id: SettingsTab;
  label: string;
  icon: React.ReactNode;
  ownerOnly: boolean;
  badge?: string;
}

export const SettingsModal: React.FC = () => {
  const {
    isSettingsModalOpen,
    setIsSettingsModalOpen,
    activeSettingsTab,
    setActiveSettingsTab,
    isOwner,
    currentUser,
    logout,
  } = useNotes();

  const [storageSubTab, setStorageSubTab] = useState<'storage' | 'backups'>('storage');

  if (!isSettingsModalOpen) return null;

  const tabs: TabItem[] = [
    {
      id: 'appearance',
      label: 'Appearance',
      icon: <Palette className="w-4 h-4" />,
      ownerOnly: false,
    },
    {
      id: 'labels',
      label: 'Labels',
      icon: <Bookmark className="w-4 h-4" />,
      ownerOnly: false,
    },
    {
      id: 'storage',
      label: 'Storage & Backup',
      icon: <HardDrive className="w-4 h-4" />,
      ownerOnly: true,
    },
    {
      id: 'users',
      label: 'Users & Roles',
      icon: <User className="w-4 h-4" />,
      ownerOnly: true,
    },
    {
      id: 'api',
      label: 'REST API & AI',
      icon: <Code className="w-4 h-4" />,
      ownerOnly: true,
    },
  ];

  const handleClose = () => {
    setIsSettingsModalOpen(false);
  };

  const handleSignOut = async () => {
    setIsSettingsModalOpen(false);
    await logout();
  };

  const activeTabItem = tabs.find((t) => t.id === activeSettingsTab);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fade-in"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-5xl h-[86vh] max-h-[820px] bg-white dark:bg-[#202124] rounded-2xl shadow-2xl border border-gray-200/90 dark:border-[#3c4043] overflow-hidden flex flex-col animate-scale-in"
      >
        {/* Top Header Bar */}
        <div className="px-6 py-3.5 border-b border-gray-100 dark:border-[#3c4043] flex items-center justify-between flex-shrink-0 bg-gray-50/60 dark:bg-[#1a1b1e]/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="settings-title" className="text-sm font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                  Settings
                </h2>
                <span className="text-gray-300 dark:text-gray-600">/</span>
                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                  {activeTabItem?.label || activeSettingsTab}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-tight">
                QuickNotes workspace preferences and configuration
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            title="Close Settings"
            aria-label="Close Settings"
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#2c2d30] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body: Left Sidebar + Right Content Area */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Sidebar */}
          <aside className="w-full md:w-56 lg:w-60 bg-[#f9fafb] dark:bg-[#1a1b1e] border-b md:border-b-0 md:border-r border-gray-100 dark:border-[#3c4043] p-3 sm:p-3.5 flex flex-col justify-between flex-shrink-0">
            {/* Nav list */}
            <nav className="space-y-1 overflow-x-auto md:overflow-x-visible flex md:flex-col no-scrollbar">
              {tabs
                .filter((t) => !t.ownerOnly || isOwner)
                .map((t) => {
                  const isActive = activeSettingsTab === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setActiveSettingsTab(t.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap text-left ${
                        isActive
                          ? 'bg-white dark:bg-[#28292c] text-amber-600 dark:text-amber-400 shadow-xs border border-gray-200/80 dark:border-[#3c4043] font-semibold'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200/60 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-gray-200'
                      }`}
                    >
                      <span className={`flex-shrink-0 ${isActive ? 'text-amber-500' : 'text-gray-400 dark:text-gray-500'}`}>
                        {t.icon}
                      </span>
                      <span className="truncate flex-1">{t.label}</span>
                      {t.ownerOnly && (
                        <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                          Admin
                        </span>
                      )}
                    </button>
                  );
                })}
            </nav>

            {/* User Session card in sidebar footer */}
            <div className="pt-3 border-t border-gray-200/60 dark:border-[#3c4043] mt-3 hidden md:block">
              <div className="p-2.5 rounded-lg bg-white dark:bg-[#202124] border border-gray-200/70 dark:border-[#3c4043] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-[11px] font-bold text-gray-800 dark:text-gray-200 truncate max-w-[120px]">
                      {currentUser?.display_name || currentUser?.username || 'Owner'}
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold font-mono uppercase px-1.5 py-0.2 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/50">
                    {currentUser?.role || 'owner'}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-[#2f3135] text-[10px] text-gray-400">
                  <span>QuickNotes v{APP_VERSION}</span>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="inline-flex items-center gap-1 text-rose-500 hover:text-rose-600 font-semibold cursor-pointer transition-colors"
                  >
                    <LogOut className="w-3 h-3" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </div>
          </aside>

          {/* Right Main Content */}
          <main className="flex-1 overflow-y-auto p-5 sm:p-7 bg-white dark:bg-[#202124]">
            {activeSettingsTab === 'appearance' && <AppearanceSettings />}
            {activeSettingsTab === 'labels' && <LabelSettings />}
            {activeSettingsTab === 'users' && <UserSettings />}
            {activeSettingsTab === 'storage' && (
              <div className="space-y-6 animate-fade-in">
                {/* Sub-tab Pill Switcher for Storage & Backup */}
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#3c4043] pb-4">
                  <div>
                    <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                      Storage & Disaster Recovery
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Configure attachment providers, automated snapshots, and verify backup integrity.
                    </p>
                  </div>

                  <div className="inline-flex items-center gap-1 p-1 bg-gray-100/90 dark:bg-[#1a1b1e] rounded-lg border border-gray-200/80 dark:border-[#3c4043]">
                    <button
                      type="button"
                      onClick={() => setStorageSubTab('storage')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                        storageSubTab === 'storage'
                          ? 'bg-white dark:bg-[#28292c] text-gray-900 dark:text-white shadow-xs font-semibold'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                      }`}
                    >
                      <Database className="w-3.5 h-3.5" />
                      <span>Storage Providers</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setStorageSubTab('backups')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                        storageSubTab === 'backups'
                          ? 'bg-white dark:bg-[#28292c] text-gray-900 dark:text-white shadow-xs font-semibold'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                      }`}
                    >
                      <Archive className="w-3.5 h-3.5" />
                      <span>Backups & Restore</span>
                    </button>
                  </div>
                </div>

                {storageSubTab === 'storage' ? <StorageSettings /> : <BackupSettings />}
              </div>
            )}
            {activeSettingsTab === 'api' && <ApiSettings />}
          </main>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;


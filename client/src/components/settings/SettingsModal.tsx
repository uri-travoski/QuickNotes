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
      icon: <Palette className="w-4 h-4 text-amber-500" />,
      ownerOnly: false,
    },
    {
      id: 'labels',
      label: 'Labels',
      icon: <Bookmark className="w-4 h-4 text-amber-500" />,
      ownerOnly: false,
    },
    {
      id: 'users',
      label: 'Users',
      icon: <User className="w-4 h-4 text-amber-500" />,
      ownerOnly: true,
    },
    {
      id: 'storage',
      label: 'Storage & Backup',
      icon: <HardDrive className="w-4 h-4 text-amber-500" />,
      ownerOnly: true,
    },
    {
      id: 'api',
      label: 'REST API',
      icon: <Code className="w-4 h-4 text-amber-500" />,
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

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-fade-in"
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl h-[88vh] max-h-[750px] bg-white dark:bg-[#202124] rounded-[6px] shadow-keep-modal border border-gray-200 dark:border-[#3c4043] overflow-hidden flex flex-col animate-scale-in"
      >
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-[#3c4043] flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            Settings
          </h2>
          <button
            type="button"
            onClick={handleClose}
            title="Close Settings"
            className="p-1.5 rounded-[6px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Sidebar + Main Content */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Sidebar Menu */}
          <div className="w-full md:w-56 lg:w-60 bg-[#f8f9fa] dark:bg-[#1a1b1e] border-b md:border-b-0 md:border-r border-gray-100 dark:border-[#3c4043] p-4 flex flex-col justify-between flex-shrink-0">
            {/* Navigation Tabs */}
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
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-[6px] text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                        isActive
                          ? 'bg-white dark:bg-[#28292c] text-gray-900 dark:text-gray-100 shadow-xs border border-gray-200/80 dark:border-[#3c4043] font-bold'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5 font-medium'
                      }`}
                    >
                      {t.icon}
                      <span>{t.label}</span>
                    </button>
                  );
                })}
            </nav>

            {/* User Session & Sign Out at bottom of sidebar */}
            <div className="pt-4 border-t border-gray-200/60 dark:border-[#3c4043] space-y-2 mt-4 md:mt-0 hidden md:block">
              <div className="text-[11px] font-medium text-gray-400 dark:text-gray-500">
                QuickNotes <span className="font-mono">{APP_VERSION}</span>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Signed in as <strong className="text-gray-800 dark:text-gray-200 font-bold">{currentUser?.display_name || currentUser?.username || 'App Owner'}</strong>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="flex items-center gap-2 text-xs font-semibold text-rose-500 hover:text-rose-600 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>

          {/* Right Content Area */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-white dark:bg-[#202124]">
            {activeSettingsTab === 'appearance' && <AppearanceSettings />}
            {activeSettingsTab === 'labels' && <LabelSettings />}
            {activeSettingsTab === 'users' && <UserSettings />}
            {activeSettingsTab === 'storage' && (
              <div className="space-y-6 animate-fade-in">
                {/* Sub-tab Switcher for Storage & Backup */}
                <div className="flex items-center gap-1 p-1 bg-gray-100/80 dark:bg-[#1a1b1e] rounded-[6px] border border-gray-200/60 dark:border-[#3c4043] w-fit">
                  <button
                    type="button"
                    onClick={() => setStorageSubTab('storage')}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-[6px] text-xs font-semibold transition-all cursor-pointer ${
                      storageSubTab === 'storage'
                        ? 'bg-white dark:bg-[#28292c] text-gray-900 dark:text-white shadow-xs'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    <Database className="w-3.5 h-3.5" />
                    <span>Storage Providers</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStorageSubTab('backups')}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-[6px] text-xs font-semibold transition-all cursor-pointer ${
                      storageSubTab === 'backups'
                        ? 'bg-white dark:bg-[#28292c] text-gray-900 dark:text-white shadow-xs'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>Backups & Restore</span>
                  </button>
                </div>

                {storageSubTab === 'storage' ? <StorageSettings /> : <BackupSettings />}
              </div>
            )}
            {activeSettingsTab === 'api' && <ApiSettings />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;

import React, { useState } from 'react';
import {
  Palette,
  Bookmark,
  User,
  HardDrive,
  Code,
  ArrowLeft,
  Settings as SettingsIcon,
  Archive,
  Database,
  ExternalLink,
} from 'lucide-react';
import { SettingsTab } from '../../types';
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

export const SettingsLayout: React.FC = () => {
  const {
    activeSettingsTab,
    setActiveSettingsTab,
    setActiveView,
    isOwner,
  } = useNotes();

  const [storageSubTab, setStorageSubTab] = useState<'storage' | 'backups'>('storage');

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

  const activeTabObj = tabs.find((t) => t.id === activeSettingsTab) || tabs[0];

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6 animate-fade-in">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveView('notes')}
            className="h-8 px-3 rounded-lg border border-gray-200 dark:border-[#3c4043] bg-white dark:bg-[#252629] hover:bg-gray-50 dark:hover:bg-[#323438] text-gray-700 dark:text-gray-200 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Notes</span>
          </button>

          <div className="flex items-center gap-2 text-xs font-semibold text-gray-900 dark:text-gray-100">
            <SettingsIcon className="w-4 h-4 text-amber-500" />
            <span>Settings</span>
            <span className="text-gray-300 dark:text-gray-600">/</span>
            <span className="text-amber-600 dark:text-amber-400">
              {activeTabObj.label}
            </span>
          </div>
        </div>

        {/* Link to Standalone HTML Manual */}
        <a
          href="/manual.html"
          target="_blank"
          rel="noopener noreferrer"
          className="h-8 px-3 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-900/60 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-xs font-medium transition-all flex items-center gap-1.5"
        >
          <span>Manual (HTML)</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Mobile Navigation Strip */}
      <div className="flex md:hidden items-center gap-1.5 overflow-x-auto p-1.5 mb-4 bg-gray-100 dark:bg-[#1a1b1e] rounded-xl border border-gray-200 dark:border-[#3c4043] no-scrollbar">
        {tabs
          .filter((t) => !t.ownerOnly || isOwner)
          .map((t) => {
            const isActive = activeSettingsTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveSettingsTab(t.id)}
                className={`flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white dark:bg-[#28292c] text-amber-600 dark:text-amber-400 shadow-xs font-semibold'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            );
          })}
      </div>

      {/* Main Settings Body: Desktop Sidebar + Content */}
      <div className="flex flex-col md:flex-row items-start gap-5">
        {/* Desktop Vertical Sidebar */}
        <aside className="hidden md:block w-56 lg:w-60 flex-shrink-0 bg-gray-50/70 dark:bg-[#1a1b1e] p-2.5 rounded-xl border border-gray-200/80 dark:border-[#3c4043] space-y-1">
          {tabs
            .filter((item) => !item.ownerOnly || isOwner)
            .map((t) => {
              const isActive = activeSettingsTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveSettingsTab(t.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white dark:bg-[#28292c] text-amber-600 dark:text-amber-400 shadow-xs border border-gray-200/80 dark:border-[#3c4043] font-semibold'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-white/60 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  <span className={`${isActive ? 'text-amber-500' : 'text-gray-400'}`}>
                    {t.icon}
                  </span>
                  <span className="truncate flex-1">{t.label}</span>
                  {t.ownerOnly && (
                    <span className="text-[9px] font-semibold uppercase px-1.5 py-0.2 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                      Admin
                    </span>
                  )}
                </button>
              );
            })}
        </aside>

        {/* Tab Content Card */}
        <main className="flex-1 w-full bg-white dark:bg-[#202124] rounded-2xl border border-gray-200/80 dark:border-[#3c4043] p-5 sm:p-7 shadow-xs min-w-0 overflow-hidden">
          {activeSettingsTab === 'appearance' && <AppearanceSettings />}
          {activeSettingsTab === 'labels' && <LabelSettings />}
          {activeSettingsTab === 'users' && <UserSettings />}
          {activeSettingsTab === 'storage' && (
            <div className="space-y-6 animate-fade-in">
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
  );
};

export default SettingsLayout;

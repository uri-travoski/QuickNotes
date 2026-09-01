import React from 'react';
import {
  Type,
  Users,
  Key,
  Tag as TagIcon,
  HardDrive,
  Archive,
  ArrowLeft,
  Settings as SettingsIcon,
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
    isApiUser,
  } = useNotes();

  const tabs: TabItem[] = [
    {
      id: 'labels',
      label: 'Labels',
      icon: <TagIcon className="w-4 h-4" />,
      ownerOnly: false,
    },
    {
      id: 'appearance',
      label: 'Appearance',
      icon: <Type className="w-4 h-4" />,
      ownerOnly: false,
    },
    {
      id: 'storage',
      label: 'Storage',
      icon: <HardDrive className="w-4 h-4" />,
      ownerOnly: true,
    },
    {
      id: 'backups',
      label: 'Backups',
      icon: <Archive className="w-4 h-4" />,
      ownerOnly: true,
    },
    {
      id: 'api',
      label: 'API',
      icon: <Key className="w-4 h-4" />,
      ownerOnly: true,
    },
    {
      id: 'users',
      label: 'Users',
      icon: <Users className="w-4 h-4" />,
      ownerOnly: true,
    },
  ];

  const activeTabObj = tabs.find((t) => t.id === activeSettingsTab);

  return (
    <div className="w-full max-w-6xl mx-auto px-2 sm:px-4 py-3 sm:py-4 animate-fade-in overflow-hidden">
      {/* Top Bar with Back Button */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 sm:mb-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveView('notes')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-gray-100 dark:bg-[#3c4043] hover:bg-gray-200 dark:hover:bg-[#4a4d51] text-gray-700 dark:text-gray-200 text-xs font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-gray-100">
            <SettingsIcon className="w-4 h-4 text-amber-500" />
            <span>Settings</span>
            <span className="text-gray-400">/</span>
            <span className="text-amber-600 dark:text-amber-400 capitalize">
              {activeTabObj?.label || activeSettingsTab}
            </span>
          </div>
        </div>

        {/* Link to Standalone HTML Manual */}
        <a
          href="/manual.html"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900 rounded-[6px] text-xs font-semibold transition-colors"
        >
          <span>Manual (HTML) ↗</span>
        </a>
      </div>

      {/* Mobile Horizontal Tabs Strip (Visible only on < md) */}
      <div className="flex md:hidden items-center gap-1.5 overflow-x-auto p-1.5 mb-3 bg-[#dfe4e9] dark:bg-[#282a2d] rounded-[6px] no-scrollbar">
        {tabs
          .filter((t) => !(t.ownerOnly && isApiUser))
          .map((t) => {
            const isActive = activeSettingsTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveSettingsTab(t.id)}
                className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-[6px] text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-white/70 dark:bg-[#202124] text-gray-700 dark:text-gray-300 hover:bg-white'
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            );
          })}
      </div>

      {/* Main Settings Body: Desktop Sidebar + Content */}
      <div className="flex flex-col md:flex-row items-start gap-4 sm:gap-6">
        {/* Desktop Vertical Sidebar (Visible only on >= md) */}
        <aside className="hidden md:block w-64 flex-shrink-0 bg-[#dfe4e9] dark:bg-[#282a2d] p-2.5 rounded-[6px] border border-[#c9d0d8] dark:border-[#3c4043] space-y-1">
          {tabs
            .filter((item) => !(item.ownerOnly && isApiUser))
            .map((t) => {
              const isActive = activeSettingsTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveSettingsTab(t.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-[6px] text-left transition-all ${
                    isActive
                      ? 'bg-white dark:bg-[#202124] text-amber-600 dark:text-amber-400 shadow-sm border border-gray-200/50 dark:border-transparent font-semibold'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-[#3c4043] font-medium'
                  }`}
                >
                  <span className={`${isActive ? 'text-amber-500' : 'text-gray-400'}`}>
                    {t.icon}
                  </span>
                  <span className="text-xs font-medium truncate">{t.label}</span>
                </button>
              );
            })}
        </aside>

        {/* Tab Content Card */}
        <main className="flex-1 w-full bg-white dark:bg-[#202124] rounded-[6px] sm:rounded-3xl border border-gray-200 dark:border-[#5f6368]/30 p-3.5 sm:p-6 shadow-sm min-w-0 overflow-hidden">
          {activeSettingsTab === 'labels' && <LabelSettings />}
          {activeSettingsTab === 'appearance' && <AppearanceSettings />}
          {activeSettingsTab === 'storage' && <StorageSettings />}
          {activeSettingsTab === 'backups' && <BackupSettings />}
          {activeSettingsTab === 'api' && <ApiSettings />}
          {activeSettingsTab === 'users' && <UserSettings />}
        </main>
      </div>
    </div>
  );
};

export default SettingsLayout;

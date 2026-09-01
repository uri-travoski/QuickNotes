import React, { useState, useRef, useEffect } from 'react';
import {
  PanelLeft,
  Menu,
  Moon,
  Sun,
  Settings as SettingsIcon,
  LogOut,
  LayoutGrid,
  List,
  HelpCircle,
  Coffee,
} from 'lucide-react';
import { useNotes } from '../context/NotesContext';
import { CenterSearchFilter } from './CenterSearchFilter';
import { BookmarkStackSymbol } from './icons';
import { AppTheme } from '../types';

export const Header: React.FC = () => {
  const {
    setActiveView,
    isGridView,
    setIsGridView,
    theme,
    setTheme,
    isDarkMode,
    isCoffeeMode,
    isKraftMode,
    isSidebarOpen,
    toggleSidebar,
    setIsSettingsModalOpen,
    showToast,
    logout,
  } = useNotes();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Keyboard shortcut: Press / anywhere to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        const searchInput = document.getElementById('search-input');
        searchInput?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleOpenSettings = () => {
    setIsSettingsModalOpen(true);
    setIsMenuOpen(false);
  };

  const handleToggleTheme = () => {
    const nextTheme: AppTheme = theme === 'default' ? 'dark' : theme === 'dark' ? 'coffee' : 'default';
    setTheme(nextTheme);
    const themeNames: Record<AppTheme, string> = {
      default: 'Default Light',
      dark: 'Dark',
      coffee: 'Coffee',
      kraft: 'Coffee',
    };
    showToast(`Switched to ${themeNames[nextTheme]} theme`);
  };

  const handleSignOut = async () => {
    setIsMenuOpen(false);
    await logout();
  };

  const isWarmTheme = isCoffeeMode || isKraftMode;

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white dark:bg-[#202124] border-b border-gray-200 dark:border-[#5f6368]/40 z-40 px-4 flex items-center justify-between transition-colors">
      {/* Left: Sidebar Toggle Button (Mobile/Tablet) + App Logo */}
      <div
        className={`flex items-center gap-2 sm:gap-3 flex-shrink-0 transition-all duration-200 ${
          isSidebarOpen ? 'lg:w-60' : 'lg:w-16'
        }`}
      >
        {/* Show sidebar toggle button on mobile/tablet ONLY when sidebar is hidden */}
        {!isSidebarOpen && (
          <button
            id="sidebar-toggle-btn"
            type="button"
            onClick={toggleSidebar}
            title="Show sidebar"
            className="p-2 -ml-1 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3c4043] text-gray-600 dark:text-gray-300 transition-colors flex items-center justify-center lg:hidden animate-fade-in"
          >
            <PanelLeft className="w-5 h-5" />
          </button>
        )}

        <div
          onClick={() => setActiveView('notes')}
          className="flex items-center gap-2.5 cursor-pointer select-none group"
        >
          <div
            style={{ width: '2.20rem', height: '2.20rem' }}
            className={`rounded-lg ${
              isWarmTheme
                ? 'bg-gradient-to-tr from-[#7c4a27] to-[#8d5630]'
                : 'bg-gradient-to-tr from-amber-500 to-amber-400'
            } flex items-center justify-center shadow-md text-white flex-shrink-0 transition-transform duration-200 group-hover:scale-105`}
          >
            <BookmarkStackSymbol className="w-5 h-5 text-white" />
          </div>
          <span
            style={{ fontSize: 'calc(1.25rem * var(--font-scale, 1))' }}
            className="font-semibold text-gray-800 dark:text-gray-100 tracking-tight hidden sm:inline leading-none"
          >
            QuickNotes
          </span>
        </div>
      </div>

      {/* Center: Searchbox aligned with take a note section (max-w-2xl) */}
      <div className="flex-1 flex justify-center items-center px-2 sm:px-4 min-w-0">
        <CenterSearchFilter />
      </div>

      {/* Right: Menu Icon with Dropdown Menu */}
      <div className="relative flex items-center justify-end flex-shrink-0" ref={menuRef}>
        <button
          type="button"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          title="Menu"
          className={`p-2 rounded-lg transition-colors ${
            isMenuOpen
              ? 'bg-gray-100 dark:bg-[#3c4043] text-gray-900 dark:text-gray-100'
              : 'hover:bg-gray-100 dark:hover:bg-[#3c4043] text-gray-600 dark:text-gray-300'
          }`}
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Dropdown Menu */}
        {isMenuOpen && (
          <div className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-[#2d2e30] rounded-2xl shadow-keep-modal border border-gray-200 dark:border-[#5f6368] py-1.5 z-50 text-xs text-gray-700 dark:text-gray-200 animate-scale-in">
            {/* 1. Grid / List View (Top) */}
            <button
              type="button"
              onClick={() => {
                setIsGridView(!isGridView);
                setIsMenuOpen(false);
              }}
              className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-gray-100 dark:hover:bg-[#3c4043] text-left transition-colors font-medium"
            >
              <div className="flex items-center gap-2.5">
                {isGridView ? (
                  <List className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                ) : (
                  <LayoutGrid className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                )}
                <span>{isGridView ? 'List view' : 'Grid view'}</span>
              </div>
              <span className="text-[10px] text-gray-400 font-mono">
                {isGridView ? 'Grid' : 'List'}
              </span>
            </button>

            {/* 2. Theme Toggle (Second) */}
            <button
              type="button"
              onClick={handleToggleTheme}
              className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-gray-100 dark:hover:bg-[#3c4043] text-left transition-colors font-medium"
            >
              <div className="flex items-center gap-2.5">
                {isWarmTheme ? (
                  <Coffee className="w-4 h-4 text-amber-700" />
                ) : isDarkMode ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-gray-500" />
                )}
                <span>
                  {isWarmTheme
                    ? 'Default theme'
                    : isDarkMode
                    ? 'Coffee theme'
                    : 'Dark theme'}
                </span>
              </div>
              <span className="text-[10px] text-gray-400 font-mono capitalize">
                {theme === 'kraft' ? 'coffee' : theme}
              </span>
            </button>

            {/* 3. Settings (Third) */}
            <button
              type="button"
              onClick={handleOpenSettings}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-gray-100 dark:hover:bg-[#3c4043] text-left transition-colors font-medium"
            >
              <SettingsIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span>Settings</span>
            </button>

            {/* 4. Help (Just above Signout - Opens full manual directly) */}
            <a
              href="/manual.html"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsMenuOpen(false)}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-gray-100 dark:hover:bg-[#3c4043] text-left transition-colors font-medium text-gray-700 dark:text-gray-200"
            >
              <HelpCircle className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span>Help</span>
            </a>

            {/* 5. Sign Out */}
            <div className="pt-1 mt-1 border-t border-gray-100 dark:border-[#3c4043]">
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 text-left transition-colors font-semibold cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;

import React from 'react';
import {
  Sun,
  Moon,
  CheckSquare,
  Star,
  Palette,
  Type,
  Maximize2,
  Coffee,
} from 'lucide-react';
import { useNotes, FONT_FAMILIES, FONT_SIZES } from '../../context/NotesContext';
import { FontFamilyOption, FontSizeOption, AppTheme } from '../../types';

export const AppearanceSettings: React.FC = () => {
  const {
    fontFamily,
    setFontFamily,
    fontSize,
    setFontSize,
    theme,
    setTheme,
    isDarkMode,
    isCoffeeMode,
    isKraftMode,
    showToast,
  } = useNotes();

  const isWarmTheme = isCoffeeMode || isKraftMode;

  const handleFontChange = (key: FontFamilyOption) => {
    setFontFamily(key);
    showToast(`Font set to ${FONT_FAMILIES[key].name}`);
  };

  const handleSizeChange = (key: FontSizeOption) => {
    setFontSize(key);
    showToast(`Font size set to ${FONT_SIZES[key].label}`);
  };

  const handleThemeChange = (newTheme: AppTheme) => {
    setTheme(newTheme);
    const themeNames: Record<AppTheme, string> = {
      default: 'Default Light',
      dark: 'Dark',
      coffee: 'Coffee',
      kraft: 'Coffee',
    };
    showToast(`Switched to ${themeNames[newTheme]} theme`);
  };

  const fontOptions: { id: FontFamilyOption; label: string; desc: string }[] = [
    { id: 'ibm', label: 'IBM Plex Sans', desc: 'Modern & Engineered' },
    { id: 'jakarta', label: 'Plus Jakarta', desc: 'Clean & Contemporary' },
    { id: 'inter', label: 'Inter', desc: 'Highly Legible Neutral' },
    { id: 'noto', label: 'Noto Sans', desc: 'Google Standard' },
    { id: 'merriweather', label: 'Merriweather', desc: 'Editorial Serif' },
    { id: 'system', label: 'System Default', desc: 'Native OS Typeface' },
  ];

  const sizeOptions: { id: FontSizeOption; label: string; px: string }[] = [
    { id: 'compact', label: 'Small', px: '13px' },
    { id: 'default', label: 'Default', px: '15px' },
    { id: 'medium', label: 'Medium', px: '16px' },
    { id: 'large', label: 'Large', px: '18px' },
    { id: 'xlarge', label: 'Extra Large', px: '20px' },
  ];

  const themeOptions: {
    id: AppTheme;
    label: string;
    desc: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'default',
      label: 'Default',
      desc: 'Crisp white cards & clean canvas',
      icon: <Sun className="w-4 h-4 text-amber-500" />,
    },
    {
      id: 'dark',
      label: 'Dark',
      desc: 'Sleek #202124 dark surface',
      icon: <Moon className="w-4 h-4 text-indigo-400" />,
    },
    {
      id: 'coffee',
      label: 'Coffee',
      desc: 'Warm paper, parchment cards & espresso typography',
      icon: <Coffee className="w-4 h-4 text-amber-700" />,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="pb-4 border-b border-gray-100 dark:border-[#3c4043]">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Palette className="w-5 h-5 text-amber-500" />
          Appearance & Typography
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Customize typography, scale, base font sizes, and theme colors.
        </p>
      </div>

      {/* Card 1: Font Family */}
      <div className="p-5 rounded-[6px] border border-gray-200 dark:border-[#3c4043] bg-white dark:bg-[#28292c] space-y-3.5 shadow-xs">
        <div className="flex items-center gap-2">
          <Type className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
            Font Family
          </h3>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
          Choose the typeface applied across the entire application interface.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
          {fontOptions.map((opt) => {
            const isSelected = fontFamily === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleFontChange(opt.id)}
                className={`h-12 px-3.5 rounded-[6px] text-left transition-all cursor-pointer flex flex-col justify-center ${
                  isSelected
                    ? 'bg-amber-500 text-gray-950 font-bold ring-2 ring-amber-400/40 shadow-xs'
                    : 'bg-gray-50 hover:bg-gray-100 dark:bg-[#202124] dark:hover:bg-[#323438] text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-[#3c4043]'
                }`}
              >
                <span className="text-xs font-semibold leading-tight">{opt.label}</span>
                <span className={`text-[10px] ${isSelected ? 'text-gray-900/80' : 'text-gray-400 dark:text-gray-500'}`}>
                  {opt.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Card 2: Base Font Size */}
      <div className="p-5 rounded-[6px] border border-gray-200 dark:border-[#3c4043] bg-white dark:bg-[#28292c] space-y-3.5 shadow-xs">
        <div className="flex items-center gap-2">
          <Maximize2 className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
            Base Font Size
          </h3>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
          Adjust text scale across notes, sidebar, checklists, and editor components.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
          {sizeOptions.map((opt) => {
            const isSelected = fontSize === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSizeChange(opt.id)}
                className={`h-11 px-3 rounded-[6px] text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                  isSelected
                    ? 'bg-amber-500 text-gray-950 font-bold ring-2 ring-amber-400/40 shadow-xs'
                    : 'bg-gray-50 hover:bg-gray-100 dark:bg-[#202124] dark:hover:bg-[#323438] text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-[#3c4043]'
                }`}
              >
                <span className="text-xs font-semibold leading-tight">{opt.label}</span>
                <span className={`text-[10px] font-mono ${isSelected ? 'text-gray-900/80' : 'text-gray-400 dark:text-gray-500'}`}>
                  {opt.px}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Card 3: Color Theme */}
      <div className="p-5 rounded-[6px] border border-gray-200 dark:border-[#3c4043] bg-white dark:bg-[#28292c] space-y-3.5 shadow-xs">
        <div className="flex items-center gap-2">
          <Sun className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
            Theme Mode
          </h3>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
          Choose between Google Keep light canvas, high-contrast dark theme, or warm Coffee paper theme.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {themeOptions.map((opt) => {
            const isSelected = theme === opt.id || (opt.id === 'coffee' && theme === 'kraft');
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleThemeChange(opt.id)}
                className={`h-16 px-3.5 rounded-[6px] text-left transition-all cursor-pointer flex items-center gap-3 ${
                  isSelected
                    ? 'bg-amber-500 text-gray-950 font-bold ring-2 ring-amber-400/40 shadow-xs'
                    : 'bg-gray-50 hover:bg-gray-100 dark:bg-[#202124] dark:hover:bg-[#323438] text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-[#3c4043]'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-[6px] flex items-center justify-center flex-shrink-0 ${
                    isSelected ? 'bg-black/10 text-gray-950' : 'bg-white dark:bg-[#2d2e30] shadow-xs'
                  }`}
                >
                  {opt.icon}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold leading-tight truncate">{opt.label}</div>
                  <div
                    className={`text-[10px] leading-tight line-clamp-2 mt-0.5 ${
                      isSelected ? 'text-gray-900/80' : 'text-gray-400 dark:text-gray-500'
                    }`}
                  >
                    {opt.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Live Preview Card */}
      <div className="p-5 rounded-[6px] border border-gray-200 dark:border-[#3c4043] bg-white dark:bg-[#28292c] space-y-3 shadow-xs">
        <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          Live Note Card Preview ({isWarmTheme ? 'Coffee' : isDarkMode ? 'Dark' : 'Default'})
        </div>

        <div
          className={`p-4 rounded-xl border shadow-xs space-y-2.5 transition-all ${
            isWarmTheme
              ? 'bg-[#fbf8f1] border-[#dfd3c0] text-[#3c2a1d]'
              : isDarkMode
              ? 'bg-[#2e261f] border-amber-900/60 text-gray-100'
              : 'bg-amber-50/70 border-amber-200/80 text-gray-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <h4
              className={`font-bold text-sm flex items-center gap-2 ${
                isWarmTheme ? 'font-serif text-[#734822]' : 'text-gray-900 dark:text-gray-100'
              }`}
            >
              <span>Trip to Kyoto & Tokyo 🌸</span>
              <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
            </h4>
            <span
              className={`px-2 py-0.5 rounded-[6px] text-[11px] font-bold ${
                isWarmTheme
                  ? 'bg-[#e8dece] text-[#5c4028] border border-[#dfd3c0]'
                  : 'bg-amber-200/80 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200'
              }`}
            >
              Travel / Kyoto & Tokyo
            </span>
          </div>

          <p
            className={`text-xs ${
              isWarmTheme ? 'text-[#453325]' : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            Exploring traditional shrines, historic tea houses, and modern design hubs across Kansai.
          </p>

          <div className="space-y-1 text-xs">
            <div
              className={`flex items-center gap-2 line-through ${
                isWarmTheme ? 'text-[#806f60]' : 'text-gray-500'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
              <span>Book Shinkansen express train tickets</span>
            </div>
            <div
              className={`flex items-center gap-2 ${
                isWarmTheme ? 'text-[#3c2a1d]' : 'text-gray-800 dark:text-gray-200'
              }`}
            >
              <div
                className={`w-3.5 h-3.5 rounded border ${
                  isWarmTheme ? 'border-[#806f60]' : 'border-gray-400 dark:border-gray-500'
                }`}
              />
              <span>Visit Fushimi Inari shrine at sunrise</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppearanceSettings;

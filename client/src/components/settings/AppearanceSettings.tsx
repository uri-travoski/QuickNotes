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
  Check,
  Sparkles,
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
      dark: 'Dark Mode',
      coffee: 'Warm Coffee',
      kraft: 'Warm Coffee',
    };
    showToast(`Switched to ${themeNames[newTheme]}`);
  };

  const fontOptions: { id: FontFamilyOption; label: string; desc: string; sample: string }[] = [
    { id: 'ibm', label: 'IBM Plex Sans', desc: 'Engineered & Modern', sample: 'Aa Bb 123' },
    { id: 'jakarta', label: 'Plus Jakarta', desc: 'Clean & Contemporary', sample: 'Aa Bb 123' },
    { id: 'inter', label: 'Inter', desc: 'Neutral & High Legibility', sample: 'Aa Bb 123' },
    { id: 'noto', label: 'Noto Sans', desc: 'Google Standard Sans', sample: 'Aa Bb 123' },
    { id: 'merriweather', label: 'Merriweather', desc: 'Editorial Serif', sample: 'Aa Bb 123' },
    { id: 'system', label: 'System Default', desc: 'Native OS Typeface', sample: 'Aa Bb 123' },
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
      label: 'Default Light',
      desc: 'Crisp white cards on a light canvas',
      icon: <Sun className="w-4 h-4 text-amber-500" />,
    },
    {
      id: 'dark',
      label: 'Dark Mode',
      desc: 'Deep dark surface with high contrast text',
      icon: <Moon className="w-4 h-4 text-indigo-400" />,
    },
    {
      id: 'coffee',
      label: 'Warm Coffee',
      desc: 'Parchment background with espresso typography',
      icon: <Coffee className="w-4 h-4 text-amber-700" />,
    },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="pb-4 border-b border-gray-100 dark:border-[#3c4043]">
        <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Palette className="w-4.5 h-4.5 text-amber-500" />
          Appearance & Typography
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Customize font family, base scaling, theme colors, and live preview your notes layout.
        </p>
      </div>

      {/* Card 1: Font Family */}
      <div className="p-5 rounded-xl border border-gray-200/80 dark:border-[#3c4043] bg-white dark:bg-[#252629] space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Type className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100">
                Font Family
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Typeface applied across all notes, sidebars, and dialogs
              </p>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
            {FONT_FAMILIES[fontFamily]?.name}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {fontOptions.map((opt) => {
            const isSelected = fontFamily === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleFontChange(opt.id)}
                className={`p-3 rounded-lg text-left transition-all cursor-pointer flex items-center justify-between border ${
                  isSelected
                    ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/30 text-amber-950 dark:text-amber-100 ring-1 ring-amber-500/30 shadow-xs'
                    : 'border-gray-200/80 dark:border-[#3c4043] bg-gray-50/50 dark:bg-[#1f2023] hover:bg-gray-100/70 dark:hover:bg-[#2a2b2f] text-gray-800 dark:text-gray-200'
                }`}
              >
                <div className="min-w-0 pr-2">
                  <div className="text-xs font-semibold leading-tight truncate flex items-center gap-1.5">
                    <span>{opt.label}</span>
                  </div>
                  <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                    {opt.desc}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 font-mono hidden sm:inline">
                    {opt.sample}
                  </span>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center">
                      <Check className="w-3 h-3 stroke-[2.5]" />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Card 2: Base Font Size */}
      <div className="p-5 rounded-xl border border-gray-200/80 dark:border-[#3c4043] bg-white dark:bg-[#252629] space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Maximize2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100">
                Base Font Size
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Scales note cards, body text, lists, and checklists
              </p>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 font-mono">
            {FONT_SIZES[fontSize]?.label} ({FONT_SIZES[fontSize]?.description})
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {sizeOptions.map((opt) => {
            const isSelected = fontSize === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSizeChange(opt.id)}
                className={`h-11 px-2.5 rounded-lg text-center transition-all cursor-pointer flex flex-col items-center justify-center border ${
                  isSelected
                    ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/30 text-amber-950 dark:text-amber-100 ring-1 ring-amber-500/30 shadow-xs font-bold'
                    : 'border-gray-200/80 dark:border-[#3c4043] bg-gray-50/50 dark:bg-[#1f2023] hover:bg-gray-100/70 dark:hover:bg-[#2a2b2f] text-gray-800 dark:text-gray-200'
                }`}
              >
                <span className="text-xs font-medium leading-tight">{opt.label}</span>
                <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500 mt-0.5">
                  {opt.px}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Card 3: Color Theme */}
      <div className="p-5 rounded-xl border border-gray-200/80 dark:border-[#3c4043] bg-white dark:bg-[#252629] space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Sun className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100">
                Theme Mode
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Select contrast and color ambiance
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {themeOptions.map((opt) => {
            const isSelected = theme === opt.id || (opt.id === 'coffee' && theme === 'kraft');
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleThemeChange(opt.id)}
                className={`p-3.5 rounded-lg text-left transition-all cursor-pointer flex items-center gap-3 border ${
                  isSelected
                    ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/30 text-amber-950 dark:text-amber-100 ring-1 ring-amber-500/30 shadow-xs'
                    : 'border-gray-200/80 dark:border-[#3c4043] bg-gray-50/50 dark:bg-[#1f2023] hover:bg-gray-100/70 dark:hover:bg-[#2a2b2f] text-gray-800 dark:text-gray-200'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 border ${
                    isSelected
                      ? 'bg-white dark:bg-[#202124] border-amber-300 dark:border-amber-700 shadow-xs'
                      : 'bg-white dark:bg-[#28292c] border-gray-200 dark:border-[#3c4043]'
                  }`}
                >
                  {opt.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold leading-tight flex items-center justify-between">
                    <span>{opt.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 stroke-[2.5]" />}
                  </div>
                  <div className="text-[10px] leading-tight text-gray-400 dark:text-gray-500 mt-1 line-clamp-2">
                    {opt.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Live Preview Card */}
      <div className="p-5 rounded-xl border border-gray-200/80 dark:border-[#3c4043] bg-white dark:bg-[#252629] space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Interactive Note Card Preview</span>
          </div>
          <span className="text-[10px] font-medium text-gray-400 font-mono">
            {isWarmTheme ? 'Warm Coffee' : isDarkMode ? 'Dark Mode' : 'Default Light'} • {FONT_FAMILIES[fontFamily]?.name}
          </span>
        </div>

        <div
          className={`p-4.5 rounded-xl border shadow-xs space-y-3 transition-all ${
            isWarmTheme
              ? 'bg-[#fbf8f1] border-[#dfd3c0] text-[#3c2a1d]'
              : isDarkMode
              ? 'bg-[#2b2723] border-amber-900/40 text-gray-100'
              : 'bg-amber-50/60 border-amber-200/80 text-gray-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <h4
              className={`font-bold text-sm flex items-center gap-2 ${
                isWarmTheme ? 'font-serif text-[#734822]' : 'text-gray-900 dark:text-gray-100'
              }`}
            >
              <span>Trip to Kyoto & Tokyo 🌸</span>
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
            </h4>
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                isWarmTheme
                  ? 'bg-[#e8dece] text-[#5c4028] border border-[#dfd3c0]'
                  : 'bg-amber-200/70 dark:bg-amber-900/70 text-amber-900 dark:text-amber-200'
              }`}
            >
              Travel / Japan 2026
            </span>
          </div>

          <p
            className={`text-xs leading-relaxed ${
              isWarmTheme ? 'text-[#453325]' : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            Exploring traditional shrines, historic tea houses, and modern design hubs across Kansai.
          </p>

          <div className="space-y-1.5 text-xs pt-0.5">
            <div
              className={`flex items-center gap-2 line-through ${
                isWarmTheme ? 'text-[#806f60]' : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
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
                } flex-shrink-0`}
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

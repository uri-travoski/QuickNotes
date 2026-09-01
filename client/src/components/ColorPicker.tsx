import React from 'react';
import { Check } from 'lucide-react';
import { NoteColor } from '../types';

export interface ColorOption {
  id: NoteColor;
  name: string;
  lightBg: string;
  darkBg: string;
  kraftBg: string;
  borderLight: string;
  borderDark: string;
  borderKraft: string;
}

export const NOTE_COLORS: ColorOption[] = [
  { id: 'default', name: 'Default', lightBg: '#ffffff', darkBg: '#202124', kraftBg: '#fbf8f1', borderLight: '#e0e0e0', borderDark: '#5f6368', borderKraft: '#dfd3c0' },
  { id: 'coral', name: 'Coral', lightBg: '#fceae8', darkBg: '#441920', kraftBg: '#f7e4df', borderLight: '#f7cac5', borderDark: '#6b2734', borderKraft: '#e9cdc5' },
  { id: 'peach', name: 'Peach', lightBg: '#fbf0e4', darkBg: '#3e2418', kraftBg: '#f7ebd8', borderLight: '#f6d5b7', borderDark: '#663925', borderKraft: '#e8d5bf' },
  { id: 'sand', name: 'Sand', lightBg: '#fefbe8', darkBg: '#403410', kraftBg: '#f7f1d4', borderLight: '#faee96', borderDark: '#6e5a1b', borderKraft: '#e7dcaf' },
  { id: 'mint', name: 'Mint', lightBg: '#f0faea', darkBg: '#183626', kraftBg: '#e6f1df', borderLight: '#ceecc0', borderDark: '#28583e', borderKraft: '#d1e3c8' },
  { id: 'sage', name: 'Sage', lightBg: '#e6f7f4', darkBg: '#123936', kraftBg: '#e0ece5', borderLight: '#bce9e0', borderDark: '#1e5a55', borderKraft: '#c8dcd3' },
  { id: 'fog', name: 'Fog', lightBg: '#eaf3f8', darkBg: '#163543', kraftBg: '#dfebf0', borderLight: '#c2dded', borderDark: '#25546a', borderKraft: '#c6dbe2' },
  { id: 'storm', name: 'Storm', lightBg: '#e4ecf3', darkBg: '#192b3a', kraftBg: '#dbe4eb', borderLight: '#bcd3e5', borderDark: '#29435b', borderKraft: '#c3d2dc' },
  { id: 'blossom', name: 'Blossom', lightBg: '#f5eef9', darkBg: '#2e1d3e', kraftBg: '#eee3ee', borderLight: '#dfcbeb', borderDark: '#492f62', borderKraft: '#ded0de' },
  { id: 'clay', name: 'Clay', lightBg: '#fcf1ed', darkBg: '#3f212f', kraftBg: '#f3e4dc', borderLight: '#f6d7cc', borderDark: '#63354b', borderKraft: '#e4cfc5' },
  { id: 'chalk', name: 'Chalk', lightBg: '#f7f4ed', darkBg: '#322c24', kraftBg: '#eee8dd', borderLight: '#e7e0d1', borderDark: '#4e4539', borderKraft: '#ddd4c6' },
  { id: 'gray', name: 'Gray', lightBg: '#f6f6f8', darkBg: '#2d2f31', kraftBg: '#ebe8e3', borderLight: '#e2e2e6', borderDark: '#3c3f41', borderKraft: '#dad5cd' },
];

export function getNoteColorClasses(
  color: NoteColor,
  isDark: boolean = false,
  isKraft: boolean = false
): { bg: string; border: string; style: React.CSSProperties } {
  const opt = NOTE_COLORS.find((c) => c.id === color) || NOTE_COLORS[0];
  const bg = isDark ? opt.darkBg : isKraft ? opt.kraftBg : opt.lightBg;
  const border = isDark ? opt.borderDark : isKraft ? opt.borderKraft : opt.borderLight;

  return {
    bg,
    border,
    style: {
      backgroundColor: bg,
      borderColor: border,
    },
  };
}

interface ColorPickerProps {
  selectedColor: NoteColor;
  onSelectColor: (color: NoteColor) => void;
  className?: string;
  columns?: number;
  isKraft?: boolean;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
  selectedColor,
  onSelectColor,
  className = '',
  columns = 4,
  isKraft = false,
}) => {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`p-2 bg-white dark:bg-[#2d2e30] rounded-xl shadow-keep-modal border border-gray-200 dark:border-[#5f6368] grid gap-1.5 ${
        columns === 4 ? 'grid-cols-4 w-full' : 'grid-cols-4 sm:grid-cols-6 w-max'
      } ${className}`}
    >
      {NOTE_COLORS.map((c) => {
        const isSelected = selectedColor === c.id;
        const bg = isKraft ? c.kraftBg : c.lightBg;
        const border = isKraft ? c.borderKraft : c.borderLight;
        return (
          <button
            key={c.id}
            type="button"
            title={c.name}
            onClick={(e) => {
              e.stopPropagation();
              onSelectColor(c.id);
            }}
            style={{
              backgroundColor: bg,
              borderColor: border,
            }}
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-transform hover:scale-110 relative mx-auto ${
              isSelected ? 'ring-2 ring-amber-500 ring-offset-1 dark:ring-offset-[#202124]' : ''
            }`}
          >
            {isSelected && (
              <Check className="w-3 h-3 text-gray-800 dark:text-gray-900 stroke-[3]" />
            )}
          </button>
        );
      })}
    </div>
  );
};

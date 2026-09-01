import React from 'react';
import { Check } from 'lucide-react';
import { LABEL_COLOR_PRESETS, getLabelDotColors } from '../../utils/labelColors';

interface LabelColorPickerProps {
  selectedColor: string;
  onSelectColor: (colorId: string) => void;
  className?: string;
  showPreview?: boolean;
}

export const LabelColorPicker: React.FC<LabelColorPickerProps> = ({
  selectedColor,
  onSelectColor,
  className = '',
  showPreview = true,
}) => {
  const currentPair = getLabelDotColors(selectedColor);

  return (
    <div className={`space-y-3 ${className}`}>
      {showPreview && (
        <div className="flex items-center gap-3 p-2.5 rounded-[6px] bg-gray-50 dark:bg-[#202124] border border-gray-200 dark:border-[#3c4043] text-xs">
          <span className="text-gray-500 dark:text-gray-400 font-medium">Preview:</span>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-[6px] bg-white dark:bg-[#2d2e30] border border-gray-200/80 dark:border-gray-600/60 shadow-2xs">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: currentPair.parent }}
              />
              <span className="font-semibold text-gray-800 dark:text-gray-200">Parent</span>
            </div>
            <span className="text-gray-400">→</span>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-[6px] bg-white dark:bg-[#2d2e30] border border-gray-200/80 dark:border-gray-600/60 shadow-2xs">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: currentPair.child }}
              />
              <span className="font-normal text-gray-600 dark:text-gray-300">Nested</span>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-6 gap-2">
        {LABEL_COLOR_PRESETS.map((option) => {
          const isSelected = selectedColor === option.id || selectedColor === option.parent;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelectColor(option.id)}
              title={option.name}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-115 relative cursor-pointer ${
                isSelected
                  ? 'ring-2 ring-amber-500 ring-offset-2 dark:ring-offset-[#2d2e30] scale-105 shadow-sm'
                  : 'hover:shadow-xs'
              }`}
              style={{ backgroundColor: option.parent }}
            >
              {isSelected && <Check className="w-3.5 h-3.5 text-white drop-shadow-xs" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};

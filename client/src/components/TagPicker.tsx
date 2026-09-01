import React, { useState, useRef, useEffect } from 'react';
import { Check, Plus, Tag as TagIcon, Search } from 'lucide-react';
import { useNotes } from '../context/NotesContext';
import * as api from '../api/client';

interface TagPickerProps {
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
  onClose?: () => void;
  className?: string;
}

export const TagPicker: React.FC<TagPickerProps> = ({
  selectedTagIds,
  onChange,
  onClose,
  className = '',
}) => {
  const { tags, loadTags, showToast } = useNotes();
  const [search, setSearch] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose?.();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const filteredTags = tags.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    (t.parent_name && t.parent_name.toLowerCase().includes(search.toLowerCase()))
  );

  const handleToggle = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter((id) => id !== tagId));
    } else {
      onChange([...selectedTagIds, tagId]);
    }
  };

  const handleCreateTag = async () => {
    if (!search.trim()) return;
    try {
      setIsCreating(true);
      const newTag = await api.createTag(search.trim());
      await loadTags();
      onChange([...selectedTagIds, newTag.id]);
      setSearch('');
      showToast(`Label "${newTag.name}" created`);
    } catch (err: any) {
      console.error('Failed to create tag:', err);
      showToast(err.message || 'Failed to create label');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div
      ref={pickerRef}
      onClick={(e) => e.stopPropagation()}
      className={`p-2.5 bg-white dark:bg-[#2d2e30] rounded-2xl shadow-keep-modal border border-gray-200 dark:border-[#5f6368] w-64 text-sm text-gray-700 dark:text-gray-200 z-50 animate-scale-in ${className}`}
    >
      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-1">
        Label note
      </div>

      <div className="relative mb-2">
        <input
          type="text"
          placeholder="Search or create label..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (filteredTags.length === 0 && search.trim()) {
                handleCreateTag();
              }
            }
          }}
          className="w-full pl-7 pr-2 py-1.5 bg-gray-100 dark:bg-[#202124] border border-transparent focus:border-amber-500 rounded-lg text-xs focus:outline-none"
        />
        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2 top-2.5" />
      </div>

      <div className="max-h-48 overflow-y-auto space-y-0.5">
        {filteredTags.map((tag) => {
          const isSelected = selectedTagIds.includes(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => handleToggle(tag.id)}
              className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3c4043] text-left transition-colors text-xs"
            >
              <div className="flex items-center gap-2 truncate">
                <TagIcon className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                <span className="truncate">
                  {tag.parent_name ? (
                    <span>
                      <span className="text-gray-400 font-normal">{tag.parent_name} / </span>
                      <span className="font-semibold">{tag.name}</span>
                    </span>
                  ) : (
                    <span className="font-semibold">{tag.name}</span>
                  )}
                </span>
              </div>
              <div
                className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                  isSelected
                    ? 'bg-amber-500 border-amber-500 text-white'
                    : 'border-gray-300 dark:border-[#5f6368]'
                }`}
              >
                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
            </button>
          );
        })}

        {filteredTags.length === 0 && search.trim() && (
          <button
            type="button"
            disabled={isCreating}
            onClick={handleCreateTag}
            className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/60 text-left text-amber-600 dark:text-amber-400 text-xs font-semibold"
          >
            <Plus className="w-4 h-4" />
            <span className="truncate">Create "{search.trim()}"</span>
          </button>
        )}
      </div>
    </div>
  );
};

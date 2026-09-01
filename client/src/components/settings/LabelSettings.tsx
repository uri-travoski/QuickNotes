import React, { useState, useRef, useEffect } from 'react';
import {
  Tag as TagIcon,
  Plus,
  Edit2,
  Trash2,
  FolderPlus,
  CornerDownRight,
  X,
  Palette,
  ChevronDown,
} from 'lucide-react';
import { Tag } from '../../types';
import * as api from '../../api/client';
import { useNotes } from '../../context/NotesContext';
import {
  getLabelDotColors,
  getAutoPickedColor,
} from '../../utils/labelColors';
import { LabelColorPicker } from './LabelColorPicker';

export const LabelSettings: React.FC = () => {
  const { tagTree, loadTags, showToast, openConfirmDialog } = useNotes();

  // Create Root Label state
  const [newRootName, setNewRootName] = useState('');
  const [newRootColor, setNewRootColor] = useState(() => getAutoPickedColor(tagTree.length));
  const [isNewColorPickerOpen, setIsNewColorPickerOpen] = useState(false);

  // Sub-label creation state
  const [addingSubForRootId, setAddingSubForRootId] = useState<string | null>(null);
  const [newSubName, setNewSubName] = useState('');

  // Inline color picker popover state for existing parent labels
  const [activeColorPickerRootId, setActiveColorPickerRootId] = useState<string | null>(null);

  // Editing label state
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [editName, setEditName] = useState('');
  const [editParentId, setEditParentId] = useState<string | null>(null);
  const [editColor, setEditColor] = useState('blue');

  const newColorRef = useRef<HTMLDivElement>(null);
  const inlineColorRef = useRef<HTMLDivElement>(null);

  // Auto-update new root color suggestion when tagTree length changes
  useEffect(() => {
    setNewRootColor(getAutoPickedColor(tagTree.length));
  }, [tagTree.length]);

  // Click outside to close color popovers
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (newColorRef.current && !newColorRef.current.contains(e.target as Node)) {
        setIsNewColorPickerOpen(false);
      }
      if (inlineColorRef.current && !inlineColorRef.current.contains(e.target as Node)) {
        setActiveColorPickerRootId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCreateRoot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRootName.trim()) return;

    try {
      await api.createTag(newRootName.trim(), null, newRootColor);
      setNewRootName('');
      setNewRootColor(getAutoPickedColor(tagTree.length + 1));
      setIsNewColorPickerOpen(false);
      loadTags();
      showToast('Root label created');
    } catch (err: any) {
      showToast(err.message || 'Failed to create label');
    }
  };

  const handleCreateSub = async (parentId: string) => {
    if (!newSubName.trim()) return;

    try {
      await api.createTag(newSubName.trim(), parentId);
      setNewSubName('');
      setAddingSubForRootId(null);
      loadTags();
      showToast('Sub-label created');
    } catch (err: any) {
      showToast(err.message || 'Failed to create sub-label');
    }
  };

  const handleQuickChangeRootColor = async (root: Tag, newColor: string) => {
    try {
      await api.updateTag(root.id, root.name, null, newColor);
      setActiveColorPickerRootId(null);
      loadTags();
      showToast('Label color updated');
    } catch (err: any) {
      showToast(err.message || 'Failed to update color');
    }
  };

  const handleUpdateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTag || !editName.trim()) return;

    try {
      await api.updateTag(editingTag.id, editName.trim(), editParentId, editColor);
      setEditingTag(null);
      loadTags();
      showToast('Label updated');
    } catch (err: any) {
      showToast(err.message || 'Failed to update label');
    }
  };

  const handleDeleteTag = (tag: Tag) => {
    const isParent = !tag.parent_id && tag.children && tag.children.length > 0;
    const msg = isParent
      ? `Are you sure you want to delete parent label "${tag.name}" and all its sub-labels?`
      : `Are you sure you want to delete label "${tag.name}"?`;

    openConfirmDialog({
      title: 'Delete Label',
      message: msg,
      confirmText: 'Delete Label',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await api.deleteTag(tag.id);
          loadTags();
          showToast('Label deleted');
        } catch (err: any) {
          showToast(err.message || 'Failed to delete label');
        }
      },
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="pb-4 border-b border-gray-100 dark:border-[#3c4043]">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <TagIcon className="w-5 h-5 text-amber-500" />
          Labels Management
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Create top-level root categories and nested sub-labels. Sub-labels automatically inherit a lighter tint of the parent color.
        </p>
      </div>

      {/* Quick Add Root Label Bar */}
      <form onSubmit={handleCreateRoot} className="flex items-center gap-2.5 relative">
        <div className="relative" ref={newColorRef}>
          <button
            type="button"
            onClick={() => setIsNewColorPickerOpen(!isNewColorPickerOpen)}
            title="Pick label color"
            className="h-10 px-3 bg-white dark:bg-[#1a1b1e] border border-gray-200 dark:border-[#3c4043] rounded-[6px] hover:bg-gray-50 dark:hover:bg-[#28292c] transition-all flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <span
              className="w-4 h-4 rounded-full shadow-xs flex-shrink-0"
              style={{ backgroundColor: getLabelDotColors(newRootColor).parent }}
            />
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          </button>

          {isNewColorPickerOpen && (
            <div className="absolute top-full left-0 mt-2 p-3.5 w-60 bg-white dark:bg-[#28292c] rounded-[6px] shadow-keep-modal border border-gray-200 dark:border-[#3c4043] z-50 animate-scale-in">
              <span className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-2">
                Select Label Color
              </span>
              <LabelColorPicker
                selectedColor={newRootColor}
                onSelectColor={(colorId) => {
                  setNewRootColor(colorId);
                  setIsNewColorPickerOpen(false);
                }}
                showPreview={true}
              />
            </div>
          )}
        </div>

        <input
          type="text"
          placeholder="Add a new root label..."
          value={newRootName}
          onChange={(e) => setNewRootName(e.target.value)}
          className="flex-1 h-10 px-3.5 bg-gray-50 dark:bg-[#1a1b1e] border border-gray-200 dark:border-[#3c4043] rounded-[6px] text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
        />

        <button
          type="submit"
          className="h-10 px-4 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white rounded-[6px] text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>Add Label</span>
        </button>
      </form>

      {/* Hierarchical Label Tree */}
      <div className="space-y-3">
        {tagTree.map((root) => {
          const rootDotColors = getLabelDotColors(root.color, root.name);
          const isColorPickerActive = activeColorPickerRootId === root.id;

          return (
            <div
              key={root.id}
              className="bg-white dark:bg-[#28292c] rounded-[6px] border border-gray-200 dark:border-[#3c4043] p-4.5 shadow-xs space-y-3 transition-all"
            >
              {/* Root Label Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Color Dot Button */}
                  <div className="relative" ref={isColorPickerActive ? inlineColorRef : undefined}>
                    <button
                      type="button"
                      onClick={() =>
                        setActiveColorPickerRootId(isColorPickerActive ? null : root.id)
                      }
                      title="Change color"
                      className="w-6 h-6 rounded-full flex items-center justify-center hover:scale-110 transition-transform cursor-pointer"
                    >
                      <span
                        className="w-4 h-4 rounded-full shadow-xs flex-shrink-0"
                        style={{ backgroundColor: rootDotColors.parent }}
                      />
                    </button>

                    {isColorPickerActive && (
                      <div className="absolute top-full left-0 mt-2 p-3.5 w-60 bg-white dark:bg-[#28292c] rounded-[6px] shadow-keep-modal border border-gray-200 dark:border-[#3c4043] z-50 animate-scale-in">
                        <span className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-2">
                          Change Color for "{root.name}"
                        </span>
                        <LabelColorPicker
                          selectedColor={root.color || 'blue'}
                          onSelectColor={(colorId) => handleQuickChangeRootColor(root, colorId)}
                          showPreview={true}
                        />
                      </div>
                    )}
                  </div>

                  <span className="font-bold text-sm text-gray-900 dark:text-gray-100">
                    {root.name}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-[6px] bg-gray-100 dark:bg-[#1a1b1e] text-gray-500 dark:text-gray-400 font-medium">
                    {root.note_count || 0} notes
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setActiveColorPickerRootId(isColorPickerActive ? null : root.id)
                    }
                    title="Change color"
                    className="w-8 h-8 rounded-[6px] text-gray-400 hover:text-amber-500 hover:bg-gray-100 dark:hover:bg-[#3c4043] transition-colors flex items-center justify-center cursor-pointer"
                  >
                    <Palette className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAddingSubForRootId(addingSubForRootId === root.id ? null : root.id);
                      setNewSubName('');
                    }}
                    title="Add sub-label"
                    className="h-8 px-2.5 rounded-[6px] text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    <span>Sub-label</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingTag(root);
                      setEditName(root.name);
                      setEditParentId(null);
                      setEditColor(root.color || 'blue');
                    }}
                    title="Edit label"
                    className="w-8 h-8 rounded-[6px] text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#3c4043] transition-colors flex items-center justify-center cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteTag(root)}
                    title="Delete label"
                    className="w-8 h-8 rounded-[6px] text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors flex items-center justify-center cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Inline Add Sub-Label Form */}
              {addingSubForRootId === root.id && (
                <div className="flex items-center gap-2 pl-6 pt-1 animate-fade-in">
                  <CornerDownRight className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <input
                    type="text"
                    autoFocus
                    placeholder={`New sub-label under ${root.name}...`}
                    value={newSubName}
                    onChange={(e) => setNewSubName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateSub(root.id);
                      if (e.key === 'Escape') setAddingSubForRootId(null);
                    }}
                    className="flex-1 h-9 px-3 bg-gray-50 dark:bg-[#1a1b1e] border border-blue-400 dark:border-blue-500 rounded-[6px] text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleCreateSub(root.id)}
                    className="h-9 px-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-[6px] text-xs font-semibold shadow-xs transition-all cursor-pointer"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddingSubForRootId(null)}
                    className="w-9 h-9 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-[6px] hover:bg-gray-100 dark:hover:bg-[#3c4043] flex items-center justify-center cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Sub-Labels List (Level 2) */}
              {root.children && root.children.length > 0 && (
                <div className="pl-6 space-y-1.5 border-l-2 border-gray-100 dark:border-[#3c4043] ml-2">
                  {root.children.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between p-2.5 rounded-[6px] bg-gray-50/80 dark:bg-[#202124] hover:bg-gray-100 dark:hover:bg-[#2c2d30] text-xs transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: rootDotColors.child }}
                        />
                        <span className="font-semibold text-gray-800 dark:text-gray-200">
                          {sub.name}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          ({sub.note_count || 0} notes)
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTag(sub);
                            setEditName(sub.name);
                            setEditParentId(sub.parent_id || null);
                            setEditColor(sub.color || 'blue');
                          }}
                          className="w-7 h-7 rounded-[6px] text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-[#3c4043] transition-colors flex items-center justify-center cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTag(sub)}
                          className="w-7 h-7 rounded-[6px] text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors flex items-center justify-center cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {tagTree.length === 0 && (
          <div className="p-10 text-center border-2 border-dashed border-gray-200 dark:border-[#3c4043] rounded-[6px]">
            <TagIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-xs text-gray-400 font-medium">No labels created yet. Add your first label above.</p>
          </div>
        )}
      </div>

      {/* Edit Tag Modal */}
      {editingTag && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className="w-full max-w-sm bg-white dark:bg-[#28292c] rounded-[6px] shadow-keep-modal border border-gray-200 dark:border-[#3c4043] overflow-hidden animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4.5 border-b border-gray-100 dark:border-[#3c4043] flex items-center justify-between">
              <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-amber-500" />
                Edit Label
              </h3>
              <button
                type="button"
                onClick={() => setEditingTag(null)}
                className="p-1.5 rounded-[6px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#3c4043] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateTag} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Label Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full h-10 px-3.5 bg-gray-50 dark:bg-[#1a1b1e] border border-gray-200 dark:border-[#3c4043] rounded-[6px] text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Parent Category
                </label>
                <select
                  value={editParentId || ''}
                  onChange={(e) => setEditParentId(e.target.value ? e.target.value : null)}
                  className="w-full h-10 px-3.5 bg-gray-50 dark:bg-[#1a1b1e] border border-gray-200 dark:border-[#3c4043] rounded-[6px] text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all cursor-pointer"
                >
                  <option value="">None (Top-Level Root Label)</option>
                  {tagTree
                    .filter((r) => r.id !== editingTag.id)
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                </select>
              </div>

              {!editParentId && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Label Color
                  </label>
                  <LabelColorPicker
                    selectedColor={editColor}
                    onSelectColor={(c) => setEditColor(c)}
                    showPreview={true}
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-[#3c4043]">
                <button
                  type="button"
                  onClick={() => setEditingTag(null)}
                  className="h-9 px-4 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#3c4043] rounded-[6px] text-xs font-semibold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-9 px-4 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white rounded-[6px] text-xs font-semibold shadow-xs transition-all cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LabelSettings;

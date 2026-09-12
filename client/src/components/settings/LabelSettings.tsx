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
  Check,
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
  const [isCreatingRoot, setIsCreatingRoot] = useState(false);

  // Sub-label creation state
  const [addingSubForRootId, setAddingSubForRootId] = useState<string | null>(null);
  const [newSubName, setNewSubName] = useState('');

  // Inline color picker popover state for existing parent labels
  const [activeColorPickerRootId, setActiveColorPickerRootId] = useState<string | null>(null);

  // Inline Editing label state (replaces modal-in-modal anti-pattern)
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editParentId, setEditParentId] = useState<string | null>(null);
  const [editColor, setEditColor] = useState('blue');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

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
      setIsCreatingRoot(true);
      await api.createTag(newRootName.trim(), null, newRootColor);
      setNewRootName('');
      setNewRootColor(getAutoPickedColor(tagTree.length + 1));
      setIsNewColorPickerOpen(false);
      loadTags();
      showToast('Root label created');
    } catch (err: any) {
      showToast(err.message || 'Failed to create label');
    } finally {
      setIsCreatingRoot(false);
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

  const startEditing = (tag: Tag) => {
    setEditingTagId(tag.id);
    setEditName(tag.name);
    setEditParentId(tag.parent_id || null);
    setEditColor(tag.color || 'blue');
    setAddingSubForRootId(null);
  };

  const cancelEditing = () => {
    setEditingTagId(null);
    setEditName('');
    setEditParentId(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTagId || !editName.trim()) return;

    try {
      setIsSavingEdit(true);
      await api.updateTag(editingTagId, editName.trim(), editParentId, editColor);
      setEditingTagId(null);
      loadTags();
      showToast('Label updated');
    } catch (err: any) {
      showToast(err.message || 'Failed to update label');
    } finally {
      setIsSavingEdit(false);
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
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="pb-4 border-b border-gray-100 dark:border-[#3c4043]">
        <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <TagIcon className="w-4.5 h-4.5 text-amber-500" />
          Labels & Taxonomy
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Organize your notes into root categories and nested sub-labels with automatic color tint inheritance.
        </p>
      </div>

      {/* Quick Add Root Label Bar */}
      <div className="p-4 rounded-xl border border-gray-200/80 dark:border-[#3c4043] bg-white dark:bg-[#252629] shadow-xs">
        <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2.5">
          Add New Root Category
        </div>
        <form onSubmit={handleCreateRoot} className="flex items-center gap-2.5 relative">
          <div className="relative" ref={newColorRef}>
            <button
              type="button"
              onClick={() => setIsNewColorPickerOpen(!isNewColorPickerOpen)}
              title="Pick label color"
              className="h-9 px-2.5 bg-gray-50 dark:bg-[#1f2023] border border-gray-200 dark:border-[#3c4043] rounded-lg hover:bg-gray-100 dark:hover:bg-[#2a2b2f] transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span
                className="w-3.5 h-3.5 rounded-full shadow-xs flex-shrink-0"
                style={{ backgroundColor: getLabelDotColors(newRootColor).parent }}
              />
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </button>

            {isNewColorPickerOpen && (
              <div className="absolute top-full left-0 mt-2 p-3.5 w-60 bg-white dark:bg-[#28292c] rounded-xl shadow-xl border border-gray-200 dark:border-[#3c4043] z-50 animate-scale-in">
                <span className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Select Category Color
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
            placeholder="e.g. Work, Personal, Research, Travel..."
            value={newRootName}
            onChange={(e) => setNewRootName(e.target.value)}
            className="flex-1 h-9 px-3 bg-gray-50/70 dark:bg-[#1f2023] border border-gray-200 dark:border-[#3c4043] rounded-lg text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
          />

          <button
            type="submit"
            disabled={isCreatingRoot || !newRootName.trim()}
            className="h-9 px-4 bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white rounded-lg text-xs font-medium shadow-xs transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isCreatingRoot ? 'Adding...' : 'Add Category'}</span>
          </button>
        </form>
      </div>

      {/* Hierarchical Label Tree */}
      <div className="space-y-3">
        {tagTree.map((root) => {
          const rootDotColors = getLabelDotColors(root.color, root.name);
          const isColorPickerActive = activeColorPickerRootId === root.id;
          const isEditingThisRoot = editingTagId === root.id;

          return (
            <div
              key={root.id}
              className="bg-white dark:bg-[#252629] rounded-xl border border-gray-200/80 dark:border-[#3c4043] p-4 shadow-xs space-y-3 transition-all"
            >
              {/* Root Label Row or Inline Edit Form */}
              {isEditingThisRoot ? (
                <form onSubmit={handleSaveEdit} className="p-3 bg-amber-50/40 dark:bg-amber-950/20 rounded-lg border border-amber-300 dark:border-amber-800/80 space-y-3 animate-fade-in text-xs">
                  <div className="font-bold text-xs text-gray-900 dark:text-gray-100">
                    Edit Category: {root.name}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Name
                      </label>
                      <input
                        type="text"
                        required
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full h-8.5 px-2.5 rounded-lg bg-white dark:bg-[#1f2023] border border-gray-200 dark:border-[#3c4043] text-xs focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Color
                      </label>
                      <LabelColorPicker
                        selectedColor={editColor}
                        onSelectColor={(c) => setEditColor(c)}
                        showPreview={false}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-amber-200/60 dark:border-amber-900/60">
                    <button
                      type="button"
                      onClick={cancelEditing}
                      className="h-7 px-2.5 rounded-lg border border-gray-200 dark:border-[#3c4043] bg-white dark:bg-[#252629] text-gray-700 dark:text-gray-300 text-xs font-medium cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingEdit}
                      className="h-7 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-medium cursor-pointer"
                    >
                      {isSavingEdit ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </form>
              ) : (
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
                          className="w-3.5 h-3.5 rounded-full shadow-xs flex-shrink-0"
                          style={{ backgroundColor: rootDotColors.parent }}
                        />
                      </button>

                      {isColorPickerActive && (
                        <div className="absolute top-full left-0 mt-2 p-3.5 w-60 bg-white dark:bg-[#28292c] rounded-xl shadow-xl border border-gray-200 dark:border-[#3c4043] z-50 animate-scale-in">
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

                    <span className="font-semibold text-xs text-gray-900 dark:text-gray-100">
                      {root.name}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#1f2023] text-gray-500 dark:text-gray-400 font-medium">
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
                      className="w-7 h-7 rounded-lg text-gray-400 hover:text-amber-500 hover:bg-gray-100 dark:hover:bg-[#3c4043] transition-colors flex items-center justify-center cursor-pointer"
                    >
                      <Palette className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setAddingSubForRootId(addingSubForRootId === root.id ? null : root.id);
                        setNewSubName('');
                      }}
                      title="Add sub-label"
                      className="h-7 px-2 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <FolderPlus className="w-3 h-3" />
                      <span>Sub-label</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => startEditing(root)}
                      title="Edit label"
                      className="w-7 h-7 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#3c4043] transition-colors flex items-center justify-center cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteTag(root)}
                      title="Delete label"
                      className="w-7 h-7 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors flex items-center justify-center cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}

              {/* Inline Add Sub-Label Form */}
              {addingSubForRootId === root.id && (
                <div className="flex items-center gap-2 pl-6 pt-1 animate-fade-in">
                  <CornerDownRight className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
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
                    className="flex-1 h-8 px-2.5 bg-gray-50/70 dark:bg-[#1f2023] border border-blue-400 dark:border-blue-500 rounded-lg text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleCreateSub(root.id)}
                    className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium shadow-xs transition-all cursor-pointer"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddingSubForRootId(null)}
                    className="w-8 h-8 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3c4043] flex items-center justify-center cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Sub-Labels List (Level 2) */}
              {root.children && root.children.length > 0 && (
                <div className="pl-6 space-y-1.5 border-l border-gray-100 dark:border-[#3c4043] ml-2">
                  {root.children.map((sub) => {
                    const isEditingThisSub = editingTagId === sub.id;

                    if (isEditingThisSub) {
                      return (
                        <form
                          key={sub.id}
                          onSubmit={handleSaveEdit}
                          className="flex items-center gap-2 p-2 bg-blue-50/50 dark:bg-blue-950/30 rounded-lg border border-blue-300 dark:border-blue-800 animate-fade-in"
                        >
                          <input
                            type="text"
                            required
                            autoFocus
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="flex-1 h-7.5 px-2.5 rounded-md bg-white dark:bg-[#1f2023] border border-gray-200 dark:border-[#3c4043] text-xs"
                          />
                          <button
                            type="submit"
                            className="h-7.5 px-2.5 bg-blue-600 text-white rounded-md text-xs font-medium cursor-pointer"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditing}
                            className="h-7.5 px-2 text-gray-400 hover:text-gray-600 rounded-md cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </form>
                      );
                    }

                    return (
                      <div
                        key={sub.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-gray-50/60 dark:bg-[#1f2023] hover:bg-gray-100/70 dark:hover:bg-[#2c2d30] text-xs transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: rootDotColors.child }}
                          />
                          <span className="font-medium text-gray-800 dark:text-gray-200 text-xs">
                            {sub.name}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            ({sub.note_count || 0})
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => startEditing(sub)}
                            className="w-6 h-6 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-[#3c4043] transition-colors flex items-center justify-center cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTag(sub)}
                            className="w-6 h-6 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors flex items-center justify-center cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {tagTree.length === 0 && (
          <div className="p-10 text-center border-2 border-dashed border-gray-200 dark:border-[#3c4043] rounded-xl">
            <TagIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-xs text-gray-400 font-medium">No labels created yet. Add your first category above.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LabelSettings;

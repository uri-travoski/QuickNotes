import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  X,
  SlidersHorizontal,
  Calendar,
  Tag as TagIcon,
  Image as ImageIcon,
  FileText,
  CheckSquare,
  RotateCcw,
  ChevronDown,
  Check,
} from 'lucide-react';
import { useNotes } from '../context/NotesContext';
import { NOTE_COLORS } from './ColorPicker';
import { format, subDays, startOfMonth, endOfDay, startOfDay } from 'date-fns';

export const CenterSearchFilter: React.FC = () => {
  const {
    searchQuery,
    setSearchQuery,
    selectedTagIds,
    setSelectedTagIds,
    tagMatch,
    setTagMatch,
    selectedColor,
    setSelectedColor,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    dateField,
    setDateField,
    typeFilters,
    setTypeFilters,
    tagTree,
    tags,
  } = useNotes();

  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsFilterPanelOpen(false);
        setIsTagDropdownOpen(false);
        setIsDateDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeFiltersCount =
    (selectedColor !== 'all' ? 1 : 0) +
    selectedTagIds.length +
    (dateFrom || dateTo ? 1 : 0) +
    (typeFilters.has_images ? 1 : 0) +
    (typeFilters.has_files ? 1 : 0) +
    (typeFilters.has_checklist ? 1 : 0);

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedTagIds([]);
    setSelectedColor('all');
    setDateFrom('');
    setDateTo('');
    setTypeFilters({
      has_images: false,
      has_files: false,
      has_checklist: false,
    });
  };

  const handleDatePreset = (preset: 'today' | '7days' | '30days' | 'this_month' | 'clear') => {
    const now = new Date();
    if (preset === 'today') {
      setDateFrom(format(startOfDay(now), 'yyyy-MM-dd'));
      setDateTo(format(endOfDay(now), 'yyyy-MM-dd'));
    } else if (preset === '7days') {
      setDateFrom(format(subDays(now, 7), 'yyyy-MM-dd'));
      setDateTo(format(now, 'yyyy-MM-dd'));
    } else if (preset === '30days') {
      setDateFrom(format(subDays(now, 30), 'yyyy-MM-dd'));
      setDateTo(format(now, 'yyyy-MM-dd'));
    } else if (preset === 'this_month') {
      setDateFrom(format(startOfMonth(now), 'yyyy-MM-dd'));
      setDateTo(format(now, 'yyyy-MM-dd'));
    } else {
      setDateFrom('');
      setDateTo('');
    }
    setIsDateDropdownOpen(false);
  };

  const toggleTagSelection = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  return (
    <div className="w-full max-w-2xl relative" ref={panelRef}>
      {/* Topbar Search Bar (Max Width 650px, 50% reduced radius) */}
      <div className="relative bg-[#f1f3f4] dark:bg-[#2d2f31] hover:bg-gray-200/60 dark:hover:bg-[#3c4043] focus-within:bg-white dark:focus-within:bg-[#202124] rounded-lg border border-gray-200/60 dark:border-transparent focus-within:border-gray-300 dark:focus-within:border-[#5f6368] shadow-xs focus-within:shadow-keep transition-all">
        <div className="flex items-center px-3.5 gap-2.5" style={{ paddingTop: '.35rem', paddingBottom: '.35rem' }}>
          <Search className="w-4.5 h-4.5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-gray-800 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none min-w-0"
          />

          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="p-1 rounded-md hover:bg-gray-200/60 dark:hover:bg-[#3c4043] text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Toggle Filter Panel */}
          <button
            type="button"
            onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all flex-shrink-0 ${
              isFilterPanelOpen || activeFiltersCount > 0
                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800'
                : 'bg-white/80 dark:bg-[#3c4043] text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-[#4a4d51] border border-gray-200/60 dark:border-transparent shadow-xs'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filters</span>
            {activeFiltersCount > 0 && (
              <span className="w-4 h-4 rounded-md bg-amber-500 text-white text-[10px] flex items-center justify-center font-bold">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        {/* Floating Dropdown Filter Panel (Wide, scrollbar-free on desktop & tablet; responsive on mobile) */}
        {isFilterPanelOpen && (
          <div className="fixed inset-x-2 top-16 sm:absolute sm:top-full sm:left-1/2 sm:-translate-x-1/2 sm:inset-x-auto mt-2 w-[calc(100vw-1rem)] sm:w-[680px] md:w-[760px] bg-white dark:bg-[#2d2e30] border border-gray-200 dark:border-[#5f6368] rounded-2xl shadow-keep-modal p-4 sm:p-5 space-y-4 text-xs z-50 animate-scale-in max-h-[85vh] sm:max-h-none overflow-y-auto sm:overflow-visible">
            {/* Row 1: Multi-Label Selection & Date Range */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Multi-Label Dropdown */}
              <div className="relative">
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <TagIcon className="w-3.5 h-3.5 text-blue-500" />
                    Multi-Label Filter
                  </span>
                  {selectedTagIds.length > 0 && (
                    <div className="flex items-center gap-1 text-[11px] font-normal">
                      <span className="text-gray-400">Match:</span>
                      <button
                        type="button"
                        onClick={() => setTagMatch(tagMatch === 'and' ? 'or' : 'and')}
                        className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold uppercase"
                      >
                        {tagMatch}
                      </button>
                    </div>
                  )}
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setIsTagDropdownOpen(!isTagDropdownOpen);
                    setIsDateDropdownOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-[#2d2f31] border border-gray-200 dark:border-[#5f6368] rounded-xl text-left font-medium"
                >
                  <span className="truncate">
                    {selectedTagIds.length === 0
                      ? 'All Labels (Select multiple)'
                      : `${selectedTagIds.length} label(s) selected`}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>

                {/* 2-Step Nested Labels Dropdown Menu */}
                {isTagDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 w-full max-h-60 overflow-y-auto bg-white dark:bg-[#2d2e30] border border-gray-200 dark:border-[#5f6368] rounded-xl shadow-keep-modal z-50 p-2 space-y-1 animate-scale-in">
                    {tagTree.map((root) => {
                      const isRootSelected = selectedTagIds.includes(root.id);
                      const hasChildren = root.children && root.children.length > 0;

                      return (
                        <div key={root.id} className="space-y-0.5">
                          {/* Root Label */}
                          <div
                            onClick={() => toggleTagSelection(root.id)}
                            className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3c4043] cursor-pointer font-semibold text-gray-800 dark:text-gray-200"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <div
                                className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                                  isRootSelected
                                    ? 'bg-blue-600 border-blue-600 text-white'
                                    : 'border-gray-300 dark:border-gray-600'
                                }`}
                              >
                                {isRootSelected && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                              <span className="truncate">{root.name}</span>
                            </div>
                            {typeof root.note_count === 'number' && (
                              <span className="text-[10px] text-gray-400 font-normal">
                                {root.note_count}
                              </span>
                            )}
                          </div>

                          {/* Sub-labels (Level 2) */}
                          {hasChildren && (
                            <div className="pl-6 space-y-0.5 border-l-2 border-gray-100 dark:border-[#3c4043] ml-3">
                              {root.children!.map((sub) => {
                                const isSubSelected = selectedTagIds.includes(sub.id);
                                return (
                                  <div
                                    key={sub.id}
                                    onClick={() => toggleTagSelection(sub.id)}
                                    className="flex items-center justify-between px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3c4043] cursor-pointer text-gray-600 dark:text-gray-300"
                                  >
                                    <div className="flex items-center gap-2 truncate">
                                      <div
                                        className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-colors ${
                                          isSubSelected
                                            ? 'bg-blue-600 border-blue-600 text-white'
                                            : 'border-gray-300 dark:border-gray-600'
                                        }`}
                                      >
                                        {isSubSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                      </div>
                                      <span className="truncate">{sub.name}</span>
                                    </div>
                                    {typeof sub.note_count === 'number' && (
                                      <span className="text-[10px] text-gray-400 font-normal">
                                        {sub.note_count}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {tags.length === 0 && (
                      <div className="p-3 text-center text-gray-400 italic">No labels created yet.</div>
                    )}
                  </div>
                )}
              </div>

              {/* Date Range Dropdown */}
              <div className="relative">
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-500" />
                    Date Filter
                  </span>
                  <select
                    value={dateField}
                    onChange={(e) => setDateField(e.target.value as any)}
                    className="bg-transparent text-[11px] text-gray-500 dark:text-gray-400 focus:outline-none cursor-pointer"
                  >
                    <option value="created_at">Created date</option>
                    <option value="updated_at">Updated date</option>
                  </select>
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setIsDateDropdownOpen(!isDateDropdownOpen);
                    setIsTagDropdownOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-[#2d2f31] border border-gray-200 dark:border-[#5f6368] rounded-xl text-left font-medium"
                >
                  <span className="truncate">
                    {dateFrom || dateTo
                      ? `${dateFrom || 'Any'} → ${dateTo || 'Any'}`
                      : 'All Dates (Click to filter)'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>

                {/* Date Dropdown */}
                {isDateDropdownOpen && (
                  <div className="absolute top-full right-0 mt-1 w-72 bg-white dark:bg-[#2d2e30] border border-gray-200 dark:border-[#5f6368] rounded-xl shadow-keep-modal z-50 p-3 space-y-3 animate-scale-in">
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleDatePreset('today')}
                        className="px-2 py-1.5 rounded-lg bg-gray-100 dark:bg-[#3c4043] hover:bg-gray-200 text-center font-medium"
                      >
                        Today
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDatePreset('7days')}
                        className="px-2 py-1.5 rounded-lg bg-gray-100 dark:bg-[#3c4043] hover:bg-gray-200 text-center font-medium"
                      >
                        Last 7 Days
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDatePreset('30days')}
                        className="px-2 py-1.5 rounded-lg bg-gray-100 dark:bg-[#3c4043] hover:bg-gray-200 text-center font-medium"
                      >
                        Last 30 Days
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDatePreset('this_month')}
                        className="px-2 py-1.5 rounded-lg bg-gray-100 dark:bg-[#3c4043] hover:bg-gray-200 text-center font-medium"
                      >
                        This Month
                      </button>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-[#3c4043]">
                      <div>
                        <span className="text-[11px] text-gray-400">From Date:</span>
                        <input
                          type="date"
                          value={dateFrom}
                          onChange={(e) => setDateFrom(e.target.value)}
                          className="w-full mt-0.5 px-2 py-1 bg-gray-50 dark:bg-[#202124] border border-gray-200 dark:border-[#5f6368] rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <span className="text-[11px] text-gray-400">To Date:</span>
                        <input
                          type="date"
                          value={dateTo}
                          onChange={(e) => setDateTo(e.target.value)}
                          className="w-full mt-0.5 px-2 py-1 bg-gray-50 dark:bg-[#202124] border border-gray-200 dark:border-[#5f6368] rounded-lg text-xs"
                        />
                      </div>
                    </div>

                    {(dateFrom || dateTo) && (
                      <button
                        type="button"
                        onClick={() => handleDatePreset('clear')}
                        className="w-full py-1 text-center text-red-500 hover:underline text-[11px]"
                      >
                        Clear date filter
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Row 2: Type Filters & Color Swatches */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100 dark:border-[#3c4043]">
              {/* Type Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setTypeFilters((p) => ({ ...p, has_images: !p.has_images }))}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-colors ${
                    typeFilters.has_images
                      ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-400 text-blue-700 dark:text-blue-300 font-semibold'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-[#3c4043]'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
                  <span>Images</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTypeFilters((p) => ({ ...p, has_files: !p.has_files }))}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-colors ${
                    typeFilters.has_files
                      ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-400 text-blue-700 dark:text-blue-300 font-semibold'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-[#3c4043]'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Files</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTypeFilters((p) => ({ ...p, has_checklist: !p.has_checklist }))}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-colors ${
                    typeFilters.has_checklist
                      ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-400 text-blue-700 dark:text-blue-300 font-semibold'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-[#3c4043]'
                  }`}
                >
                  <CheckSquare className="w-3.5 h-3.5 text-purple-500" />
                  <span>Checklists</span>
                </button>
              </div>

              {/* Color Swatches */}
              <div className="flex items-center gap-1 overflow-x-auto py-1">
                <button
                  type="button"
                  onClick={() => setSelectedColor('all')}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border transition-colors ${
                    selectedColor === 'all'
                      ? 'bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900 border-transparent'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-[#3c4043]'
                  }`}
                >
                  All Colors
                </button>
                {NOTE_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    title={c.name}
                    onClick={() => setSelectedColor(selectedColor === c.id ? 'all' : c.id)}
                    style={c.id !== 'default' ? { backgroundColor: c.lightBg } : undefined}
                    className={`w-5 h-5 rounded-full border transition-all flex items-center justify-center ${
                      c.id === 'default' ? 'bg-white dark:bg-[#202124] border-gray-300' : 'border-black/10'
                    } ${selectedColor === c.id ? 'ring-2 ring-amber-500 scale-110' : 'hover:scale-105'}`}
                  >
                    {selectedColor === c.id && (
                      <Check className="w-2.5 h-2.5 text-gray-800 dark:text-gray-200 stroke-[3]" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Filters Chips */}
            {activeFiltersCount > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-[#3c4043]">
                <div className="flex flex-wrap items-center gap-1.5">
                  {selectedTagIds.map((tagId) => {
                    const tag = tags.find((t) => t.id === tagId);
                    if (!tag) return null;
                    return (
                      <span
                        key={tagId}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-medium text-[11px]"
                      >
                        <TagIcon className="w-2.5 h-2.5" />
                        {tag.parent_name ? `${tag.parent_name} / ${tag.name}` : tag.name}
                        <button type="button" onClick={() => toggleTagSelection(tagId)} className="hover:text-red-500">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}

                  {(dateFrom || dateTo) && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-medium text-[11px]">
                      <Calendar className="w-2.5 h-2.5" />
                      {dateFrom || 'Any'} → {dateTo || 'Any'}
                      <button type="button" onClick={() => handleDatePreset('clear')} className="hover:text-red-500">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="flex items-center gap-1 text-red-500 hover:text-red-600 font-semibold"
                >
                  <RotateCcw className="w-3 h-3" /> Reset all filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

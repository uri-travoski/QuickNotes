import React, { useState, useRef, useEffect } from 'react';
import {
  Star,
  Archive,
  Trash2,
  Settings as SettingsIcon,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useNotes } from '../context/NotesContext';
import { ViewMode, NoteCounts } from '../types';
import { SquareTextIcon } from './icons';
import { getLabelDotColors } from '../utils/labelColors';

export const Sidebar: React.FC = () => {
  const {
    activeView,
    setActiveView,
    setActiveSettingsTab,
    setIsSettingsModalOpen,
    selectedTag,
    setSelectedTag,
    tagTree,
    isSidebarOpen,
    setIsSidebarOpen,
    noteCounts,
  } = useNotes();

  const sidebarRef = useRef<HTMLElement>(null);

  const [expandedRootIds, setExpandedRootIds] = useState<Record<string, boolean>>({
    all: true,
  });

  // Touch / Click outside to hide sidebar on mobile/tablet screens
  useEffect(() => {
    const handleOutsideTouch = (e: MouseEvent | TouchEvent) => {
      if (typeof window !== 'undefined' && window.innerWidth < 1024) {
        if (isSidebarOpen && sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
          const toggleBtn = document.getElementById('sidebar-toggle-btn');
          if (toggleBtn && toggleBtn.contains(e.target as Node)) {
            return;
          }
          setIsSidebarOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleOutsideTouch);
    document.addEventListener('touchstart', handleOutsideTouch, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleOutsideTouch);
      document.removeEventListener('touchstart', handleOutsideTouch);
    };
  }, [isSidebarOpen, setIsSidebarOpen]);

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedRootIds((prev) => ({
      ...prev,
      [id]: prev[id] === undefined ? false : !prev[id],
    }));
  };

  const navItems: Array<{
    id: ViewMode;
    label: string;
    icon: React.ReactNode;
    countKey: keyof NoteCounts;
  }> = [
    { id: 'notes', label: 'All Notes', icon: <SquareTextIcon className="w-5 h-5" />, countKey: 'notes' },
    { id: 'starred', label: 'Starred', icon: <Star className="w-5 h-5" />, countKey: 'starred' },
    { id: 'archive', label: 'Archived', icon: <Archive className="w-5 h-5" />, countKey: 'archive' },
    { id: 'trash', label: 'Trash', icon: <Trash2 className="w-5 h-5" />, countKey: 'trash' },
  ];

  const handleNavClick = (view: ViewMode) => {
    setActiveView(view);
    setSelectedTag(null);
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  const handleTagClick = (tagId: string) => {
    if (activeView === 'settings') {
      setActiveView('notes');
    }
    if (selectedTag === tagId) {
      setSelectedTag(null);
    } else {
      setSelectedTag(tagId);
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  const handleOpenLabelSettings = () => {
    setActiveSettingsTab('labels');
    setIsSettingsModalOpen(true);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  return (
    <>
      {/* Mobile / Tablet Backdrop Overlay */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          onTouchStart={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-30 lg:hidden bg-black/40 dark:bg-black/60 backdrop-blur-xs transition-opacity"
          aria-hidden="true"
        />
      )}

      <aside
        ref={sidebarRef}
        className={`fixed left-0 top-16 bottom-0 z-40 bg-white dark:bg-[#202124] transition-all duration-200 ease-in-out overflow-y-auto border-r border-gray-100 dark:border-[#3c4043] ${
          isSidebarOpen
            ? 'translate-x-0 w-64 px-3 shadow-xl lg:shadow-none'
            : '-translate-x-full lg:translate-x-0 lg:w-16 px-2'
        }`}
      >
        <div className="py-2 space-y-1">
          {/* Main Navigation Views with Note Counters */}
          {navItems.map((item) => {
            const isActive = activeView === item.id && !selectedTag;
            const count = noteCounts[item.countKey];
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors group cursor-pointer ${
                  isActive
                    ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#282a2d]'
                }`}
              >
                <div className="flex items-center gap-3.5 truncate">
                  <span
                    className={`flex-shrink-0 ${
                      isActive ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500'
                    }`}
                  >
                    {item.icon}
                  </span>
                  {isSidebarOpen && <span className="truncate">{item.label}</span>}
                </div>

                {/* Note Counter Badge */}
                {isSidebarOpen && typeof count === 'number' && (
                  <span
                    className={`text-[11px] font-medium px-2 py-0.5 rounded-full transition-colors flex-shrink-0 ${
                      isActive
                        ? 'bg-amber-200/80 dark:bg-amber-900/80 text-amber-950 dark:text-amber-100 font-bold'
                        : 'bg-gray-100 dark:bg-[#3c4043] text-gray-500 dark:text-gray-400 group-hover:bg-gray-200 dark:group-hover:bg-[#4a4d51]'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}

          {/* Labels Section Header with Gear Icon */}
          <div className="pt-3 border-t border-gray-100 dark:border-[#3c4043] my-2">
            {isSidebarOpen && (
              <div className="flex items-center justify-between px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                <span>LABELS</span>
                <button
                  type="button"
                  onClick={handleOpenLabelSettings}
                  title="Manage labels"
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#3c4043] rounded-md transition-colors cursor-pointer"
                >
                  <SettingsIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Hierarchical Label Tree with Colored Parent Dots and Lighter Nested Dots */}
            <div className="space-y-0.5 mt-1 ml-3" style={{ marginLeft: ".75rem" }}>
              {tagTree.map((root) => {
                const isRootActive = selectedTag === root.id;
                const hasChildren = root.children && root.children.length > 0;
                const isExpanded = expandedRootIds[root.id] ?? true;
                const dotColors = getLabelDotColors(root.color, root.name);

                return (
                  <div key={root.id} className="space-y-0.5">
                    {/* Root Label Item - Starts aligned directly with LABELS header */}
                    <div
                      onClick={() => handleTagClick(root.id)}
                      className={`sidebar-label-item w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors group ${
                        isRootActive
                          ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 font-semibold'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#282a2d]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        {/* Parent Solid Colored Dot aligned with LABELS */}
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0 transition-transform group-hover:scale-110 shadow-xs"
                          style={{ backgroundColor: dotColors.parent }}
                        />

                        {isSidebarOpen && (
                          <span className="truncate font-medium text-[13px]">{root.name}</span>
                        )}
                      </div>

                      {/* Right side: Count badge and Chevron for expandable items */}
                      {isSidebarOpen && (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {typeof root.note_count === 'number' && root.note_count > 0 && (
                            <span
                              className={`text-[11px] font-medium px-2 py-0.5 rounded-md transition-colors ${
                                isRootActive
                                  ? 'bg-amber-200/80 dark:bg-amber-900/80 text-amber-950 dark:text-amber-100 font-bold'
                                  : 'bg-gray-100/90 dark:bg-[#3c4043]/80 text-gray-500 dark:text-gray-400 group-hover:bg-gray-200 dark:group-hover:bg-[#4a4d51]'
                              }`}
                            >
                              {root.note_count}
                            </span>
                          )}

                          {hasChildren && (
                            <button
                              type="button"
                              onClick={(e) => toggleExpand(root.id, e)}
                              className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Nested / Sub-Labels (Indented under parent text, same color but lighter) */}
                    {isSidebarOpen && hasChildren && isExpanded && (
                      <div className="space-y-0.5" style={{ marginLeft: '1.2rem' }}>
                        {root.children!.map((sub) => {
                          const isSubActive = selectedTag === sub.id;
                          return (
                            <div
                              key={sub.id}
                              onClick={() => handleTagClick(sub.id)}
                              className={`sidebar-label-item w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-colors group ${
                                isSubActive
                                  ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 font-semibold'
                                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#282a2d]'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 truncate">
                                {/* Sub-label Dot: Same color hue, but lighter tint */}
                                <span
                                  className="w-2 h-2 rounded-full flex-shrink-0 transition-transform group-hover:scale-110"
                                  style={{ backgroundColor: dotColors.child }}
                                />
                                <span className="truncate text-[13px]">{sub.name}</span>
                              </div>

                              {typeof sub.note_count === 'number' && sub.note_count > 0 && (
                                <span
                                  className={`text-[11px] font-medium px-2 py-0.5 rounded-md transition-colors flex-shrink-0 ${
                                    isSubActive
                                      ? 'bg-amber-200/80 dark:bg-amber-900/80 text-amber-950 dark:text-amber-100 font-bold'
                                      : 'bg-gray-100/90 dark:bg-[#3c4043]/80 text-gray-500 dark:text-gray-400 group-hover:bg-gray-200 dark:group-hover:bg-[#4a4d51]'
                                  }`}
                                >
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
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

import React, { useMemo, useState, useEffect } from 'react';
import { useNotes } from './context/NotesContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { NoteCreator } from './components/NoteCreator';
import { NoteCard } from './components/NoteCard';
import { NoteModal } from './components/NoteModal';
import { AttachmentViewer } from './components/AttachmentViewer';
import { ToastContainer } from './components/Toast';
import { AuthModal } from './components/AuthModal';
import { ConfirmModal } from './components/ConfirmModal';
import { HelpModal } from './components/HelpModal';
import { SettingsLayout } from './components/settings/SettingsLayout';
import { SettingsModal } from './components/settings/SettingsModal';
import { LoginPage } from './components/LoginPage';
import { Trash2, Archive, Star } from 'lucide-react';
import { SquareTextIcon } from './components/icons';

const MainLayout: React.FC = () => {
  const {
    notes,
    loading,
    activeView,
    selectedTag,
    tags,
    isGridView,
    isSidebarOpen,
    emptyTrash,
    isOwner,
    openConfirmDialog,
  } = useNotes();

  const [visibleCount, setVisibleCount] = useState(32);

  // Instant scroll to top and reset visible count whenever view or label filter changes
  useEffect(() => {
    setVisibleCount(32);
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [activeView, selectedTag]);

  // Infinite progressive scroll loader for 500+ notes
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 700
      ) {
        setVisibleCount((prev) => (prev < notes.length ? Math.min(prev + 32, notes.length) : prev));
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [notes.length]);

  const visibleNotes = useMemo(() => {
    return notes.slice(0, visibleCount);
  }, [notes, visibleCount]);

  const handleEmptyTrash = () => {
    openConfirmDialog({
      title: 'Empty Trash',
      message: 'Are you sure you want to permanently delete all notes in Trash? This action cannot be undone.',
      confirmText: 'Empty Trash',
      isDestructive: true,
      onConfirm: emptyTrash,
    });
  };

  const activeTagObj = useMemo(() => {
    if (!selectedTag) return null;
    return tags.find((t) => t.id === selectedTag);
  }, [selectedTag, tags]);

  const viewTitles: Record<string, { title: string; icon: React.ReactNode }> = {
    notes: { title: 'All Notes', icon: <SquareTextIcon className="w-5 h-5 text-amber-500" /> },
    starred: { title: 'Starred', icon: <Star className="w-5 h-5 text-amber-500 fill-amber-400" /> },
    archive: { title: 'Archived', icon: <Archive className="w-5 h-5 text-gray-500" /> },
    trash: { title: 'Trash', icon: <Trash2 className="w-5 h-5 text-gray-500" /> },
    settings: { title: 'Settings', icon: null },
  };

  return (
    <div className="min-h-screen bg-[#f1f3f4] dark:bg-[#202124] text-gray-900 dark:text-gray-100 flex flex-col transition-colors">
      <Header />

      <div className="flex flex-1 pt-16">
        <Sidebar />

        {/* Main Content Area */}
        <main
          className={`flex-1 transition-all duration-200 ease-in-out p-4 md:p-6 overflow-x-hidden ml-0 ${
            isSidebarOpen ? 'lg:ml-64' : 'lg:ml-16'
          }`}
        >
          {/* Settings View */}
          {activeView === 'settings' ? (
            <SettingsLayout />
          ) : (
            <div className="max-w-6xl mx-auto space-y-6">
              {/* Tag / Category Filter Header */}
              {activeTagObj && (
                <div className="flex items-center gap-2 pb-2 text-sm font-semibold text-gray-600 dark:text-gray-300">
                  <span>Filtered by label:</span>
                  <span className="px-2.5 py-1 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 text-xs font-bold">
                    {activeTagObj.parent_name
                      ? `${activeTagObj.parent_name} / ${activeTagObj.name}`
                      : activeTagObj.name}
                  </span>
                </div>
              )}

              {/* Trash Banner */}
              {activeView === 'trash' && (
                <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <div className="text-red-800 dark:text-red-200 font-medium">
                    Notes in Trash are kept for safety. API users cannot delete or empty trash.
                  </div>
                  {isOwner && notes.length > 0 && (
                    <button
                      type="button"
                      onClick={handleEmptyTrash}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold shadow-sm transition-all cursor-pointer"
                    >
                      Empty Trash Now
                    </button>
                  )}
                </div>
              )}

              {/* Note Creator (Only in All Notes view) */}
              {activeView === 'notes' && !selectedTag && <NoteCreator />}

              {/* Loading State */}
              {loading && notes.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-gray-400 gap-3">
                  <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs">Loading notes...</span>
                </div>
              ) : notes.length === 0 ? (
                /* Empty State */
                <div className="py-24 flex flex-col items-center justify-center text-center text-gray-400 dark:text-gray-500 space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-gray-200/60 dark:bg-[#303134] flex items-center justify-center text-gray-400">
                    {viewTitles[activeView]?.icon || <SquareTextIcon className="w-8 h-8" />}
                  </div>
                  <div className="text-base font-semibold text-gray-600 dark:text-gray-300">
                    {activeView === 'starred'
                      ? 'No starred notes yet'
                      : activeView === 'archive'
                      ? 'Your archived notes appear here'
                      : activeView === 'trash'
                      ? 'No notes in Trash'
                      : 'No notes match your search or filter'}
                  </div>
                  <p className="text-xs max-w-sm">
                    {activeView === 'starred'
                      ? 'Click the star icon on any note to keep it easily accessible here.'
                      : activeView === 'notes'
                      ? 'Create a note above, attach multiple images, checklists, and 2-step nested labels.'
                      : ''}
                  </p>
                </div>
              ) : (
                /* Notes Display (Progressive Windowing for Instant 60fps Views) */
                <>
                  <div
                    className={
                      isGridView
                        ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start'
                        : 'max-w-2xl mx-auto space-y-3'
                    }
                  >
                    {visibleNotes.map((note) => (
                      <NoteCard key={note.id} note={note} />
                    ))}
                  </div>

                  {visibleCount < notes.length && (
                    <div className="py-6 flex justify-center text-xs text-gray-400">
                      <span>Showing {visibleNotes.length} of {notes.length} notes</span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Global Modals & Overlays */}
      <NoteModal />
      <SettingsModal />
      <HelpModal />
      <ConfirmModal />
      <AttachmentViewer />
      <AuthModal />
      <ToastContainer />
    </div>
  );
};

export function App() {
  const { currentUser, authLoading } = useNotes();

  // If initial auth check is in progress
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f1f3f4] dark:bg-[#202124] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  // If user is not authenticated, show dedicated Login Page
  if (!currentUser) {
    return (
      <>
        <LoginPage />
        <ToastContainer />
      </>
    );
  }

  return <MainLayout />;
}

export default App;

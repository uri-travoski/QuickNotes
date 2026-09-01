import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Note,
  Tag,
  Attachment,
  ViewMode,
  SettingsTab,
  NoteColor,
  FilterOptions,
  User,
  FontFamilyOption,
  FontSizeOption,
  NoteCounts,
  AppTheme,
} from '../types';
import * as api from '../api/client';

interface Toast {
  id: string;
  text: string;
  actionText?: string;
  onAction?: () => void;
}

interface NotesContextType {
  notes: Note[];
  tags: Tag[];
  tagTree: Tag[];
  loading: boolean;
  activeView: ViewMode;
  setActiveView: (view: ViewMode) => void;
  activeSettingsTab: SettingsTab;
  setActiveSettingsTab: (tab: SettingsTab) => void;

  // Filters
  selectedTag: string | null;
  setSelectedTag: (tag: string | null) => void;
  selectedTagIds: string[];
  setSelectedTagIds: React.Dispatch<React.SetStateAction<string[]>>;
  tagMatch: 'and' | 'or';
  setTagMatch: (match: 'and' | 'or') => void;
  selectedColor: NoteColor | 'all';
  setSelectedColor: (color: NoteColor | 'all') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  dateFrom: string;
  setDateFrom: (date: string) => void;
  dateTo: string;
  setDateTo: (date: string) => void;
  dateField: 'created_at' | 'updated_at';
  setDateField: (field: 'created_at' | 'updated_at') => void;
  typeFilters: {
    has_images: boolean;
    has_files: boolean;
    has_checklist: boolean;
  };
  setTypeFilters: React.Dispatch<
    React.SetStateAction<{
      has_images: boolean;
      has_files: boolean;
      has_checklist: boolean;
    }>
  >;

  // UI state
  isGridView: boolean;
  setIsGridView: React.Dispatch<React.SetStateAction<boolean>>;
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  isDarkMode: boolean;
  isCoffeeMode: boolean;
  isKraftMode: boolean;
  setIsDarkMode: (dark: boolean) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  toggleSidebar: () => void;
  noteCounts: NoteCounts;
  editingNote: Note | null;
  setEditingNote: (note: Note | null) => void;
  lightboxAttachment: {
    attachment: Attachment;
    noteTitle: string;
    allImageAttachments: Attachment[];
  } | null;
  setLightboxAttachment: (data: {
    attachment: Attachment;
    noteTitle: string;
    allImageAttachments: Attachment[];
  } | null) => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  isHelpModalOpen: boolean;
  setIsHelpModalOpen: (open: boolean) => void;
  isSettingsModalOpen: boolean;
  setIsSettingsModalOpen: (open: boolean) => void;
  toasts: Toast[];
  showToast: (text: string, actionText?: string, onAction?: () => void) => void;
  dismissToast: (id: string) => void;

  // Font & Appearance Settings
  fontFamily: FontFamilyOption;
  setFontFamily: (font: FontFamilyOption) => void;
  fontSize: FontSizeOption;
  setFontSize: (size: FontSizeOption) => void;

  // Auth
  currentUser: User | null;
  authLoading: boolean;
  isOwner: boolean;
  isApiUser: boolean;
  login: (u: string, p: string) => Promise<void>;
  logout: () => Promise<void>;

  // Confirmation Dialog
  confirmDialog: {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
    onConfirm: () => void | Promise<void>;
  };
  openConfirmDialog: (opts: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
    onConfirm: () => void | Promise<void>;
  }) => void;
  closeConfirmDialog: () => void;

  // Actions
  loadNotes: () => Promise<void>;
  loadTags: () => Promise<void>;
  loadNoteCounts: () => Promise<void>;
  createNote: (data: Parameters<typeof api.createNote>[0]) => Promise<Note>;
  updateNote: (id: string, data: Parameters<typeof api.updateNote>[1]) => Promise<Note>;
  deleteNote: (id: string) => Promise<void>;
  toggleStar: (id: string) => Promise<void>;
  toggleArchive: (id: string, is_archived?: boolean) => Promise<void>;
  toggleTrash: (id: string, is_trashed?: boolean) => Promise<void>;
  changeColor: (id: string, color: NoteColor) => Promise<void>;
  toggleChecklistItem: (noteId: string, itemId: string, is_completed: boolean, text?: string) => Promise<void>;
  duplicateNote: (id: string) => Promise<void>;
  emptyTrash: () => Promise<void>;
}

const NotesContext = createContext<NotesContextType | null>(null);

export const FONT_FAMILIES: Record<FontFamilyOption, { name: string; cssFamily: string; sample: string }> = {
  ibm: {
    name: 'IBM Plex Sans',
    cssFamily: "'IBM Plex Sans', sans-serif",
    sample: 'Industrial, highly readable engineered grotesk for technical precision.',
  },
  jakarta: {
    name: 'Plus Jakarta Sans',
    cssFamily: "'Plus Jakarta Sans', sans-serif",
    sample: 'Fresh, refined modern grotesque typography tailored for 2026 UIs.',
  },
  inter: {
    name: 'Inter',
    cssFamily: "'Inter', sans-serif",
    sample: 'Modern, highly legible geometric sans-serif for clean reading.',
  },
  noto: {
    name: 'Noto Sans',
    cssFamily: "'Noto Sans', sans-serif",
    sample: 'Global Google standard font with exceptional clarity and balance.',
  },
  merriweather: {
    name: 'Merriweather',
    cssFamily: "'Merriweather', serif",
    sample: 'Warm, pleasant editorial serif designed for effortless long reading.',
  },
  playfair: {
    name: 'Playfair Display',
    cssFamily: "'Playfair Display', serif",
    sample: 'Sophisticated, classic high-contrast serif with literary elegance.',
  },
  lora: {
    name: 'Lora',
    cssFamily: "'Lora', serif",
    sample: 'Contemporary serif with brushed curves, ideal for rich notes.',
  },
  system: {
    name: 'System Default',
    cssFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    sample: 'Native platform font stack optimized for your operating system.',
  },
};

export const FONT_SIZES: Record<FontSizeOption, { label: string; scale: number; description: string }> = {
  compact: { label: 'Compact', scale: 0.92, description: 'Dense layout for maximizing visible notes' },
  default: { label: 'Default', scale: 1.0, description: 'Standard comfortable sizing (+0.10rem enhanced)' },
  medium: { label: 'Medium', scale: 1.08, description: 'Slightly enlarged text for comfortable viewing' },
  large: { label: 'Large', scale: 1.16, description: 'Prominent readability for high-res displays' },
  xlarge: { label: 'Extra Large', scale: 1.25, description: 'Maximum legibility and spacious presentation' },
};

export const NotesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagTree, setTagTree] = useState<Tag[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeView, setActiveView] = useState<ViewMode>('notes');
  const [activeSettingsTab, setActiveSettingsTab] = useState<SettingsTab>('appearance');

  // Filters
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [tagMatch, setTagMatch] = useState<'and' | 'or'>('and');
  const [selectedColor, setSelectedColor] = useState<NoteColor | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [dateField, setDateField] = useState<'created_at' | 'updated_at'>('created_at');
  const [typeFilters, setTypeFilters] = useState({
    has_images: false,
    has_files: false,
    has_checklist: false,
  });

  // UI state
  const [isGridView, setIsGridView] = useState<boolean>(() => {
    return (localStorage.getItem('quicknotes_view_mode') || localStorage.getItem('saved_view_mode')) !== 'list';
  });

  const [theme, setThemeState] = useState<AppTheme>(() => {
    const saved = localStorage.getItem('quicknotes_theme') || localStorage.getItem('saved_theme');
    if (saved === 'dark') return 'dark';
    if (saved === 'coffee' || saved === 'kraft') return 'coffee';
    if (saved === 'light' || saved === 'default') return 'default';
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    return 'default';
  });

  const isDarkMode = theme === 'dark';
  const isCoffeeMode = theme === 'coffee' || theme === 'kraft';
  const isKraftMode = isCoffeeMode;

  const setTheme = useCallback((newTheme: AppTheme) => {
    setThemeState(newTheme === 'kraft' ? 'coffee' : newTheme);
  }, []);

  const setIsDarkMode = useCallback((dark: boolean) => {
    setThemeState(dark ? 'dark' : 'default');
  }, []);

  const [fontFamily, setFontFamily] = useState<FontFamilyOption>(() => {
    return (
      (localStorage.getItem('quicknotes_font_family') as FontFamilyOption) ||
      (localStorage.getItem('saved_font_family') as FontFamilyOption) ||
      'inter'
    );
  });

  const [fontSize, setFontSize] = useState<FontSizeOption>(() => {
    return (
      (localStorage.getItem('quicknotes_font_size') as FontSizeOption) ||
      (localStorage.getItem('saved_font_size') as FontSizeOption) ||
      'default'
    );
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024; // Automatically hide on mobile/tablet, open on desktop
    }
    return true;
  });

  // Automatically adjust sidebar on screen resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => !prev);
  }, []);

  const [noteCounts, setNoteCounts] = useState<NoteCounts>({
    notes: 0,
    starred: 0,
    archive: 0,
    trash: 0,
  });

  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [lightboxAttachment, setLightboxAttachment] = useState<{
    attachment: Attachment;
    noteTitle: string;
    allImageAttachments: Attachment[];
  } | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // Apply theme classes to document root
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      root.classList.remove('dark', 'theme-coffee', 'theme-kraft');
      if (theme === 'dark') {
        root.classList.add('dark');
      } else if (theme === 'coffee' || theme === 'kraft') {
        root.classList.add('theme-coffee', 'theme-kraft');
      }
      localStorage.setItem('quicknotes_theme', theme);
    }
  }, [theme]);

  // Apply font family CSS variable to document root
  useEffect(() => {
    const config = FONT_FAMILIES[fontFamily] || FONT_FAMILIES.inter;
    document.documentElement.style.setProperty('--app-font-family', config.cssFamily);
    localStorage.setItem('quicknotes_font_family', fontFamily);
  }, [fontFamily]);

  // Apply font size scale variable
  useEffect(() => {
    const config = FONT_SIZES[fontSize] || FONT_SIZES.default;
    document.documentElement.style.setProperty('--font-scale', config.scale.toString());
    localStorage.setItem('quicknotes_font_size', fontSize);
  }, [fontSize]);

  // Save view mode
  useEffect(() => {
    localStorage.setItem('quicknotes_view_mode', isGridView ? 'grid' : 'list');
  }, [isGridView]);

  // Toast notifications
  const showToast = useCallback((text: string, actionText?: string, onAction?: () => void) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, text, actionText, onAction }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Themed Confirmation Dialog State & Handlers
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const openConfirmDialog = useCallback((opts: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
    onConfirm: () => void | Promise<void>;
  }) => {
    setConfirmDialog({ ...opts, isOpen: true });
  }, []);

  const closeConfirmDialog = useCallback(() => {
    setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
  }, []);

  // Initial Auth Check
  useEffect(() => {
    const checkAuth = async () => {
      setAuthLoading(true);
      try {
        const res = await api.fetchCurrentUser();
        if (res.authenticated && res.user) {
          setCurrentUser(res.user);
        } else {
          setCurrentUser(null);
          api.setStoredToken(null);
        }
      } catch (err) {
        console.error('Auth check error:', err);
        setCurrentUser(null);
        api.setStoredToken(null);
      } finally {
        setAuthLoading(false);
      }
    };
    checkAuth();
  }, []);

  // Load Tags & Tree
  const loadTags = useCallback(async () => {
    if (!currentUser) return;
    try {
      const data = await api.fetchTags();
      setTags(data.flat || []);
      setTagTree(data.tree || []);
    } catch (err) {
      console.error('Failed to load tags:', err);
    }
  }, [currentUser]);

  // Load Note Counts for sidebar
  const loadNoteCounts = useCallback(async () => {
    if (!currentUser) return;
    try {
      const counts = await api.fetchNoteCounts();
      setNoteCounts(counts);
    } catch (err) {
      console.error('Failed to load note counts:', err);
    }
  }, [currentUser]);

  // Load Notes
  const loadNotes = useCallback(async () => {
    if (!currentUser) {
      setNotes([]);
      setLoading(false);
      return;
    }
    if (activeView === 'settings') return;
    setLoading(true);
    try {
      const combinedTagIds = [...selectedTagIds];
      if (selectedTag && !combinedTagIds.includes(selectedTag)) {
        combinedTagIds.push(selectedTag);
      }

      const filters: FilterOptions = {
        view: activeView,
        tag_ids: combinedTagIds.length > 0 ? combinedTagIds : undefined,
        tag_match: tagMatch,
        color: selectedColor !== 'all' ? selectedColor : undefined,
        q: searchQuery.trim() || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        date_field: dateField,
        has_images: typeFilters.has_images || undefined,
        has_files: typeFilters.has_files || undefined,
        has_checklist: typeFilters.has_checklist || undefined,
      };

      const data = await api.fetchNotes(filters);
      setNotes(data);
      loadNoteCounts();
    } catch (err: any) {
      console.error('Failed to load notes:', err);
      showToast('Failed to load notes');
    } finally {
      setLoading(false);
    }
  }, [currentUser, activeView, selectedTag, selectedTagIds, tagMatch, selectedColor, searchQuery, dateFrom, dateTo, dateField, typeFilters, showToast, loadNoteCounts]);

  const loginUser = async (u: string, p: string) => {
    const data = await api.login(u, p);
    setCurrentUser(data.user);
    showToast(`Signed in as ${data.user.display_name || data.user.username}`);
  };

  const logoutUser = async () => {
    await api.logout();
    setCurrentUser(null);
    setNotes([]);
    setTags([]);
    setTagTree([]);
    setNoteCounts({ notes: 0, starred: 0, archive: 0, trash: 0 });
    showToast('Signed out');
  };

  const isOwner = currentUser?.role === 'owner';
  const isApiUser = currentUser?.role === 'api';

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  useEffect(() => {
    loadTags();
    loadNoteCounts();
  }, [loadTags, loadNoteCounts]);

  // Actions
  const createNote = async (data: Parameters<typeof api.createNote>[0]) => {
    const newNote = await api.createNote(data);
    setNotes((prev) => [newNote, ...prev]);
    loadTags();
    loadNoteCounts();
    showToast('Note created');
    return newNote;
  };

  const updateNote = async (id: string, data: Parameters<typeof api.updateNote>[1]) => {
    const updated = await api.updateNote(id, data);
    setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
    if (editingNote?.id === id) {
      setEditingNote(updated);
    }
    loadTags();
    loadNoteCounts();
    return updated;
  };

  const deleteNote = async (id: string) => {
    try {
      await api.deleteNote(id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
      if (editingNote?.id === id) setEditingNote(null);
      loadTags();
      loadNoteCounts();
      showToast('Note deleted permanently');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete note');
    }
  };

  const toggleStar = async (id: string) => {
    const updated = await api.toggleStar(id);
    setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
    if (editingNote?.id === id) setEditingNote(updated);
    loadNoteCounts();
    showToast(updated.is_starred ? 'Note starred' : 'Note unstarred');
  };

  const toggleArchive = async (id: string, is_archived?: boolean) => {
    const updated = await api.toggleArchive(id, is_archived);
    if (activeView === 'notes' && updated.is_archived) {
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } else if (activeView === 'archive' && !updated.is_archived) {
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } else {
      setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
    }
    if (editingNote?.id === id) setEditingNote(null);
    loadTags();
    loadNoteCounts();
    showToast(
      updated.is_archived ? 'Note archived' : 'Note unarchived',
      'Undo',
      () => toggleArchive(id, !updated.is_archived)
    );
  };

  const toggleTrash = async (id: string, is_trashed?: boolean) => {
    try {
      const updated = await api.toggleTrash(id, is_trashed);
      setNotes((prev) => prev.filter((n) => n.id !== id));
      if (editingNote?.id === id) setEditingNote(null);
      loadTags();
      loadNoteCounts();
      showToast(
        updated.is_trashed ? 'Note moved to trash' : 'Note restored',
        'Undo',
        () => toggleTrash(id, !updated.is_trashed)
      );
    } catch (err: any) {
      showToast(err.message || 'Failed to update trash');
    }
  };

  const changeColor = async (id: string, color: NoteColor) => {
    const updated = await api.changeColor(id, color);
    setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
    if (editingNote?.id === id) setEditingNote(updated);
  };

  const toggleChecklistItem = async (
    noteId: string,
    itemId: string,
    is_completed: boolean,
    text?: string
  ) => {
    setNotes((prev) =>
      prev.map((n) => {
        if (n.id !== noteId) return n;
        return {
          ...n,
          checklist_items: n.checklist_items.map((item) =>
            item.id === itemId ? { ...item, is_completed, text: text !== undefined ? text : item.text } : item
          ),
        };
      })
    );

    try {
      const updated = await api.toggleChecklistItem(noteId, itemId, is_completed, text);
      setNotes((prev) => prev.map((n) => (n.id === noteId ? updated : n)));
      if (editingNote?.id === noteId) setEditingNote(updated);
    } catch (err) {
      console.error('Failed to toggle checklist item:', err);
      loadNotes();
    }
  };

  const duplicateNote = async (id: string) => {
    const newNote = await api.duplicateNote(id);
    setNotes((prev) => [newNote, ...prev]);
    loadTags();
    loadNoteCounts();
    showToast('Note duplicated');
  };

  const emptyTrash = async () => {
    try {
      await api.emptyTrash();
      setNotes([]);
      loadTags();
      loadNoteCounts();
      showToast('Trash emptied');
    } catch (err: any) {
      showToast(err.message || 'Failed to empty trash');
    }
  };

  return (
    <NotesContext.Provider
      value={{
        notes,
        tags,
        tagTree,
        noteCounts,
        loading,
        activeView,
        setActiveView,
        activeSettingsTab,
        setActiveSettingsTab,
        selectedTag,
        setSelectedTag,
        selectedTagIds,
        setSelectedTagIds,
        tagMatch,
        setTagMatch,
        selectedColor,
        setSelectedColor,
        searchQuery,
        setSearchQuery,
        dateFrom,
        setDateFrom,
        dateTo,
        setDateTo,
        dateField,
        setDateField,
        typeFilters,
        setTypeFilters,
        isGridView,
        setIsGridView,
        theme,
        setTheme,
        isDarkMode,
        isCoffeeMode,
        isKraftMode,
        setIsDarkMode,
        isSidebarOpen,
        setIsSidebarOpen,
        toggleSidebar,
        editingNote,
        setEditingNote,
        lightboxAttachment,
        setLightboxAttachment,
        isAuthModalOpen,
        setIsAuthModalOpen,
        isHelpModalOpen,
        setIsHelpModalOpen,
        isSettingsModalOpen,
        setIsSettingsModalOpen,
        fontFamily,
        setFontFamily,
        fontSize,
        setFontSize,
        toasts,
        showToast,
        dismissToast,
        confirmDialog,
        openConfirmDialog,
        closeConfirmDialog,
        currentUser,
        authLoading,
        isOwner,
        isApiUser,
        login: loginUser,
        logout: logoutUser,
        loadNotes,
        loadTags,
        loadNoteCounts,
        createNote,
        updateNote,
        deleteNote,
        toggleStar,
        toggleArchive,
        toggleTrash,
        changeColor,
        toggleChecklistItem,
        duplicateNote,
        emptyTrash,
      }}
    >
      {children}
    </NotesContext.Provider>
  );
};

export const useNotes = () => {
  const context = useContext(NotesContext);
  if (!context) {
    throw new Error('useNotes must be used within a NotesProvider');
  }
  return context;
};

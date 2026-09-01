import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Tag as TagIcon,
  Download,
  FileText,
  Plus,
  Play,
} from 'lucide-react';
import { useNotes } from '../context/NotesContext';
import { NoteColor, Attachment } from '../types';
import { getNoteColorClasses } from './ColorPicker';
import { TagPicker } from './TagPicker';
import {
  uploadAttachments,
  getFileUrl,
  getThumbnailUrl,
  getAttachmentDownloadUrl,
  deleteAttachment,
} from '../api/client';
import { RichTextToolbar } from './RichTextToolbar';
import { formatNoteCreationDateTime } from './NoteCard';
import { handleSmartPaste } from '../utils/markdownPaste';

export const NoteModal: React.FC = () => {
  const {
    editingNote,
    setEditingNote,
    updateNote,
    toggleArchive,
    toggleTrash,
    deleteNote,
    isDarkMode,
    isKraftMode,
    showToast,
    loadNotes,
    tags,
    setLightboxAttachment,
    openConfirmDialog,
    activeView,
  } = useNotes();

  const [content, setContent] = useState('');
  const [color, setColor] = useState<NoteColor>('default');
  const [isStarred, setIsStarred] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Sync state when editingNote changes
  useEffect(() => {
    if (editingNote) {
      let initialContent = editingNote.content || '';
      if (!initialContent && editingNote.checklist_items && editingNote.checklist_items.length > 0) {
        initialContent = editingNote.checklist_items
          .map((i) => `- [${i.is_completed ? 'x' : ' '}] ${i.text}`)
          .join('\n');
      }

      setContent(initialContent);
      setColor(editingNote.color || 'default');
      setIsStarred(!!editingNote.is_starred);
      setSelectedTagIds((editingNote.tags || []).map((t) => t.id));
      setAttachments(editingNote.attachments || []);
      setShowTagPicker(false);
    }
  }, [editingNote]);

  // Handle clipboard image paste in modal
  useEffect(() => {
    if (!editingNote) return;

    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) imageFiles.push(file);
        }
      }

      if (imageFiles.length > 0) {
        e.preventDefault();
        await handleFileUpload(imageFiles);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [editingNote]);

  // Auto-resize textarea
  useEffect(() => {
    if (editingNote && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(120, textareaRef.current.scrollHeight)}px`;
    }
  }, [editingNote, content]);

  // Keyboard shortcuts (Escape, Ctrl+Enter)
  useEffect(() => {
    if (!editingNote) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleSaveAndClose();
      } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        handleSaveAndClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingNote, content, color, isStarred, selectedTagIds]);

  if (!editingNote) return null;

  const colorClasses = getNoteColorClasses(color, isDarkMode, isKraftMode);

  const mediaAttachments = attachments.filter(
    (a) => a.mime_type.startsWith('image/') || a.mime_type.startsWith('video/')
  );
  const fileAttachments = attachments.filter(
    (a) => !a.mime_type.startsWith('image/') && !a.mime_type.startsWith('video/')
  );

  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB per file

  const handleFileUpload = async (files: File[]) => {
    const oversizedFiles = files.filter((f) => f.size > MAX_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      showToast(`File "${oversizedFiles[0].name}" exceeds the maximum 100MB limit`);
      return;
    }

    try {
      setIsUploading(true);
      const uploaded = await uploadAttachments(files, editingNote.id);
      setAttachments((prev) => [...prev, ...uploaded]);
      await loadNotes();
      showToast(`${uploaded.length} attachment(s) added`);
    } catch (err) {
      showToast('Failed to upload attachment');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteAttachment = (att: Attachment) => {
    openConfirmDialog({
      title: 'Delete Attachment',
      message: `Are you sure you want to delete "${att.original_name}"? This cannot be undone.`,
      confirmText: 'Delete',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await deleteAttachment(att.id);
          setAttachments((prev) => prev.filter((a) => a.id !== att.id));
          await loadNotes();
          showToast('Attachment deleted');
        } catch (err) {
          setAttachments((prev) => prev.filter((a) => a.id !== att.id));
        }
      },
    });
  };

  const handleDeleteNotePrompt = () => {
    if (activeView === 'trash') {
      openConfirmDialog({
        title: 'Delete Note Forever',
        message: 'Are you sure you want to permanently delete this note? This action cannot be undone.',
        confirmText: 'Delete Forever',
        isDestructive: true,
        onConfirm: async () => {
          await deleteNote(editingNote.id);
          setEditingNote(null);
        },
      });
    } else {
      openConfirmDialog({
        title: 'Delete Note',
        message: 'Are you sure you want to move this note to trash?',
        confirmText: 'Delete Note',
        isDestructive: true,
        onConfirm: async () => {
          await toggleTrash(editingNote.id, true);
          setEditingNote(null);
        },
      });
    }
  };

  const handleSaveAndClose = async () => {
    if (!editingNote) return;

    await updateNote(editingNote.id, {
      title: '',
      content: content.trim(),
      color,
      is_starred: isStarred,
      tag_ids: selectedTagIds,
    });

    setEditingNote(null);
  };

  const renderThumbnailItem = (att: Attachment) => {
    const isVideo = att.mime_type.startsWith('video/');
    const thumbSrc = getThumbnailUrl(att.thumbnail_filename, att.filename);

    return (
      <>
        {thumbSrc ? (
          <img
            src={thumbSrc}
            alt={att.original_name}
            className="w-full h-full object-cover group-hover/img:scale-105 transition-transform"
            loading="lazy"
          />
        ) : isVideo ? (
          <video
            src={`${getFileUrl(att.filename)}#t=0.5`}
            preload="metadata"
            muted
            playsInline
            className="w-full h-full object-cover pointer-events-none"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-black/10 dark:bg-white/10 text-gray-400">
            <FileText className="w-8 h-8" />
          </div>
        )}

        {isVideo && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center backdrop-blur-xs shadow-md">
              <Play className="w-4 h-4 fill-white ml-0.5" />
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in"
      onClick={handleSaveAndClose}
    >
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        style={color !== 'default' ? colorClasses.style : undefined}
        className={`w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl shadow-keep-modal border overflow-hidden animate-scale-in ${
          color === 'default'
            ? 'bg-white dark:bg-[#202124] border-gray-300 dark:border-[#5f6368]'
            : 'border-transparent'
        }`}
      >
        {/* Top Header Row: Creation Date-Time (Non-editable) & Close Button */}
        <div className="flex items-center justify-between px-4 pt-3 pb-1 border-b border-black/5 dark:border-white/5">
          <span
            style={{ fontWeight: 400, fontSize: '13px' }}
            className="text-[13px] font-normal text-gray-500/80 dark:text-gray-400/80 select-none tracking-tight"
          >
            {formatNoteCreationDateTime(editingNote.created_at)}
          </span>
          <button
            type="button"
            onClick={handleSaveAndClose}
            title="Close"
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Top Formatting Toolbar */}
        <RichTextToolbar
          textareaRef={textareaRef}
          content={content}
          setContent={setContent}
          isStarred={isStarred}
          onToggleStar={() => setIsStarred(!isStarred)}
          color={color}
          onChangeColor={(c) => setColor(c)}
          onUploadImageClick={() => imageInputRef.current?.click()}
          onUploadFileClick={() => fileInputRef.current?.click()}
          onArchiveClick={() => {
            toggleArchive(editingNote.id, !editingNote.is_archived);
            setEditingNote(null);
          }}
          onDeleteClick={handleDeleteNotePrompt}
          isArchived={editingNote.is_archived}
        />

        {/* Scrollable Note Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {/* Markdown Content Editor */}
          <textarea
            ref={textareaRef}
            autoFocus
            placeholder="Take a note... (Markdown supported)"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onPaste={(e) => handleSmartPaste(e, textareaRef.current, setContent)}
            className="w-full bg-transparent text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none resize-none min-h-[140px] leading-relaxed"
          />

          {/* Non-Image File Attachments */}
          {fileAttachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-black/5 dark:border-white/5">
              {fileAttachments.map((att) => (
                <div
                  key={att.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/5 dark:bg-white/10 text-xs text-gray-700 dark:text-gray-300 font-medium"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-500" />
                  <a
                    href={getAttachmentDownloadUrl(att.id)}
                    download={att.original_name}
                    className="truncate max-w-[160px] hover:underline font-mono"
                  >
                    {att.original_name}
                  </a>
                  <a
                    href={getAttachmentDownloadUrl(att.id)}
                    download={att.original_name}
                    title="Download file"
                    className="hover:text-blue-600 p-0.5"
                  >
                    <Download className="w-3 h-3" />
                  </a>
                  <button
                    type="button"
                    onClick={() => handleDeleteAttachment(att)}
                    className="text-gray-400 hover:text-red-500 p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Media Attachments Collage / Grid (at Bottom) */}
          {mediaAttachments.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 mt-3">
              {mediaAttachments.map((att) => (
                <div
                  key={att.id}
                  className="relative group/img aspect-video rounded-lg overflow-hidden cursor-pointer bg-black/10"
                  onClick={() =>
                    setLightboxAttachment({
                      attachment: att,
                      noteTitle: '',
                      allImageAttachments: mediaAttachments,
                    })
                  }
                >
                  {renderThumbnailItem(att)}
                  <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/25 transition-colors" />

                  {/* Actions Overlay: Download & Delete */}
                  <div className="absolute top-1 right-1 flex items-center gap-1 opacity-0 group-hover/img:opacity-100 transition-opacity z-10">
                    <a
                      href={getAttachmentDownloadUrl(att.id)}
                      download={att.original_name}
                      onClick={(e) => e.stopPropagation()}
                      title="Download"
                      className="p-1 bg-black/70 hover:bg-black text-white rounded-full transition-colors shadow-sm"
                    >
                      <Download className="w-3 h-3" />
                    </a>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteAttachment(att);
                      }}
                      title="Remove attachment"
                      className="p-1 bg-black/70 hover:bg-black text-white rounded-full transition-colors shadow-sm"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Hidden File Inputs */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleFileUpload(Array.from(e.target.files));
            e.target.value = '';
          }}
        />
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleFileUpload(Array.from(e.target.files));
            e.target.value = '';
          }}
        />

        {/* Bottom Action Bar: Labels on left, Done button on right */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-black/5 dark:border-white/5 relative bg-black/[0.02] dark:bg-white/[0.02]">
          {/* Labels Row */}
          <div className="flex flex-wrap items-center gap-1.5 relative">
            {/* Blank Label (+ Label) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowTagPicker(!showTagPicker)}
                title="Add labels"
                className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-dashed border-gray-300 dark:border-gray-600 hover:border-amber-500 hover:text-amber-500 text-gray-500 dark:text-gray-400 text-xs font-medium transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Label</span>
              </button>

              {showTagPicker && (
                <TagPicker
                  selectedTagIds={selectedTagIds}
                  onChange={(ids) => setSelectedTagIds(ids)}
                  onClose={() => setShowTagPicker(false)}
                  className="absolute bottom-full left-0 mb-2"
                />
              )}
            </div>

            {/* Applied Labels */}
            {selectedTagIds.map((tagId) => {
              const tag = tags.find((t) => t.id === tagId);
              if (!tag) return null;
              return (
                <span
                  key={tagId}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/80 text-xs font-semibold text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-900/50"
                >
                  <TagIcon className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                  <span>{tag.name}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedTagIds(selectedTagIds.filter((id) => id !== tagId))}
                    className="hover:text-red-500 ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}

            {isUploading && (
              <span className="text-xs text-amber-600 dark:text-amber-400 animate-pulse ml-2 font-medium">
                Uploading...
              </span>
            )}
          </div>

          {/* Done Button */}
          <button
            type="button"
            onClick={handleSaveAndClose}
            style={{ borderRadius: '6px' }}
            className="px-5 py-2 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-[6px] text-xs font-semibold shadow-sm transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default NoteModal;

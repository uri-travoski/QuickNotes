import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  X,
  Tag as TagIcon,
  File as FileIcon,
  Download,
  PenLine,
  Play,
  FileText,
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
import { handleSmartPaste } from '../utils/markdownPaste';

export const NoteCreator: React.FC = () => {
  const { createNote, isDarkMode, isKraftMode, showToast, tags, setLightboxAttachment, openConfirmDialog } = useNotes();

  const [isExpanded, setIsExpanded] = useState(false);
  const [content, setContent] = useState('');
  const [color, setColor] = useState<NoteColor>('default');
  const [isStarred, setIsStarred] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Tag picker popover state
  const [showTagPicker, setShowTagPicker] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const tagPickerBtnRef = useRef<HTMLDivElement>(null);

  // Auto-resize textarea as content changes
  useEffect(() => {
    if (isExpanded && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(90, textareaRef.current.scrollHeight)}px`;
    }
  }, [isExpanded, content]);

  // Close creator on click outside if empty, or save if has content
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        if (showTagPicker) {
          setShowTagPicker(false);
        }
        if (isExpanded) {
          handleSaveAndClose();
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExpanded, content, attachments, color, isStarred, selectedTagIds, showTagPicker]);

  // Handle clipboard paste (Ctrl+V) for images
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (!isExpanded) return;
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
        await handleFilesUpload(imageFiles);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isExpanded]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  };

  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB per file

  const handleFilesUpload = async (files: File[]) => {
    const oversizedFiles = files.filter((f) => f.size > MAX_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      showToast(`File "${oversizedFiles[0].name}" exceeds the maximum 100MB limit`);
      return;
    }

    try {
      setIsUploading(true);
      const uploaded = await uploadAttachments(files);
      setAttachments((prev) => [...prev, ...uploaded]);
      showToast(`${uploaded.length} file(s) attached`);
    } catch (err) {
      showToast('Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteAttachment = (att: Attachment) => {
    openConfirmDialog({
      title: 'Delete Attachment',
      message: `Are you sure you want to remove "${att.original_name}"?`,
      confirmText: 'Remove',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await deleteAttachment(att.id);
          setAttachments((prev) => prev.filter((a) => a.id !== att.id));
          showToast('Attachment removed');
        } catch (err) {
          setAttachments((prev) => prev.filter((a) => a.id !== att.id));
        }
      },
    });
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (!isExpanded) setIsExpanded(true);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await handleFilesUpload(files);
    }
  };

  const handleSaveAndClose = async () => {
    const hasContent =
      content.trim() ||
      attachments.length > 0 ||
      selectedTagIds.length > 0;

    if (hasContent) {
      await createNote({
        title: '',
        content: content.trim(),
        color,
        is_starred: isStarred,
        tag_ids: selectedTagIds,
        attachment_ids: attachments.map((a) => a.id),
      });
    }

    // Reset form
    setContent('');
    setColor('default');
    setIsStarred(false);
    setSelectedTagIds([]);
    setAttachments([]);
    setIsExpanded(false);
    setShowTagPicker(false);
  };

  const colorClasses = getNoteColorClasses(color, isDarkMode, isKraftMode);
  const mediaAttachments = attachments.filter((a) => a.mime_type.startsWith('image/') || a.mime_type.startsWith('video/'));
  const fileAttachments = attachments.filter((a) => !a.mime_type.startsWith('image/') && !a.mime_type.startsWith('video/'));

  // Helper to render media thumbnail in NoteCreator
  const renderThumbnailItem = (att: Attachment) => {
    const isVideo = att.mime_type.startsWith('video/');
    const thumbSrc = getThumbnailUrl(att.thumbnail_filename, att.filename);

    return (
      <>
        {thumbSrc ? (
          <img
            src={thumbSrc}
            alt={att.original_name}
            className="w-full h-full object-cover group-hover/creatorimg:scale-105 transition-transform"
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

        {/* Video Play Badge */}
        {isVideo && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center backdrop-blur-xs shadow-md">
              <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="w-full max-w-2xl mx-auto mb-8 relative z-30">
      <div
        ref={containerRef}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        style={color !== 'default' ? colorClasses.style : undefined}
        className={`rounded-2xl border transition-all duration-200 relative ${
          color === 'default'
            ? 'bg-white dark:bg-[#202124] border-gray-300 dark:border-[#5f6368]'
            : 'border-transparent shadow-keep'
        } ${
          isExpanded
            ? 'shadow-keep-modal ring-2 ring-amber-400/40 dark:ring-amber-500/30 overflow-visible'
            : 'shadow-keep hover:shadow-keep-hover cursor-text overflow-hidden'
        }`}
      >
        {!isExpanded ? (
          /* Collapsed View: Take a note with edit icon on right side */
          <div
            onClick={() => setIsExpanded(true)}
            className="flex items-center justify-between px-4 py-3 text-gray-500 dark:text-gray-400 cursor-text"
          >
            <span className="text-sm font-medium">Take a note...</span>
            <PenLine className="w-4.5 h-4.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" />
          </div>
        ) : (
          /* Expanded View with Markdown Rich Text Toolbar up top */
          <div className="flex flex-col">
            {/* Top Toolbar: Formatting, Star, Note Actions Menu */}
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
            />

            {/* Note Body */}
            <div className="p-4 space-y-3">
              {/* Note Content Textarea */}
              <textarea
                ref={textareaRef}
                autoFocus
                placeholder="Take a note... (Markdown supported)"
                value={content}
                onChange={handleContentChange}
                onPaste={(e) => handleSmartPaste(e, textareaRef.current, setContent)}
                className="w-full bg-transparent text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none resize-none min-h-[100px] leading-relaxed"
              />

              {/* Non-image Files list */}
              {fileAttachments.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {fileAttachments.map((att) => (
                    <div
                      key={att.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/5 dark:bg-white/10 text-xs text-gray-700 dark:text-gray-300 font-medium"
                    >
                      <FileIcon className="w-3.5 h-3.5 text-blue-500" />
                      <span className="truncate max-w-[140px]">{att.original_name}</span>
                      <a
                        href={getAttachmentDownloadUrl(att.id)}
                        download={att.original_name}
                        title="Download file"
                        className="hover:text-blue-600"
                      >
                        <Download className="w-3 h-3" />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDeleteAttachment(att)}
                        className="text-gray-400 hover:text-red-500 ml-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Media Preview in Creator (at Bottom) */}
              {mediaAttachments.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 p-1.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 max-h-56 overflow-y-auto mt-2">
                  {mediaAttachments.map((att) => (
                    <div
                      key={att.id}
                      className="relative group/creatorimg aspect-video rounded-lg overflow-hidden cursor-pointer bg-black/10"
                      onClick={() =>
                        setLightboxAttachment({
                          attachment: att,
                          noteTitle: '',
                          allImageAttachments: mediaAttachments,
                        })
                      }
                    >
                      {renderThumbnailItem(att)}
                      <div className="absolute inset-0 bg-black/0 group-hover/creatorimg:bg-black/25 transition-colors" />

                      {/* Top Action Overlay: Download & Delete */}
                      <div className="absolute top-1 right-1 flex items-center gap-1 opacity-0 group-hover/creatorimg:opacity-100 transition-opacity z-10">
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
                if (e.target.files) handleFilesUpload(Array.from(e.target.files));
                e.target.value = '';
              }}
            />
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) handleFilesUpload(Array.from(e.target.files));
                e.target.value = '';
              }}
            />

            {/* Bottom Row: Labels on left (+ blank label first, then applied labels), Close on right */}
            <div className="flex items-center justify-between px-3 py-2.5 border-t border-black/5 dark:border-white/5 relative">
              {/* Labels Area */}
              <div className="flex flex-wrap items-center gap-1.5 relative">
                {/* First Label: Blank label with + icon */}
                <div className="relative" ref={tagPickerBtnRef}>
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

                {/* Applied Labels to the right of the blank + label */}
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

              {/* Close Button with border-radius: 6px and same formatting as Done button */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveAndClose}
                  style={{ borderRadius: '6px' }}
                  className="px-4 py-1.5 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-[6px] text-xs font-semibold shadow-sm transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NoteCreator;

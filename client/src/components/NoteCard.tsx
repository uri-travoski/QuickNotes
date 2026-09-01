import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Star,
  Pencil,
  Palette,
  Archive,
  Trash2,
  MoreVertical,
  Tag as TagIcon,
  Download,
  FileText,
  RotateCcw,
  Paperclip,
  ChevronDown,
  Play,
} from 'lucide-react';
import { Note, Attachment } from '../types';
import { useNotes } from '../context/NotesContext';
import { getNoteColorClasses, ColorPicker } from './ColorPicker';
import {
  getFileUrl,
  getThumbnailUrl,
  getAttachmentDownloadUrl,
  uploadAttachments,
} from '../api/client';

export const formatNoteCreationDateTime = (dateStr?: string | Date): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');

  return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds}`;
};

interface NoteCardProps {
  note: Note;
}

export const NoteCard = React.memo<NoteCardProps>(({ note }) => {
  const {
    setEditingNote,
    setLightboxAttachment,
    updateNote,
    toggleStar,
    toggleArchive,
    toggleTrash,
    deleteNote,
    changeColor,
    setSelectedTag,
    activeView,
    isDarkMode,
    isKraftMode,
    showToast,
    loadNotes,
    openConfirmDialog,
  } = useNotes();

  const [isHovered, setIsHovered] = useState(false);
  const [isCardMenuOpen, setIsCardMenuOpen] = useState(false);
  const [isCardColorPickerOpen, setIsCardColorPickerOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const cardMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setIsCardMenuOpen(false);
        setIsCardColorPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFileUpload = async (files: File[]) => {
    try {
      const uploaded = await uploadAttachments(files, note.id);
      await loadNotes();
      showToast(`${uploaded.length} attachment(s) added`);
    } catch (err) {
      showToast('Failed to upload attachment');
    }
  };

  // Toggle markdown task checkbox in display mode
  const handleToggleMarkdownCheckbox = useCallback(
    (taskIndex: number) => {
      let count = 0;
      const regex = /^(\s*[-*+]\s+\[)([ xX])(\]\s+.*)$/gm;
      const updatedContent = (note.content || '').replace(regex, (match, prefix, checkState, suffix) => {
        if (count === taskIndex) {
          const nextState = checkState.trim().toLowerCase() === 'x' ? ' ' : 'x';
          count++;
          return `${prefix}${nextState}${suffix}`;
        }
        count++;
        return match;
      });

      updateNote(note.id, { content: updatedContent });
    },
    [note.id, note.content, updateNote]
  );

  // Note length & truncation thresholds (e.g. ~70 words or ~400 chars)
  const isLongNote = useMemo(() => {
    if (!note.content) return false;
    const text = note.content.trim();
    const wordCount = text.split(/\s+/).length;
    const lineCount = text.split('\n').length;
    return wordCount > 70 || text.length > 400 || lineCount > 7;
  }, [note.content]);

  const mediaAttachments = (note.attachments || []).filter(
    (a) => a.mime_type.startsWith('image/') || a.mime_type.startsWith('video/')
  );
  const fileAttachments = (note.attachments || []).filter(
    (a) => !a.mime_type.startsWith('image/') && !a.mime_type.startsWith('video/')
  );

  const handleMediaClick = (e: React.MouseEvent, att: Attachment) => {
    e.stopPropagation();
    setLightboxAttachment({
      attachment: att,
      noteTitle: '',
      allImageAttachments: mediaAttachments,
    });
  };

  const handleCardClick = () => {
    if (isLongNote && !isExpanded) {
      setIsExpanded(true);
      return;
    }
    setEditingNote(note);
  };

  const colorClasses = getNoteColorClasses(note.color, isDarkMode, isKraftMode);

  // Memoized Markdown rendering
  const renderedMarkdown = useMemo(() => {
    if (!note.content) return null;
    let taskCounter = 0;
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          input: ({ node, ...props }) => {
            if (props.type === 'checkbox') {
              const currentTaskIndex = taskCounter++;
              return (
                <input
                  type="checkbox"
                  checked={props.checked}
                  disabled={false}
                  onChange={(e) => {
                    e.stopPropagation();
                    handleToggleMarkdownCheckbox(currentTaskIndex);
                  }}
                  className="w-3.5 h-3.5 rounded text-amber-600 focus:ring-amber-500 border-gray-300 dark:border-gray-600 cursor-pointer mr-1.5 align-middle"
                />
              );
            }
            return <input {...props} />;
          },
          h1: ({ children }) => <h1 className="text-base font-bold mb-1.5 last:mb-0">{children}</h1>,
          h2: ({ children }) => <h2 className="text-sm font-bold mb-1 last:mb-0">{children}</h2>,
          h3: ({ children }) => <h3 className="text-xs font-bold mb-1 last:mb-0">{children}</h3>,
          h4: ({ children }) => <h4 className="text-xs font-semibold mb-0.5 last:mb-0">{children}</h4>,
          p: ({ children }) => <p className="mb-1.5 last:mb-0 leading-relaxed whitespace-pre-wrap">{children}</p>,
          ul: ({ children }) => <ul className="list-disc list-inside mb-1 last:mb-0 space-y-0.5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside mb-1 last:mb-0 space-y-0.5">{children}</ol>,
          li: ({ children }) => <li className="text-xs">{children}</li>,
          code: ({ children }) => (
            <code className="px-1 py-0.5 rounded bg-black/5 dark:bg-white/10 font-mono text-[11px] text-amber-600 dark:text-amber-400">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="p-2 rounded-lg bg-black/5 dark:bg-white/10 font-mono text-[11px] overflow-x-auto my-1">
              {children}
            </pre>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-1">
              <table className="border-collapse border border-gray-200 dark:border-gray-700 text-xs w-full">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-gray-200 dark:border-gray-700 p-1 bg-black/5 dark:bg-white/5 font-semibold text-left">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-gray-200 dark:border-gray-700 p-1">{children}</td>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-blue-500 hover:underline"
            >
              {children}
            </a>
          ),
          hr: () => <hr className="border-t border-gray-200 dark:border-gray-700 my-2" />,
        }}
      >
        {note.content}
      </ReactMarkdown>
    );
  }, [note.content, handleToggleMarkdownCheckbox]);

  return (
    <div
      ref={cardRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
      style={note.color !== 'default' ? colorClasses.style : undefined}
      className={`group relative rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden ${
        isCardMenuOpen ? 'z-30' : ''
      } ${
        note.color === 'default'
          ? 'bg-white dark:bg-[#202124] border-gray-200 dark:border-[#5f6368]/40 hover:border-transparent'
          : 'border-transparent'
      } ${
        isHovered || isCardMenuOpen
          ? 'shadow-keep-hover -translate-y-0.5'
          : 'shadow-keep'
      }`}
    >
      {/* Top Row: Creation Date-Time (Left) + Star, Edit Pencil & 3-dot Menu (Right) */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1 z-20 min-h-[36px]">
        {/* Creation Date & Time */}
        <span
          style={{ fontWeight: 400, fontSize: '13px' }}
          className="text-[13px] font-normal text-gray-500/80 dark:text-gray-400/80 select-none tracking-tight"
        >
          {formatNoteCreationDateTime(note.created_at)}
        </span>

        {/* Top-Right Options: Star, Edit Pencil & 3-dot Menu */}
        <div className="flex items-center gap-1">
          {/* Star Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleStar(note.id);
            }}
            title={note.is_starred ? 'Unstar note' : 'Star note'}
            className={`p-1.5 rounded-lg backdrop-blur-xs transition-all cursor-pointer ${
              note.is_starred
                ? 'text-amber-500 dark:text-amber-400 opacity-100'
                : 'text-gray-400 hover:text-amber-500 dark:text-gray-500 dark:hover:text-amber-400 opacity-80 hover:opacity-100'
            }`}
          >
            <Star size={17} className={`${note.is_starred ? 'fill-amber-400 text-amber-500' : ''}`} />
          </button>

          {/* Edit Pencil Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setEditingNote(note);
            }}
            title="Edit note"
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200 opacity-80 hover:opacity-100 backdrop-blur-xs transition-all cursor-pointer"
          >
            <Pencil size={16} />
          </button>

          {/* 3-dot Menu */}
          <div className="relative" ref={cardMenuRef}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsCardMenuOpen(!isCardMenuOpen);
                setIsCardColorPickerOpen(false);
              }}
              title="Note options"
              className={`p-1.5 rounded-lg backdrop-blur-xs transition-all cursor-pointer ${
                isCardMenuOpen
                  ? 'text-gray-900 dark:text-gray-100 bg-black/10 dark:bg-white/10 opacity-100 shadow-sm'
                  : 'text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200 opacity-80 hover:opacity-100'
              }`}
            >
              <MoreVertical size={16} />
            </button>

            {isCardMenuOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute top-full right-0 mt-1 w-48 bg-white dark:bg-[#2d2e30] rounded-xl shadow-keep-modal border border-gray-200 dark:border-[#5f6368] py-1.5 z-50 text-xs text-gray-700 dark:text-gray-200 animate-scale-in"
              >
                {/* Background */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsCardColorPickerOpen(!isCardColorPickerOpen)}
                    className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-[#3c4043] cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Palette className="w-3.5 h-3.5 text-gray-500" />
                      <span>Background</span>
                    </div>
                    <ChevronDown className="w-3 h-3 text-gray-400" />
                  </button>

                  {isCardColorPickerOpen && (
                    <div className="p-2 border-t border-gray-100 dark:border-[#3c4043]">
                      <ColorPicker
                        selectedColor={note.color}
                        columns={4}
                        isKraft={isKraftMode}
                        onSelectColor={(c) => {
                          changeColor(note.id, c);
                          setIsCardColorPickerOpen(false);
                          setIsCardMenuOpen(false);
                        }}
                        className="border-0 shadow-none p-0"
                      />
                    </div>
                  )}
                </div>

                {/* Attachment */}
                <button
                  type="button"
                  onClick={() => {
                    fileInputRef.current?.click();
                    setIsCardMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-[#3c4043] cursor-pointer"
                >
                  <Paperclip className="w-3.5 h-3.5 text-gray-500" />
                  <span>Attachment</span>
                </button>

                {/* Archive */}
                <button
                  type="button"
                  onClick={() => {
                    toggleArchive(note.id, !note.is_archived);
                    setIsCardMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-[#3c4043] cursor-pointer"
                >
                  <Archive className="w-3.5 h-3.5 text-gray-500" />
                  <span>{note.is_archived ? 'Unarchive' : 'Archive'}</span>
                </button>

                {/* Delete */}
                {activeView === 'trash' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        toggleTrash(note.id, false);
                        setIsCardMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-[#3c4043] text-left cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-blue-500" />
                      <span>Restore note</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCardMenuOpen(false);
                        openConfirmDialog({
                          title: 'Delete Note Forever',
                          message: 'Are you sure you want to permanently delete this note? This action cannot be undone.',
                          confirmText: 'Delete Forever',
                          isDestructive: true,
                          onConfirm: () => deleteNote(note.id),
                        });
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-[#3c4043] text-left text-red-500 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete forever</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCardMenuOpen(false);
                      openConfirmDialog({
                        title: 'Delete Note',
                        message: 'Are you sure you want to move this note to trash?',
                        confirmText: 'Delete Note',
                        isDestructive: true,
                        onConfirm: () => toggleTrash(note.id, true),
                      });
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-[#3c4043] text-left text-red-500 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete note</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hidden File Input for Card Display Mode */}
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

      <div className="flex-1 flex flex-col justify-between">
        {/* Card Content Area */}
        <div className="p-4 pt-1 pb-3 space-y-2.5 flex-1">
          {/* Formatted Markdown Content with Fade-out if long note */}
          {note.content && (
            <div>
              <div
                style={
                  isLongNote && !isExpanded
                    ? {
                        maxHeight: '165px',
                        overflow: 'hidden',
                        maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 55%, rgba(0,0,0,0) 100%)',
                        WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 55%, rgba(0,0,0,0) 100%)',
                      }
                    : undefined
                }
                className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed max-w-none"
              >
                {renderedMarkdown}
              </div>

              {/* Show more / Show less button */}
              {isLongNote && !isExpanded && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(true);
                  }}
                  className="inline-block text-xs font-bold text-gray-900 dark:text-gray-100 hover:underline mt-2 cursor-pointer"
                >
                  Show more
                </button>
              )}
              {isLongNote && isExpanded && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(false);
                  }}
                  className="inline-block text-xs font-bold text-gray-500 dark:text-gray-400 hover:underline mt-2 cursor-pointer"
                >
                  Show less
                </button>
              )}
            </div>
          )}

          {/* Compact Media Thumbnails (Images & Videos) */}
          {mediaAttachments.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {mediaAttachments.map((att) => {
                const isVideo = att.mime_type.startsWith('video/');
                const thumbSrc = getThumbnailUrl(att.thumbnail_filename, att.filename);

                return (
                  <div
                    key={att.id}
                    onClick={(e) => handleMediaClick(e, att)}
                    className="relative group/thumb w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border border-gray-200/80 dark:border-white/10 bg-black/5 dark:bg-white/5 cursor-pointer flex-shrink-0 shadow-xs hover:shadow-md transition-all hover:scale-[1.03]"
                  >
                    {thumbSrc ? (
                      <img
                        src={thumbSrc}
                        alt={att.original_name}
                        className="w-full h-full object-cover"
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
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <FileText className="w-6 h-6" />
                      </div>
                    )}

                    {isVideo && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center backdrop-blur-xs shadow-md">
                          <Play className="w-3 h-3 fill-white ml-0.5" />
                        </div>
                      </div>
                    )}

                    {/* Hover download overlay */}
                    <a
                      href={getAttachmentDownloadUrl(att.id)}
                      download={att.original_name}
                      onClick={(e) => e.stopPropagation()}
                      title="Download"
                      className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-black text-white rounded-full opacity-0 group-hover/thumb:opacity-100 transition-opacity z-10"
                    >
                      <Download className="w-3 h-3" />
                    </a>
                  </div>
                );
              })}
            </div>
          )}

          {/* Non-Image File Attachments */}
          {fileAttachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {fileAttachments.map((att) => (
                <a
                  key={att.id}
                  href={getAttachmentDownloadUrl(att.id)}
                  download={att.original_name}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-xs text-gray-700 dark:text-gray-300 font-medium transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-500" />
                  <span className="truncate max-w-[120px]">{att.original_name}</span>
                  <Download className="w-3 h-3 text-gray-400" />
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Tags / Labels (At the Very Bottom with Divider Line) */}
        {note.tags?.length > 0 && (
          <div className="border-t border-gray-200/50 dark:border-white/10">
            <div
              style={{ paddingTop: '.75rem', paddingBottom: '.75rem' }}
              className="px-4 flex flex-wrap items-center gap-1.5"
            >
              {(note.tags || []).map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTag(tag.id);
                  }}
                  style={{ fontSize: '14px' }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/80 text-[14px] font-semibold text-amber-900 dark:text-amber-200 hover:bg-amber-200 dark:hover:bg-amber-900/90 transition-colors cursor-pointer"
                >
                  <TagIcon className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>{tag.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default NoteCard;

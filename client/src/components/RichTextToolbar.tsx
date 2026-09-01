import React, { useState, useRef, useEffect } from 'react';
import {
  List,
  ListOrdered,
  CheckSquare,
  Link2,
  Paperclip,
  MoreVertical,
  Star,
  Palette,
  Archive,
  Trash2,
  ChevronDown,
  Code,
  SquareCode,
  Image as ImageIcon,
  Table as TableIcon,
  Minus,
} from 'lucide-react';
import { NoteColor } from '../types';
import { ColorPicker } from './ColorPicker';

export type MarkdownActionType =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'normal'
  | 'bullet'
  | 'numbered'
  | 'checklist'
  | 'link'
  | 'inline_code'
  | 'code_block'
  | 'table'
  | 'hr';

export function applyMarkdownAction(
  textarea: HTMLTextAreaElement,
  content: string,
  setContent: (val: string) => void,
  type: MarkdownActionType
) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selectedText = content.substring(start, end);

  let newContent = content;
  let newCursorStart = start;
  let newCursorEnd = end;

  switch (type) {
    case 'bold': {
      const text = selectedText || 'bold text';
      const replacement = '**' + text + '**';
      newContent = content.substring(0, start) + replacement + content.substring(end);
      newCursorStart = start + 2;
      newCursorEnd = start + 2 + text.length;
      break;
    }
    case 'italic': {
      const text = selectedText || 'italic text';
      const replacement = '*' + text + '*';
      newContent = content.substring(0, start) + replacement + content.substring(end);
      newCursorStart = start + 1;
      newCursorEnd = start + 1 + text.length;
      break;
    }
    case 'underline': {
      const text = selectedText || 'underline text';
      const replacement = '<u>' + text + '</u>';
      newContent = content.substring(0, start) + replacement + content.substring(end);
      newCursorStart = start + 3;
      newCursorEnd = start + 3 + text.length;
      break;
    }
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'normal': {
      const beforeCursor = content.substring(0, start);
      const lineStart = beforeCursor.lastIndexOf('\n') + 1;
      const lineEndIndex = content.indexOf('\n', end);
      const lineEnd = lineEndIndex === -1 ? content.length : lineEndIndex;
      const fullLine = content.substring(lineStart, lineEnd);

      const cleanedLine = fullLine.replace(/^#{1,6}\s+/, '');
      let prefix = '';
      if (type === 'h1') prefix = '# ';
      else if (type === 'h2') prefix = '## ';
      else if (type === 'h3') prefix = '### ';
      else if (type === 'h4') prefix = '#### ';

      const replacedLine = prefix + cleanedLine;
      newContent = content.substring(0, lineStart) + replacedLine + content.substring(lineEnd);
      newCursorStart = lineStart + prefix.length + (start - lineStart);
      newCursorEnd = newCursorStart + selectedText.length;
      break;
    }
    case 'bullet': {
      const beforeCursor = content.substring(0, start);
      const lineStart = beforeCursor.lastIndexOf('\n') + 1;
      const lineEndIndex = content.indexOf('\n', end);
      const lineEnd = lineEndIndex === -1 ? content.length : lineEndIndex;
      const lines = content.substring(lineStart, lineEnd).split('\n');

      const formattedLines = lines.map((line) => {
        const cleaned = line.replace(/^(\s*[-*+]\s+|\s*\d+\.\s+|\s*[-*+]\s+\[[ xX]\]\s+)/, '');
        return '- ' + cleaned;
      });

      const joined = formattedLines.join('\n');
      newContent = content.substring(0, lineStart) + joined + content.substring(lineEnd);
      newCursorStart = lineStart;
      newCursorEnd = lineStart + joined.length;
      break;
    }
    case 'numbered': {
      const beforeCursor = content.substring(0, start);
      const lineStart = beforeCursor.lastIndexOf('\n') + 1;
      const lineEndIndex = content.indexOf('\n', end);
      const lineEnd = lineEndIndex === -1 ? content.length : lineEndIndex;
      const lines = content.substring(lineStart, lineEnd).split('\n');

      let counter = 1;
      const formattedLines = lines.map((line) => {
        const cleaned = line.replace(/^(\s*[-*+]\s+|\s*\d+\.\s+|\s*[-*+]\s+\[[ xX]\]\s+)/, '');
        return (counter++) + '. ' + cleaned;
      });

      const joined = formattedLines.join('\n');
      newContent = content.substring(0, lineStart) + joined + content.substring(lineEnd);
      newCursorStart = lineStart;
      newCursorEnd = lineStart + joined.length;
      break;
    }
    case 'checklist': {
      const beforeCursor = content.substring(0, start);
      const lineStart = beforeCursor.lastIndexOf('\n') + 1;
      const lineEndIndex = content.indexOf('\n', end);
      const lineEnd = lineEndIndex === -1 ? content.length : lineEndIndex;
      const lines = content.substring(lineStart, lineEnd).split('\n');

      const formattedLines = lines.map((line) => {
        const cleaned = line.replace(/^(\s*[-*+]\s+|\s*\d+\.\s+|\s*[-*+]\s+\[[ xX]\]\s+)/, '');
        return '- [ ] ' + cleaned;
      });

      const joined = formattedLines.join('\n');
      newContent = content.substring(0, lineStart) + joined + content.substring(lineEnd);
      newCursorStart = lineStart;
      newCursorEnd = lineStart + joined.length;
      break;
    }
    case 'link': {
      const text = selectedText || 'link text';
      const replacement = '[' + text + '](https://example.com)';
      newContent = content.substring(0, start) + replacement + content.substring(end);
      newCursorStart = start + text.length + 3;
      newCursorEnd = newCursorStart + 19;
      break;
    }
    case 'inline_code': {
      const text = selectedText || 'code';
      const replacement = '`' + text + '`';
      newContent = content.substring(0, start) + replacement + content.substring(end);
      newCursorStart = start + 1;
      newCursorEnd = start + 1 + text.length;
      break;
    }
    case 'code_block': {
      const text = selectedText || 'code block';
      const replacement = '```\n' + text + '\n```';
      newContent = content.substring(0, start) + replacement + content.substring(end);
      newCursorStart = start + 4;
      newCursorEnd = start + 4 + text.length;
      break;
    }
    case 'table': {
      const tableMarkdown = '\n| Header 1 | Header 2 |\n| --- | --- |\n| Cell 1 | Cell 2 |\n';
      newContent = content.substring(0, start) + tableMarkdown + content.substring(end);
      newCursorStart = start + tableMarkdown.length;
      newCursorEnd = newCursorStart;
      break;
    }
    case 'hr': {
      const hrMarkdown = '\n\n---\n\n';
      newContent = content.substring(0, start) + hrMarkdown + content.substring(end);
      newCursorStart = start + hrMarkdown.length;
      newCursorEnd = newCursorStart;
      break;
    }
  }

  setContent(newContent);

  setTimeout(() => {
    textarea.focus();
    textarea.setSelectionRange(newCursorStart, newCursorEnd);
  }, 0);
}

interface RichTextToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  content: string;
  setContent: (val: string) => void;
  isStarred: boolean;
  onToggleStar: () => void;
  color: NoteColor;
  onChangeColor: (color: NoteColor) => void;
  onUploadImageClick?: () => void;
  onUploadFileClick: () => void;
  onArchiveClick?: () => void;
  onDeleteClick?: () => void;
  isArchived?: boolean;
}

export const RichTextToolbar: React.FC<RichTextToolbarProps> = ({
  textareaRef,
  content,
  setContent,
  isStarred,
  onToggleStar,
  color,
  onChangeColor,
  onUploadImageClick,
  onUploadFileClick,
  onArchiveClick,
  onDeleteClick,
  isArchived = false,
}) => {
  const [isHeadingOpen, setIsHeadingOpen] = useState(false);
  const [isListOpen, setIsListOpen] = useState(false);
  const [isFormatMenuOpen, setIsFormatMenuOpen] = useState(false);
  const [isNoteMenuOpen, setIsNoteMenuOpen] = useState(false);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);

  const headingRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const formatMenuRef = useRef<HTMLDivElement>(null);
  const noteMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (headingRef.current && !headingRef.current.contains(e.target as Node)) {
        setIsHeadingOpen(false);
      }
      if (listRef.current && !listRef.current.contains(e.target as Node)) {
        setIsListOpen(false);
      }
      if (formatMenuRef.current && !formatMenuRef.current.contains(e.target as Node)) {
        setIsFormatMenuOpen(false);
      }
      if (noteMenuRef.current && !noteMenuRef.current.contains(e.target as Node)) {
        setIsNoteMenuOpen(false);
        setIsColorPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAction = (type: MarkdownActionType) => {
    if (textareaRef.current) {
      applyMarkdownAction(textareaRef.current, content, setContent, type);
    }
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="flex items-center justify-between px-3.5 py-2 border-b border-black/5 dark:border-white/10 text-gray-700 dark:text-gray-200 select-none transition-colors"
    >
      {/* Left: Formatting Toolbar */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Bold */}
        <button
          type="button"
          onClick={() => handleAction('bold')}
          title="Bold (Ctrl+B)"
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors font-bold text-[15px] text-gray-900 dark:text-gray-100 cursor-pointer"
        >
          B
        </button>

        {/* Italic */}
        <button
          type="button"
          onClick={() => handleAction('italic')}
          title="Italic (Ctrl+I)"
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors italic font-serif font-bold text-[15px] text-gray-900 dark:text-gray-100 cursor-pointer"
        >
          I
        </button>

        {/* Underline */}
        <button
          type="button"
          onClick={() => handleAction('underline')}
          title="Underline (Ctrl+U)"
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors underline font-semibold text-[15px] text-gray-900 dark:text-gray-100 cursor-pointer"
        >
          U
        </button>

        {/* Divider */}
        <div className="h-4 w-px bg-gray-300 dark:bg-gray-600/80 mx-0.5" />

        {/* Headings Dropdown [ Normal v ] */}
        <div className="relative" ref={headingRef}>
          <button
            type="button"
            onClick={() => {
              setIsHeadingOpen(!isHeadingOpen);
              setIsListOpen(false);
              setIsFormatMenuOpen(false);
            }}
            title="Heading style"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-100/90 dark:bg-[#3c4043]/60 hover:bg-gray-200 dark:hover:bg-[#3c4043] border border-gray-200 dark:border-gray-600/60 text-xs font-medium text-gray-800 dark:text-gray-200 transition-colors cursor-pointer"
          >
            <span>Normal</span>
            <ChevronDown className="w-3 h-3 text-gray-500 dark:text-gray-400" />
          </button>

          {isHeadingOpen && (
            <div className="absolute top-full left-0 mt-1 w-36 bg-white dark:bg-[#2d2e30] rounded-xl shadow-keep-modal border border-gray-200 dark:border-[#5f6368] py-1 z-50 text-xs animate-scale-in">
              <button
                type="button"
                onClick={() => {
                  handleAction('normal');
                  setIsHeadingOpen(false);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-gray-100 dark:hover:bg-[#3c4043] font-normal cursor-pointer"
              >
                Normal
              </button>
              <button
                type="button"
                onClick={() => {
                  handleAction('h1');
                  setIsHeadingOpen(false);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-gray-100 dark:hover:bg-[#3c4043] font-bold text-sm cursor-pointer"
              >
                Heading 1
              </button>
              <button
                type="button"
                onClick={() => {
                  handleAction('h2');
                  setIsHeadingOpen(false);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-gray-100 dark:hover:bg-[#3c4043] font-bold text-xs cursor-pointer"
              >
                Heading 2
              </button>
              <button
                type="button"
                onClick={() => {
                  handleAction('h3');
                  setIsHeadingOpen(false);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-gray-100 dark:hover:bg-[#3c4043] font-semibold text-xs cursor-pointer"
              >
                Heading 3
              </button>
              <button
                type="button"
                onClick={() => {
                  handleAction('h4');
                  setIsHeadingOpen(false);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-gray-100 dark:hover:bg-[#3c4043] font-medium text-xs cursor-pointer"
              >
                Heading 4
              </button>
            </div>
          )}
        </div>

        {/* Lists Dropdown [ List v ] */}
        <div className="relative" ref={listRef}>
          <button
            type="button"
            onClick={() => {
              setIsListOpen(!isListOpen);
              setIsHeadingOpen(false);
              setIsFormatMenuOpen(false);
            }}
            title="Lists"
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100/90 dark:bg-[#3c4043]/60 hover:bg-gray-200 dark:hover:bg-[#3c4043] border border-gray-200 dark:border-gray-600/60 text-xs font-medium text-gray-800 dark:text-gray-200 transition-colors cursor-pointer"
          >
            <List className="w-4 h-4 text-gray-700 dark:text-gray-200" />
            <ChevronDown className="w-3 h-3 text-gray-500 dark:text-gray-400" />
          </button>

          {isListOpen && (
            <div className="absolute top-full left-0 mt-1 w-36 bg-white dark:bg-[#2d2e30] rounded-xl shadow-keep-modal border border-gray-200 dark:border-[#5f6368] py-1 z-50 text-xs animate-scale-in">
              <button
                type="button"
                onClick={() => {
                  handleAction('bullet');
                  setIsListOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-gray-100 dark:hover:bg-[#3c4043] cursor-pointer"
              >
                <List className="w-4 h-4 text-gray-500" />
                <span>Bullet list</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  handleAction('numbered');
                  setIsListOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-gray-100 dark:hover:bg-[#3c4043] cursor-pointer"
              >
                <ListOrdered className="w-4 h-4 text-gray-500" />
                <span>Numbered list</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  handleAction('checklist');
                  setIsListOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-gray-100 dark:hover:bg-[#3c4043] cursor-pointer"
              >
                <CheckSquare className="w-4 h-4 text-gray-500" />
                <span>Checklist</span>
              </button>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-4 w-px bg-gray-300 dark:bg-gray-600/80 mx-0.5" />

        {/* Link */}
        <button
          type="button"
          onClick={() => handleAction('link')}
          title="Insert link"
          className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
        >
          <Link2 className="w-4 h-4" />
        </button>

        {/* Attachment (File) */}
        <button
          type="button"
          onClick={onUploadFileClick}
          title="Add attachment"
          className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        {/* More Formatting Menu (3 dots) */}
        <div className="relative" ref={formatMenuRef}>
          <button
            type="button"
            onClick={() => {
              setIsFormatMenuOpen(!isFormatMenuOpen);
              setIsHeadingOpen(false);
              setIsListOpen(false);
            }}
            title="More formatting"
            className={`p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 transition-colors cursor-pointer ${
              isFormatMenuOpen ? 'bg-black/10 dark:bg-white/10' : ''
            }`}
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {isFormatMenuOpen && (
            <div className="absolute top-full left-0 mt-1 w-44 bg-white dark:bg-[#2d2e30] rounded-xl shadow-keep-modal border border-gray-200 dark:border-[#5f6368] py-1.5 z-50 text-xs animate-scale-in">
              <button
                type="button"
                onClick={() => {
                  handleAction('inline_code');
                  setIsFormatMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-[#3c4043] cursor-pointer text-gray-700 dark:text-gray-200 font-medium"
              >
                <Code className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span>Inline code</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  handleAction('code_block');
                  setIsFormatMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-[#3c4043] cursor-pointer text-gray-700 dark:text-gray-200 font-medium"
              >
                <SquareCode className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span>Code block</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onUploadImageClick?.();
                  setIsFormatMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-[#3c4043] cursor-pointer text-gray-700 dark:text-gray-200 font-medium"
              >
                <ImageIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span>Image</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  handleAction('table');
                  setIsFormatMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-[#3c4043] cursor-pointer text-gray-700 dark:text-gray-200 font-medium"
              >
                <TableIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span>Table</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  handleAction('hr');
                  setIsFormatMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-[#3c4043] cursor-pointer text-gray-700 dark:text-gray-200 font-medium"
              >
                <Minus className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span>Horizontal line</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right: Star Icon & Note Actions Menu */}
      <div className="flex items-center gap-1">
        {/* Star Icon */}
        <button
          type="button"
          onClick={onToggleStar}
          title={isStarred ? 'Unstar note' : 'Star note'}
          className={
            'p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer ' +
            (isStarred ? 'text-amber-500 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400')
          }
        >
          <Star size={20} className={'w-5 h-5 ' + (isStarred ? 'fill-amber-400 text-amber-500' : '')} />
        </button>

        {/* Note Actions Menu (3 dots) */}
        <div className="relative" ref={noteMenuRef}>
          <button
            type="button"
            onClick={() => {
              setIsNoteMenuOpen(!isNoteMenuOpen);
              setIsColorPickerOpen(false);
            }}
            title="Note options"
            className={
              'p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer ' +
              (isNoteMenuOpen ? 'bg-black/10 dark:bg-white/10' : 'text-gray-500 dark:text-gray-400')
            }
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {isNoteMenuOpen && (
            <div className="absolute top-full right-0 mt-1 w-48 bg-white dark:bg-[#2d2e30] rounded-xl shadow-keep-modal border border-gray-200 dark:border-[#5f6368] py-1.5 z-50 text-xs animate-scale-in">
              {/* Background */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsColorPickerOpen(!isColorPickerOpen)}
                  className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-[#3c4043] cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-gray-500" />
                    <span>Background</span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                </button>

                {isColorPickerOpen && (
                  <div className="p-2 border-t border-gray-100 dark:border-[#3c4043]">
                    <ColorPicker
                      selectedColor={color}
                      columns={4}
                      onSelectColor={(c) => {
                        onChangeColor(c);
                        setIsColorPickerOpen(false);
                        setIsNoteMenuOpen(false);
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
                  onUploadFileClick();
                  setIsNoteMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-[#3c4043] cursor-pointer"
              >
                <Paperclip className="w-4 h-4 text-gray-500" />
                <span>Attachment</span>
              </button>

              {/* Archive */}
              {onArchiveClick && (
                <button
                  type="button"
                  onClick={() => {
                    onArchiveClick();
                    setIsNoteMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-[#3c4043] cursor-pointer"
                >
                  <Archive className="w-4 h-4 text-gray-500" />
                  <span>{isArchived ? 'Unarchive' : 'Archive'}</span>
                </button>
              )}

              {/* Delete */}
              {onDeleteClick && (
                <button
                  type="button"
                  onClick={() => {
                    onDeleteClick();
                    setIsNoteMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-[#3c4043] text-red-500 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete note</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

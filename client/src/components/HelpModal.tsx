import React from 'react';
import {
  X,
  HelpCircle,
  Keyboard,
  FileText,
  Cloud,
  CheckCircle2,
  BookOpen,
} from 'lucide-react';
import { useNotes } from '../context/NotesContext';

export const HelpModal: React.FC = () => {
  const { isHelpModalOpen, setIsHelpModalOpen } = useNotes();

  if (!isHelpModalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
      onClick={() => setIsHelpModalOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[85vh] bg-white dark:bg-[#202124] border border-gray-200 dark:border-[#5f6368] rounded-2xl shadow-keep-modal flex flex-col overflow-hidden animate-scale-in"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-[#3c4043]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">
                Help & Quick Guide
              </h2>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Shortcuts, formatting tips & cloud attachment overview
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsHelpModalOpen(false)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#3c4043] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs text-gray-700 dark:text-gray-300">
          {/* Section 1: Keyboard Shortcuts */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-200">
              <Keyboard className="w-4 h-4 text-blue-500" />
              <span>Keyboard Shortcuts</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-gray-50 dark:bg-[#2d2f31] p-3 rounded-xl border border-gray-100 dark:border-[#3c4043]">
              <div className="flex items-center justify-between py-1">
                <span>Save Note / Done</span>
                <kbd className="px-2 py-0.5 rounded bg-white dark:bg-[#202124] border border-gray-200 dark:border-gray-700 font-mono text-[11px] shadow-xs">
                  Ctrl / ⌘ + Enter
                </kbd>
              </div>
              <div className="flex items-center justify-between py-1">
                <span>Close Modal / Cancel</span>
                <kbd className="px-2 py-0.5 rounded bg-white dark:bg-[#202124] border border-gray-200 dark:border-gray-700 font-mono text-[11px] shadow-xs">
                  Escape
                </kbd>
              </div>
              <div className="flex items-center justify-between py-1">
                <span>Paste Image from Clipboard</span>
                <kbd className="px-2 py-0.5 rounded bg-white dark:bg-[#202124] border border-gray-200 dark:border-gray-700 font-mono text-[11px] shadow-xs">
                  Ctrl / ⌘ + V
                </kbd>
              </div>
              <div className="flex items-center justify-between py-1">
                <span>Focus Search Box</span>
                <kbd className="px-2 py-0.5 rounded bg-white dark:bg-[#202124] border border-gray-200 dark:border-gray-700 font-mono text-[11px] shadow-xs">
                  /
                </kbd>
              </div>
            </div>
          </div>

          {/* Section 2: Markdown & Rich Text Formatting */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-200">
              <FileText className="w-4 h-4 text-amber-500" />
              <span>Markdown Formatting</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-gray-50 dark:bg-[#2d2f31] p-3 rounded-xl border border-gray-100 dark:border-[#3c4043]">
              <div className="space-y-1">
                <span className="font-mono text-amber-600 dark:text-amber-400"># Heading 1, ## Heading 2</span>
                <p className="text-[11px] text-gray-500">Headers and section titles</p>
              </div>
              <div className="space-y-1">
                <span className="font-mono text-amber-600 dark:text-amber-400">- [ ] Task, - [x] Done</span>
                <p className="text-[11px] text-gray-500">Interactive task checklists</p>
              </div>
              <div className="space-y-1">
                <span className="font-mono text-amber-600 dark:text-amber-400">**bold**, *italic*, `code`</span>
                <p className="text-[11px] text-gray-500">Inline text formatting</p>
              </div>
              <div className="space-y-1">
                <span className="font-mono text-amber-600 dark:text-amber-400">```typescript ... ```</span>
                <p className="text-[11px] text-gray-500">Syntax highlighted code blocks</p>
              </div>
            </div>
          </div>

          {/* Section 3: Attachments & Cloud Storage */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-200">
              <Cloud className="w-4 h-4 text-emerald-500" />
              <span>Attachments & Cloud Storage (S3 / B2 / R2 / Google Drive)</span>
            </div>
            <div className="bg-gray-50 dark:bg-[#2d2f31] p-3.5 rounded-xl border border-gray-100 dark:border-[#3c4043] space-y-2">
              <p className="leading-relaxed">
                Attachments (images, videos, PDFs, spreadsheets, archives) are stored in your configured storage bucket (S3, Cloudflare R2, Backblaze B2, Google Drive, or local uploads).
              </p>
              <div className="flex items-start gap-2 text-[11px] text-gray-600 dark:text-gray-400 pt-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Database Restores:</strong> The database holds all attachment metadata and object keys. When you restore the database on any server with matching cloud storage credentials, all attachments remain automatically linked and accessible with zero data loss.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 dark:border-[#3c4043] flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50/50 dark:bg-white/[0.02]">
          <a
            href="/manual.html"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Open Complete HTML Manual (manual.html) ↗</span>
          </a>

          <button
            type="button"
            onClick={() => setIsHelpModalOpen(false)}
            style={{ borderRadius: '6px' }}
            className="w-full sm:w-auto px-4 py-2 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-[6px] text-xs font-semibold shadow-sm transition-all"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;

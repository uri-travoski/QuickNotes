import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useNotes } from '../context/NotesContext';

export const ConfirmModal: React.FC = () => {
  const { confirmDialog, closeConfirmDialog } = useNotes();

  if (!confirmDialog.isOpen) return null;

  const handleConfirm = async () => {
    try {
      await confirmDialog.onConfirm();
    } finally {
      closeConfirmDialog();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
      onClick={closeConfirmDialog}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white dark:bg-[#282a2d] rounded-2xl shadow-keep-modal border border-gray-200 dark:border-[#5f6368] overflow-hidden p-6 space-y-4 animate-scale-in text-gray-900 dark:text-gray-100"
      >
        <div className="flex items-start gap-3.5">
          <div
            className={`p-2.5 rounded-xl flex-shrink-0 ${
              confirmDialog.isDestructive
                ? 'bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400'
                : 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>

          <div className="flex-1 space-y-1">
            <h3 className="text-base font-bold tracking-tight">
              {confirmDialog.title}
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              {confirmDialog.message}
            </p>
          </div>

          <button
            type="button"
            onClick={closeConfirmDialog}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100 dark:border-[#3c4043]">
          <button
            type="button"
            onClick={closeConfirmDialog}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3c4043] transition-colors"
          >
            {confirmDialog.cancelText || 'Cancel'}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            style={{ borderRadius: '8px' }}
            className={`px-4 py-2 text-xs font-semibold shadow-sm transition-all text-white ${
              confirmDialog.isDestructive
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-amber-600 hover:bg-amber-700'
            }`}
          >
            {confirmDialog.confirmText || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;

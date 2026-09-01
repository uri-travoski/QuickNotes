import React from 'react';
import { X } from 'lucide-react';
import { useNotes } from '../context/NotesContext';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useNotes();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col gap-2 pointer-events-none max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-center justify-between gap-4 px-4 py-3 bg-[#202124] text-white dark:bg-[#e8eaed] dark:text-[#202124] rounded-xl shadow-keep-modal text-sm font-medium animate-scale-in"
        >
          <span className="truncate">{toast.text}</span>
          <div className="flex items-center gap-2 flex-shrink-0">
            {toast.actionText && toast.onAction && (
              <button
                type="button"
                onClick={() => {
                  toast.onAction?.();
                  dismissToast(toast.id);
                }}
                className="text-amber-400 dark:text-amber-700 font-semibold hover:underline text-xs uppercase tracking-wider"
              >
                {toast.actionText}
              </button>
            )}
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="p-1 rounded-md hover:bg-white/10 dark:hover:bg-black/10 text-gray-400 dark:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

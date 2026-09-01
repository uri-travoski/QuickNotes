import React, { useState, useEffect } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Trash2,
  Image as ImageIcon,
  Video as VideoIcon,
  Play,
} from 'lucide-react';
import { useNotes } from '../context/NotesContext';
import { getFileUrl, getThumbnailUrl, getAttachmentDownloadUrl, deleteAttachment } from '../api/client';

export const AttachmentViewer: React.FC = () => {
  const { lightboxAttachment, setLightboxAttachment, loadNotes, showToast, openConfirmDialog } = useNotes();
  const [zoomLevel, setZoomLevel] = useState(1);
  const [currentIndex, setCurrentIndex] = useState(0);

  const mediaList = lightboxAttachment?.allImageAttachments || [];
  const currentMedia = mediaList[currentIndex] || lightboxAttachment?.attachment;

  useEffect(() => {
    if (lightboxAttachment && lightboxAttachment.allImageAttachments.length > 0) {
      const idx = lightboxAttachment.allImageAttachments.findIndex(
        (a) => a.id === lightboxAttachment.attachment.id
      );
      setCurrentIndex(idx !== -1 ? idx : 0);
    }
    setZoomLevel(1);
  }, [lightboxAttachment]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!lightboxAttachment) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxAttachment(null);
      } else if (e.key === 'ArrowRight' && mediaList.length > 1) {
        setCurrentIndex((prev) => (prev + 1) % mediaList.length);
        setZoomLevel(1);
      } else if (e.key === 'ArrowLeft' && mediaList.length > 1) {
        setCurrentIndex((prev) => (prev - 1 + mediaList.length) % mediaList.length);
        setZoomLevel(1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxAttachment, mediaList.length, setLightboxAttachment]);

  if (!lightboxAttachment || !currentMedia) return null;

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => setZoomLevel(1);

  const handleDelete = () => {
    openConfirmDialog({
      title: 'Delete Attachment',
      message: `Are you sure you want to delete "${currentMedia.original_name}"? This action cannot be undone.`,
      confirmText: 'Delete',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await deleteAttachment(currentMedia.id);
          showToast('Attachment deleted');
          await loadNotes();
          if (mediaList.length <= 1) {
            setLightboxAttachment(null);
          } else {
            const nextMedia = mediaList.filter((m) => m.id !== currentMedia.id);
            setCurrentIndex(0);
            setLightboxAttachment({
              ...lightboxAttachment,
              attachment: nextMedia[0],
              allImageAttachments: nextMedia,
            });
          }
        } catch (err: any) {
          showToast('Failed to delete attachment');
        }
      },
    });
  };

  const isImage = currentMedia.mime_type.startsWith('image/');
  const isVideo = currentMedia.mime_type.startsWith('video/');
  const fullUrl = getFileUrl(currentMedia.filename);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex flex-col justify-between select-none animate-fade-in backdrop-blur-sm"
      onClick={() => setLightboxAttachment(null)}
    >
      {/* Top Bar */}
      <div
        className="flex items-center justify-between px-6 py-4 bg-gradient-to-b from-black/80 to-transparent text-white z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 truncate max-w-md">
          {isVideo ? (
            <VideoIcon className="w-5 h-5 text-amber-400 flex-shrink-0" />
          ) : (
            <ImageIcon className="w-5 h-5 text-amber-400 flex-shrink-0" />
          )}
          <div className="truncate">
            <div className="text-sm font-semibold truncate">
              {currentMedia.original_name}
            </div>
            <div className="text-xs text-gray-400">
              {lightboxAttachment.noteTitle || 'Attachment'} •{' '}
              {(currentMedia.file_size / 1024).toFixed(1)} KB
              {currentMedia.width && currentMedia.height
                ? ` • ${currentMedia.width}×${currentMedia.height}px`
                : ''}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {mediaList.length > 1 && (
            <span className="text-xs text-gray-300 mr-3 px-2.5 py-1 bg-white/10 rounded-full font-mono">
              {currentIndex + 1} / {mediaList.length}
            </span>
          )}

          {isImage && (
            <>
              <button
                type="button"
                onClick={handleZoomOut}
                title="Zoom out"
                className="p-2 rounded-full hover:bg-white/15 text-gray-300 hover:text-white transition-colors"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={handleZoomIn}
                title="Zoom in"
                className="p-2 rounded-full hover:bg-white/15 text-gray-300 hover:text-white transition-colors"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                title="Fit to screen"
                className="p-2 rounded-full hover:bg-white/15 text-gray-300 hover:text-white transition-colors"
              >
                <Maximize2 className="w-5 h-5" />
              </button>
            </>
          )}

          <a
            href={getAttachmentDownloadUrl(currentMedia.id)}
            download={currentMedia.original_name}
            title="Download file"
            className="p-2 rounded-full hover:bg-white/15 text-gray-300 hover:text-white transition-colors"
          >
            <Download className="w-5 h-5" />
          </a>

          <button
            type="button"
            onClick={handleDelete}
            title="Delete attachment"
            className="p-2 rounded-full hover:bg-red-500/30 text-red-400 hover:text-red-300 transition-colors"
          >
            <Trash2 className="w-5 h-5" />
          </button>

          <div className="h-5 w-px bg-white/20 mx-1" />

          <button
            type="button"
            onClick={() => setLightboxAttachment(null)}
            title="Close (Esc)"
            className="p-2 rounded-full hover:bg-white/20 text-gray-300 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main Center (Image or Video) */}
      <div
        className="flex-1 relative flex items-center justify-center overflow-hidden p-4"
        onClick={() => setLightboxAttachment(null)}
      >
        {/* Previous Button */}
        {mediaList.length > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setCurrentIndex((prev) => (prev - 1 + mediaList.length) % mediaList.length);
              setZoomLevel(1);
            }}
            title="Previous (←)"
            className="absolute left-6 p-3 rounded-full bg-black/50 hover:bg-black/80 text-white border border-white/10 z-10 transition-transform hover:scale-110"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {isImage ? (
          <img
            src={fullUrl}
            alt={currentMedia.original_name}
            style={{
              transform: `scale(${zoomLevel})`,
              transition: zoomLevel === 1 ? 'transform 0.2s ease-out' : 'none',
            }}
            className="max-h-[82vh] max-w-[90vw] object-contain rounded-lg shadow-2xl cursor-grab active:cursor-grabbing"
            onClick={(e) => e.stopPropagation()}
            draggable={false}
          />
        ) : isVideo ? (
          <div
            className="relative flex items-center justify-center max-h-[82vh] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <video
              src={fullUrl}
              controls
              autoPlay
              playsInline
              className="max-h-[82vh] max-w-[90vw] rounded-xl shadow-2xl outline-none bg-black"
            />
          </div>
        ) : (
          <div
            className="p-8 bg-neutral-800 rounded-2xl text-center text-white max-w-md border border-neutral-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-xl font-bold mb-2">{currentMedia.original_name}</div>
            <p className="text-sm text-neutral-400 mb-6">
              File attachment ({(currentMedia.file_size / 1024).toFixed(1)} KB)
            </p>
            <a
              href={getAttachmentDownloadUrl(currentMedia.id)}
              download={currentMedia.original_name}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium"
            >
              <Download className="w-4 h-4" /> Download File
            </a>
          </div>
        )}

        {/* Next Button */}
        {mediaList.length > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setCurrentIndex((prev) => (prev + 1) % mediaList.length);
              setZoomLevel(1);
            }}
            title="Next (→)"
            className="absolute right-6 p-3 rounded-full bg-black/50 hover:bg-black/80 text-white border border-white/10 z-10 transition-transform hover:scale-110"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Bottom Thumbnail Strip */}
      {mediaList.length > 1 && (
        <div
          className="py-3 px-6 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-center gap-2 overflow-x-auto z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {mediaList.map((m, idx) => {
            const isSelected = idx === currentIndex;
            const isVid = m.mime_type.startsWith('video/');
            const thumbSrc = getThumbnailUrl(m.thumbnail_filename, m.filename);

            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setCurrentIndex(idx);
                  setZoomLevel(1);
                }}
                className={`w-14 h-14 rounded-lg overflow-hidden border-2 relative transition-all flex-shrink-0 bg-neutral-900 ${
                  isSelected
                    ? 'border-amber-400 scale-105 shadow-lg'
                    : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                {thumbSrc ? (
                  <img
                    src={thumbSrc}
                    alt={m.original_name}
                    className="w-full h-full object-cover"
                  />
                ) : isVid ? (
                  <video
                    src={`${getFileUrl(m.filename)}#t=0.5`}
                    preload="metadata"
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                )}
                {isVid && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Play className="w-3 h-3 text-white fill-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AttachmentViewer;

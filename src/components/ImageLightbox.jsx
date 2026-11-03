import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { translations } from '../translations';
import { handleImageError } from '../utils/imageUtils';

export default function ImageLightbox({ isOpen, imageUrl, onClose, alt, title }) {
  const { language } = useStore();
  const t = translations[language] || {};

  // Escape key listener to close smoothly
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !imageUrl) return null;

  const src = typeof imageUrl === 'string' ? imageUrl : imageUrl?.url || imageUrl?.src || imageUrl?.imageUrl || '';
  const altText = alt || title || (typeof imageUrl === 'object' && (imageUrl?.title || imageUrl?.name)) || 'Product preview';

  return (
    <AnimatePresence>
      <motion.div
        key="image-lightbox-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          key="image-lightbox-card"
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          transition={{ type: 'spring', damping: 26, stiffness: 360 }}
          className="max-w-md w-full mx-auto p-4 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col items-center justify-center relative my-auto border border-slate-100"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Floating High-Contrast Close Button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-slate-900/80 hover:bg-slate-900 text-white backdrop-blur-md shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer"
            title={t.close || 'Close (Esc)'}
            aria-label="Close image preview"
          >
            <X size={18} strokeWidth={2.5} />
          </button>

          {/* Centered Image Container constrained to 70vh */}
          <div className="w-full flex items-center justify-center overflow-hidden rounded-xl bg-slate-50/80 p-2">
            <img
              src={src}
              alt={altText}
              onError={(e) => handleImageError(e)}
              className="max-h-[70vh] w-auto max-w-full object-contain rounded-xl select-none shadow-xs"
            />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

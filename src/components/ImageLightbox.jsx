import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { translations } from '../translations';

export default function ImageLightbox({ isOpen, imageUrl, onClose }) {
  const { language } = useStore();
  const t = translations[language];

  if (!isOpen || !imageUrl) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
        onClick={onClose}
      >
        <div className="absolute top-4 right-4 z-[110]">
          <button
            onClick={onClose}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            title={t.close || 'Close'}
          >
            <X size={28} />
          </button>
        </div>
        <motion.img
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          src={imageUrl}
          alt="Fullscreen view"
          className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
      </motion.div>
    </AnimatePresence>
  );
}

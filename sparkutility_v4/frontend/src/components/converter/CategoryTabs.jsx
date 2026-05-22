import React from 'react';
import { Video, Music, Image, FileText } from 'lucide-react';
import { motion } from 'framer-motion';

const ICONS = { Video, Music, Image, FileText };

const CATEGORIES = [
  { key: 'video', label: 'Video', icon: 'Video' },
  { key: 'audio', label: 'Audio', icon: 'Music' },
  { key: 'image', label: 'Image', icon: 'Image' },
  { key: 'document', label: 'Document', icon: 'FileText' },
];

export default function CategoryTabs({ activeCategory, onChange }) {
  return (
    <div className="flex gap-2 p-1 rounded-xl bg-secondary/50">
      {CATEGORIES.map((cat) => {
        const Icon = ICONS[cat.icon];
        const isActive = activeCategory === cat.key;
        return (
          <button
            key={cat.key}
            onClick={() => onChange(cat.key)}
            className={`relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 ${
              isActive ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="active-category"
                className="absolute inset-0 bg-primary rounded-lg"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{cat.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
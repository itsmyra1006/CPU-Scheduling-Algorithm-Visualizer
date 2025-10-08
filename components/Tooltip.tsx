import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TooltipProps {
  children: React.ReactNode;
  content: string;
  position?: 'left' | 'right' | 'center';
}

const Tooltip: React.FC<TooltipProps> = ({ children, content, position = 'center' }) => {
  const [isHovered, setIsHovered] = useState(false);

  const positionClasses = {
    center: 'left-1/2 -translate-x-1/2',
    left: 'left-0',
    right: 'right-0',
  };

  return (
    <div
      className="relative" // Changed from w-full to allow natural width
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`absolute bottom-full ${positionClasses[position]} mb-3 w-max max-w-xs p-3 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm rounded-lg shadow-lg dark:shadow-xl shadow-fuchsia-500/20 dark:shadow-fuchsia-400/20 z-10`}
            style={{ pointerEvents: 'none' }}
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Tooltip;

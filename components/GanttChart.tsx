import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GanttEntry } from '../types';

interface GanttChartProps {
  chartData: GanttEntry[];
  totalTime: number;
}

interface ActiveSegment {
  entry: GanttEntry;
  duration: number;
}

const GanttChart: React.FC<GanttChartProps> = ({ chartData, totalTime }) => {
  const [activeSegment, setActiveSegment] = useState<ActiveSegment | null>(null);

  const handleSegmentClick = (entry: GanttEntry) => {
    setActiveSegment({
      entry,
      duration: entry.end - entry.start,
    });
  };

  const handleClose = () => {
    setActiveSegment(null);
  };

  const displayTime = Math.max(totalTime, 1);
  const timestamps = Array.from(new Set([0, ...chartData.map(entry => entry.end)])).sort((a, b) => a - b);

  return (
    <div className="mt-8">
      <h4 className="text-lg font-semibold mb-2 text-slate-700 dark:text-slate-300">Gantt Chart</h4>
      <div className="relative w-full h-10 bg-slate-200 dark:bg-slate-700 rounded overflow-hidden border border-slate-300 dark:border-slate-600">
        {chartData.map((entry, index) => (
          <button
            key={index}
            onClick={() => handleSegmentClick(entry)}
            className={`absolute h-full grid place-items-center text-white text-xs font-bold ${entry.color} hover:opacity-80 transition-opacity duration-200 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 z-10`}
            style={{
              left: `${(entry.start / displayTime) * 100}%`,
              width: `${((entry.end - entry.start) / displayTime) * 100}%`,
              minWidth: '1px',
            }}
            aria-label={`Process ${entry.processName}, from time ${entry.start} to ${entry.end}`}
          >
            <span>{entry.processName}</span>
          </button>
        ))}
      </div>
      <div className="relative w-full h-4 mt-1 text-xs text-slate-500 dark:text-slate-400">
        {timestamps.map(t => (
          <div key={t} className="absolute" style={{ left: `${(t / displayTime) * 100}%`}}>
            <span className="absolute -translate-x-1/2">{t}</span>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {activeSegment && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              className="fixed inset-0 bg-black/30 z-40"
              aria-hidden="true"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 bg-white dark:bg-slate-800 p-6 rounded-lg shadow-2xl z-50 border border-slate-200 dark:border-slate-700"
              role="dialog"
              aria-modal="true"
              aria-labelledby="segment-details-title"
            >
              <h3 id="segment-details-title" className="text-xl font-bold mb-4 flex items-center">
                <span className={`w-4 h-4 rounded-full mr-3 ${activeSegment.entry.color}`}></span>
                <span className={`${activeSegment.entry.color.replace('bg-', 'text-')}`}>{activeSegment.entry.processName}</span>
              </h3>
              <div className="space-y-2 text-slate-600 dark:text-slate-300">
                <p><strong className="font-semibold">Start Time:</strong> {activeSegment.entry.start}</p>
                <p><strong className="font-semibold">End Time:</strong> {activeSegment.entry.end}</p>
                <p><strong className="font-semibold">Duration:</strong> {activeSegment.duration}</p>
              </div>
              <button
                onClick={handleClose}
                className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                aria-label="Close details"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GanttChart;
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { Process } from '../types';

interface PriorityInputModalProps {
  processesToUpdate: Process[];
  onSubmit: (priorities: Map<number, number>) => void;
  onCancel: () => void;
}

const PriorityInputModal: React.FC<PriorityInputModalProps> = ({
  processesToUpdate,
  onSubmit,
  onCancel,
}) => {
  const [priorities, setPriorities] = useState<Map<number, string>>(new Map());
  const [error, setError] = useState<string>('');

  const handleInputChange = (id: number, value: string) => {
    setPriorities(new Map(priorities.set(id, value)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newPriorities = new Map<number, number>();
    let hasError = false;

    for (const process of processesToUpdate) {
      const value = priorities.get(process.id) || '';
      const parsedPriority = parseInt(value, 10);

      if (isNaN(parsedPriority) || !Number.isInteger(parsedPriority) || parsedPriority < 0) {
        setError(`Please enter a valid non-negative integer for ${process.name}.`);
        hasError = true;
        break;
      }
      newPriorities.set(process.id, parsedPriority);
    }

    if (!hasError) {
      setError('');
      onSubmit(newPriorities);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
        className="fixed inset-0 bg-black/50 z-40"
        aria-hidden="true"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-slate-800 p-6 rounded-lg shadow-2xl z-50 border border-slate-200 dark:border-slate-700"
        role="dialog"
        aria-modal="true"
        aria-labelledby="priority-modal-title"
      >
        <h2 id="priority-modal-title" className="text-2xl font-bold mb-4 text-fuchsia-600 dark:text-fuchsia-400">
          Missing Priorities
        </h2>
        <p className="mb-6 text-slate-600 dark:text-slate-300">
          A priority-based algorithm was selected. Please provide a priority for the following processes (lower number = higher priority).
        </p>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
            {processesToUpdate.map(p => (
              <div key={p.id} className="flex items-center gap-4">
                <label htmlFor={`priority-${p.id}`} className="font-semibold w-20">
                  <span className={`${p.color.replace('bg-', 'text-')} font-bold`}>{p.name}</span>
                </label>
                <input
                  id={`priority-${p.id}`}
                  type="number"
                  value={priorities.get(p.id) || ''}
                  onChange={e => handleInputChange(p.id, e.target.value)}
                  placeholder="e.g., 1"
                  min="0"
                  required
                  autoFocus={processesToUpdate[0].id === p.id}
                  className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md py-2 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 outline-none"
                />
              </div>
            ))}
          </div>
          {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
          <div className="mt-8 flex justify-end gap-4">
            <button
              type="button"
              onClick={onCancel}
              className="py-2 px-4 rounded-md text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="py-2 px-4 rounded-md text-white font-semibold bg-fuchsia-600 hover:bg-fuchsia-700"
            >
              Run Simulation
            </button>
          </div>
        </form>
      </motion.div>
    </>
  );
};

export default PriorityInputModal;
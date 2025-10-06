import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import type { Process } from '../types';
import Tooltip from './Tooltip';

interface InputSectionProps {
  onAddProcess: (arrivalTime: number, burstTime: number, priority: number | null) => boolean;
  onRemoveProcess: (id: number) => void;
  onReorderProcesses: (processes: Process[]) => void;
  onReset: () => void;
  onCompareAll: () => void;
  onSimulateFCFS: () => void;
  onSimulateSJF: () => void;
  onSimulateSRTF: () => void;
  onSimulatePriorityNP: () => void;
  onSimulatePriorityP: () => void;
  onSimulateRR: () => void;
  timeQuantum: number;
  onTimeQuantumChange: (tq: number) => void;
  processes: Process[];
  isSimulating: boolean;
}

const FCFS_DESC = "First-Come, First-Served: Processes run in arrival order. Simple & fair, but can be slow.";
const SJF_DESC = "Shortest Job First (Non-Preemptive): The shortest available job runs next. Efficient, but can starve long jobs.";
const SRTF_DESC = "Shortest Remaining Time First (Preemptive): CPU switches to a new, shorter job if one arrives. Optimal for average wait time.";
const PRIORITY_NP_DESC = "Priority (Non-Preemptive): The highest priority job runs next. Important jobs finish fast. (Lower number = higher priority).";
const PRIORITY_P_DESC = "Priority (Preemptive): A new higher-priority job can interrupt the current one. Ensures urgent tasks are handled immediately.";
const RR_DESC = "Round Robin: Each process gets a fixed time slice (quantum). Ensures fairness and responsiveness.";


const InputSection: React.FC<InputSectionProps> = ({
  onAddProcess,
  onRemoveProcess,
  onReorderProcesses,
  onReset,
  onCompareAll,
  onSimulateFCFS,
  onSimulateSJF,
  onSimulateSRTF,
  onSimulatePriorityNP,
  onSimulatePriorityP,
  onSimulateRR,
  timeQuantum,
  onTimeQuantumChange,
  processes,
  isSimulating,
}) => {
  const [arrivalTime, setArrivalTime] = useState('');
  const [burstTime, setBurstTime] = useState('');
  const [priority, setPriority] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const at = parseInt(arrivalTime, 10);
    const bt = parseInt(burstTime, 10);
    const p = priority === '' ? null : parseInt(priority, 10);
    
    if (onAddProcess(at, bt, p)) {
      setArrivalTime('');
      setBurstTime('');
      setPriority('');
    }
  };
  
  const SimulatingSpinner = () => (
    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md flex flex-col gap-6 h-full">
        <div>
          <h2 className="text-2xl font-bold mb-4 text-fuchsia-600 dark:text-fuchsia-400">Controls & Inputs</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="arrivalTime" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Arrival Time</label>
                <input
                  id="arrivalTime"
                  type="number"
                  value={arrivalTime}
                  onChange={e => setArrivalTime(e.target.value)}
                  placeholder="e.g., 0"
                  min="0"
                  required
                  className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md py-2 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 outline-none"
                />
              </div>
              <div>
                <label htmlFor="burstTime" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Burst Time</label>
                <input
                  id="burstTime"
                  type="number"
                  value={burstTime}
                  onChange={e => setBurstTime(e.target.value)}
                  placeholder="e.g., 5"
                  min="1"
                  required
                  className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md py-2 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 outline-none"
                />
              </div>
               <div>
                <label htmlFor="priority" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Priority (Optional)</label>
                <input
                  id="priority"
                  type="number"
                  value={priority}
                  onChange={e => setPriority(e.target.value)}
                  placeholder="e.g., 2"
                  min="0"
                  className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md py-2 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 outline-none"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full bg-fuchsia-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-fuchsia-700 dark:hover:bg-fuchsia-500 transition duration-200 disabled:bg-slate-400 dark:disabled:bg-slate-600 active:scale-95"
              disabled={isSimulating}
            >
              Add Process
            </button>
          </form>

          {processes.length > 0 && (
            <div className="mt-6">
                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">Process List</h3>
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-md">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 dark:bg-slate-700/50">
                            <tr>
                                <th className="p-2 w-10 text-center text-slate-500 dark:text-slate-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block" viewBox="0 0 20 20" fill="currentColor"><path d="M5 12a1 1 0 102 0V6.414l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L5 6.414V12zM15 8a1 1 0 10-2 0v5.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L15 13.586V8z" /></svg>
                                </th>
                                <th className="p-2 font-semibold text-slate-600 dark:text-slate-300">ID</th>
                                <th className="p-2 font-semibold text-slate-600 dark:text-slate-300">Arrival</th>
                                <th className="p-2 font-semibold text-slate-600 dark:text-slate-300">Burst</th>
                                <th className="p-2 font-semibold text-slate-600 dark:text-slate-300">Priority</th>
                                <th className="p-2 font-semibold text-slate-600 dark:text-slate-300"></th>
                            </tr>
                        </thead>
                        <Reorder.Group as="tbody" values={processes} onReorder={onReorderProcesses}>
                          <AnimatePresence>
                              {processes.map(p => (
                                  <Reorder.Item 
                                    as="tr"
                                    key={p.id}
                                    value={p}
                                    layout
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
                                    className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                                    style={{ cursor: isSimulating ? 'not-allowed' : 'grab' }}
                                  >
                                      <td className="p-2 text-center text-slate-400 dark:text-slate-500">
                                        {!isSimulating && (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" />
                                            </svg>
                                        )}
                                      </td>
                                      <td className={`p-2 font-bold ${p.color.replace('bg-', 'text-')}`}>{p.name}</td>
                                      <td className="p-2">{p.arrivalTime}</td>
                                      <td className="p-2">{p.burstTime}</td>
                                      <td className="p-2">{p.priority ?? 'N/A'}</td>
                                      <td className="p-2 text-right">
                                          <button onClick={() => onRemoveProcess(p.id)} className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 text-xs font-semibold" disabled={isSimulating}>Remove</button>
                                      </td>
                                  </Reorder.Item>
                              ))}
                          </AnimatePresence>
                        </Reorder.Group>
                    </table>
                </div>
            </div>
          )}

          <div className="mt-6">
            <label htmlFor="timeQuantum" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Round Robin Time Quantum</label>
            <input
              id="timeQuantum"
              type="number"
              value={timeQuantum}
              onChange={e => onTimeQuantumChange(Math.max(1, parseInt(e.target.value, 10) || 1))}
              min="1"
              className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md py-2 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 outline-none"
            />
          </div>
        </div>
      
        <div className="space-y-4 pt-6 border-t border-slate-200 dark:border-slate-700">
             <h3 className="text-lg font-semibold text-center text-slate-700 dark:text-slate-200">Run Live Simulation</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Tooltip content={FCFS_DESC} position="left">
                    <button onClick={onSimulateFCFS} disabled={isSimulating || processes.length === 0} className="w-full bg-violet-600 hover:bg-violet-700 dark:hover:bg-violet-500 text-white font-bold py-2 px-4 rounded-md transition duration-200 disabled:bg-slate-400 dark:disabled:bg-slate-600 flex items-center justify-center gap-2 active:scale-95">FCFS</button>
                </Tooltip>
                <Tooltip content={SJF_DESC} position="right">
                    <button onClick={onSimulateSJF} disabled={isSimulating || processes.length === 0} className="w-full bg-violet-600 hover:bg-violet-700 dark:hover:bg-violet-500 text-white font-bold py-2 px-4 rounded-md transition duration-200 disabled:bg-slate-400 dark:disabled:bg-slate-600 flex items-center justify-center gap-2 active:scale-95">SJF (NP)</button>
                </Tooltip>
                <Tooltip content={SRTF_DESC} position="left">
                    <button onClick={onSimulateSRTF} disabled={isSimulating || processes.length === 0} className="w-full bg-violet-600 hover:bg-violet-700 dark:hover:bg-violet-500 text-white font-bold py-2 px-4 rounded-md transition duration-200 disabled:bg-slate-400 dark:disabled:bg-slate-600 flex items-center justify-center gap-2 active:scale-95">SRTF (P)</button>
                </Tooltip>
                <Tooltip content={PRIORITY_NP_DESC} position="right">
                    <button onClick={onSimulatePriorityNP} disabled={isSimulating || processes.length === 0} className="w-full bg-violet-600 hover:bg-violet-700 dark:hover:bg-violet-500 text-white font-bold py-2 px-4 rounded-md transition duration-200 disabled:bg-slate-400 dark:disabled:bg-slate-600 flex items-center justify-center gap-2 active:scale-95">Priority (NP)</button>
                </Tooltip>
                <Tooltip content={PRIORITY_P_DESC} position="left">
                    <button onClick={onSimulatePriorityP} disabled={isSimulating || processes.length === 0} className="w-full bg-violet-600 hover:bg-violet-700 dark:hover:bg-violet-500 text-white font-bold py-2 px-4 rounded-md transition duration-200 disabled:bg-slate-400 dark:disabled:bg-slate-600 flex items-center justify-center gap-2 active:scale-95">Priority (P)</button>
                </Tooltip>
                <Tooltip content={RR_DESC} position="right">
                    <button onClick={onSimulateRR} disabled={isSimulating || processes.length === 0} className="w-full bg-violet-600 hover:bg-violet-700 dark:hover:bg-violet-500 text-white font-bold py-2 px-4 rounded-md transition duration-200 disabled:bg-slate-400 dark:disabled:bg-slate-600 flex items-center justify-center gap-2 active:scale-95">Round Robin</button>
                </Tooltip>
            </div>
             <div className="mt-4 space-y-4">
                <button onClick={onCompareAll} disabled={isSimulating || processes.length === 0} className="w-full bg-indigo-600 hover:bg-indigo-700 dark:hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-md transition duration-200 disabled:bg-slate-400 dark:disabled:bg-slate-600 flex items-center justify-center gap-2 active:scale-95"> {isSimulating && <SimulatingSpinner/>} Compare All</button>
                <button onClick={onReset} disabled={isSimulating} className="w-full bg-rose-600 hover:bg-rose-700 dark:hover:bg-rose-500 text-white font-bold py-2 px-4 rounded-md transition duration-200 disabled:bg-slate-400 dark:disabled:bg-slate-600 active:scale-95">Reset All</button>
             </div>
        </div>
    </div>
  );
};

export default InputSection;

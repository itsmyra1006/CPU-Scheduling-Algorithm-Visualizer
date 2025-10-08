import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Process, GanttEntry, ProcessState } from '../types';
import { LiveSimulationState } from '../App';
import GanttChart from './GanttChart';

interface ResultsTableProps {
  processes: Process[];
}

const ResultsTable: React.FC<ResultsTableProps> = ({ processes }) => (
  <div className="mt-4 overflow-x-auto">
    <table className="w-full text-sm text-left">
      <thead className="bg-slate-100 dark:bg-slate-700/50 border-b-2 border-slate-300 dark:border-slate-600">
        <tr>
          <th className="p-2 font-semibold text-slate-600 dark:text-slate-300">ID</th>
          <th className="p-2 font-semibold text-slate-600 dark:text-slate-300">AT</th>
          <th className="p-2 font-semibold text-slate-600 dark:text-slate-300">BT</th>
          <th className="p-2 font-semibold text-slate-600 dark:text-slate-300">CT</th>
          <th className="p-2 font-semibold text-slate-600 dark:text-slate-300">TAT</th>
          <th className="p-2 font-semibold text-slate-600 dark:text-slate-300">WT</th>
        </tr>
      </thead>
      <tbody>
        {processes.sort((a,b) => a.id - b.id).map(p => (
          <tr key={p.id} className="border-b border-slate-200 dark:border-slate-700">
            <td className={`p-2 font-bold ${p.color.replace('bg-', 'text-')}`}>{p.name}</td>
            <td className="p-2">{p.arrivalTime}</td>
            <td className="p-2">{p.burstTime}</td>
            <td className="p-2">{p.completionTime}</td>
            <td className="p-2">{p.turnaroundTime}</td>
            <td className="p-2">{p.waitingTime}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const stateStyles: Record<ProcessState, string> = {
    'running': 'bg-pink-200 text-pink-800 border-pink-300 dark:bg-pink-900/50 dark:text-pink-300 dark:border-pink-700',
    'waiting': 'bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-600 dark:text-slate-100 dark:border-slate-500',
    'completed': 'bg-fuchsia-200 text-fuchsia-800 border-fuchsia-300 dark:bg-fuchsia-900/50 dark:text-fuchsia-300 dark:border-fuchsia-700',
    'not arrived': 'bg-white text-slate-400 border-slate-200 dark:bg-slate-700/50 dark:text-slate-400 dark:border-slate-600',
};

const StateBadge: React.FC<{ state: ProcessState }> = ({ state }) => (
    <span className={`px-2 py-1 text-xs font-semibold rounded-full border transition-all duration-300 ${stateStyles[state]}`}>
        {state}
    </span>
);

const ProgressBar: React.FC<{ progress: number; color: string }> = ({ progress, color }) => (
    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
        <div className={`${color} h-2.5 rounded-full transition-all duration-300 ease-in-out`} style={{ width: `${progress}%` }}></div>
    </div>
);

const ProcessQueueTable: React.FC<{ processes: Process[], runningProcessName: string | null }> = ({ processes, runningProcessName }) => (
    <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm text-left">
            <thead className="border-b-2 border-slate-200 dark:border-slate-700">
                <tr>
                    {['Process', 'Arrival', 'Burst', 'Priority', 'Remaining', 'State', 'Progress'].map(header => (
                         <th key={header} className="p-3 font-semibold text-fuchsia-800 dark:text-fuchsia-400 tracking-wider">{header}</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {processes.sort((a,b) => a.id - b.id).map(p => {
                    const progress = p.burstTime > 0 ? ((p.burstTime - p.remainingTime) / p.burstTime) * 100 : 100;
                    return (
                        <tr key={p.id} className={`border-b border-slate-200 dark:border-slate-700 transition-colors duration-300 ${p.name === runningProcessName ? 'bg-pink-50 dark:bg-pink-900/20' : ''}`}>
                            <td className={`p-3 font-bold ${p.color.replace('bg-', 'text-')}`}>{p.name}</td>
                            <td className="p-3">{p.arrivalTime}</td>
                            <td className="p-3">{p.burstTime}</td>
                            <td className="p-3">{p.priority ?? 'N/A'}</td>
                            <td className="p-3">{p.remainingTime}</td>
                            <td className="p-3"><StateBadge state={p.state} /></td>
                            <td className="p-3"><ProgressBar progress={progress} color={p.color} /></td>
                        </tr>
                    )
                })}
            </tbody>
        </table>
    </div>
);


const SchedulerLog: React.FC<{ log: string[] }> = ({ log }) => {
    const logEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [log]);

    return (
        <div className="mt-8">
            <h3 className="text-xl font-bold text-fuchsia-700 dark:text-fuchsia-400">Scheduler Log</h3>
            <div className="mt-2 h-48 overflow-y-auto bg-slate-100 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700 font-mono text-sm">
                <AnimatePresence>
                    {log.map((entry, index) => (
                        <motion.p
                            key={index}
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="mb-1 text-slate-700 dark:text-slate-300"
                        >
                            {entry}
                        </motion.p>
                    ))}
                </AnimatePresence>
                <div ref={logEndRef} />
            </div>
        </div>
    );
};


const AnimatedText: React.FC<{ text: string | number, className?: string }> = ({ text, className }) => (
  <AnimatePresence mode="wait">
    <motion.span
      key={text}
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 5 }}
      transition={{ duration: 0.2 }}
      className={`inline-block ${className}`}
    >
      {text}
    </motion.span>
  </AnimatePresence>
);

interface LiveSimulationDisplayProps {
  state: LiveSimulationState;
  isSimulating: boolean;
  isPaused: boolean;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

const LiveSimulationDisplay: React.FC<LiveSimulationDisplayProps> = ({ state, isSimulating, isPaused, onPause, onResume, onStop }) => {
  const { algorithmName, time, runningProcessName, readyQueue, ganttChart, processes, eventLog } = state;
  const runningProcess = processes.find(p => p.name === runningProcessName);

  // **FIXED**: Calculate averages based on all processes once simulation is complete, not just 'completed' ones.
  const processesForFinalCalc = !isSimulating ? processes : processes.filter(p => p.state === 'completed');
  const totalWaitingTime = processesForFinalCalc.reduce((acc, p) => acc + p.waitingTime, 0);
  const totalTurnaroundTime = processesForFinalCalc.reduce((acc, p) => acc + p.turnaroundTime, 0);
  const avgWaitingTime = processesForFinalCalc.length > 0 ? totalWaitingTime / processesForFinalCalc.length : 0;
  const avgTurnaroundTime = processesForFinalCalc.length > 0 ? totalTurnaroundTime / processesForFinalCalc.length : 0;

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
      <div className="text-center mb-4">
         <h2 className="text-2xl font-bold text-fuchsia-600 dark:text-fuchsia-400">{algorithmName}</h2>
         <p className="text-slate-500 dark:text-slate-400">
            {isSimulating ? `Live Simulation ${isPaused ? '(Paused)' : ''}` : 'Simulation Complete'}
         </p>
      </div>

      <div className="mb-6 p-3 bg-slate-100 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-center gap-4">
        {!isPaused && isSimulating && (
            <button onClick={onPause} className="bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2 px-4 rounded-md transition duration-200 active:scale-95 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 002 0V8a1 1 0 00-1-1zm4 0a1 1 0 00-1 1v4a1 1 0 002 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                Pause
            </button>
        )}
        {isPaused && (
            <button onClick={onResume} className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-semibold py-2 px-4 rounded-md transition duration-200 active:scale-95 flex items-center gap-2">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                Resume
            </button>
        )}
         <button onClick={onStop} className="bg-rose-600 hover:bg-rose-700 text-white font-semibold py-2 px-4 rounded-md transition duration-200 active:scale-95 flex items-center gap-2">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 9a1 1 0 00-1 1v1a1 1 0 002 0v-1a1 1 0 00-1-1zm4 0a1 1 0 00-1 1v1a1 1 0 002 0v-1a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
            Stop
        </button>
      </div>
      
      {/* Status Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center my-6">
        <div className="bg-slate-100 dark:bg-slate-700/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
          <p className="text-sm text-slate-500 dark:text-slate-400">Current Time</p>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-200 h-8 flex items-center justify-center">
            <AnimatedText text={time} />
          </p>
        </div>
        <div className="bg-slate-100 dark:bg-slate-700/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
          <p className="text-sm text-slate-500 dark:text-slate-400">CPU</p>
           <div className="text-2xl font-bold h-8 flex items-center justify-center">
            <AnimatedText text={runningProcess ? runningProcess.name : 'Idle'} className={runningProcess ? runningProcess.color.replace('bg-', 'text-') : 'text-slate-800 dark:text-slate-200'} />
           </div>
        </div>
        <div className="bg-slate-100 dark:bg-slate-700/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
          <p className="text-sm text-slate-500 dark:text-slate-400">Ready Queue</p>
          <p className="text-xl font-bold truncate h-8 pt-1 text-slate-800 dark:text-slate-200">
            {readyQueue.length > 0 ? readyQueue.map(p => p.name).join(', ') : 'Empty'}
          </p>
        </div>
      </div>

      <div>
        <h3 className="text-xl font-bold text-fuchsia-700 dark:text-fuchsia-400">Process Status</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Current state of all processes</p>
        <ProcessQueueTable processes={processes} runningProcessName={runningProcessName} />
      </div>

      <GanttChart chartData={ganttChart} totalTime={time} />
      
      {eventLog && eventLog.length > 0 && <SchedulerLog log={eventLog} />}

      {!isSimulating && (
        <div className="mt-8 pt-6 border-t-2 border-slate-200 dark:border-slate-700">
            <h3 className="text-xl font-bold text-center text-fuchsia-700 dark:text-fuchsia-400 mb-4">Final Results</h3>
            <ResultsTable processes={processes} />
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 text-center">
                <div className="inline-grid grid-cols-[auto_auto] gap-x-4 gap-y-1">
                    <span className="font-semibold text-slate-600 dark:text-slate-300 text-right">Avg. Waiting Time:</span>
                    <span className="text-left">{avgWaitingTime.toFixed(2)}</span>
                    <span className="font-semibold text-slate-600 dark:text-slate-300 text-right">Avg. Turnaround Time:</span>
                    <span className="text-left">{avgTurnaroundTime.toFixed(2)}</span>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default LiveSimulationDisplay;


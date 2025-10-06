import React from 'react';
import type { AlgorithmResult, Process } from '../types';
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


interface OutputSectionProps {
  results: AlgorithmResult[];
}

const OutputSection: React.FC<OutputSectionProps> = ({ results }) => (
  <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
    <h2 className="text-3xl font-bold text-center mb-4 text-fuchsia-600 dark:text-fuchsia-400">Comparison Results</h2>
    <div className="space-y-10">
      {results.map(result => (
        <div key={result.name}>
          <h3 className="text-2xl font-bold mb-2 text-slate-800 dark:text-slate-200">{result.name}</h3>
          <GanttChart chartData={result.ganttChart} totalTime={result.totalTime} />
          <div className="mt-6 flex-grow">
            <ResultsTable processes={result.processes} />
          </div>
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 text-center">
            <p><span className="font-semibold text-slate-600 dark:text-slate-300">Avg. Waiting Time:</span> {result.avgWaitingTime.toFixed(2)}</p>
            <p><span className="font-semibold text-slate-600 dark:text-slate-300">Avg. Turnaround Time:</span> {result.avgTurnaroundTime.toFixed(2)}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default OutputSection;
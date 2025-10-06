import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Process, AlgorithmResult, GanttEntry } from './types';
import { PROCESS_COLORS } from './constants';
import { 
  runFCFS, runSJF, runSRTF, runRoundRobin, runPriorityNonPreemptive, runPriorityPreemptive,
  simulateFCFS, simulateSJF, simulateSRTF, simulateRoundRobin, simulatePriorityNonPreemptive, simulatePriorityPreemptive 
} from './services/schedulingAlgorithms';
import InputSection from './components/InputSection';
import OutputSection from './components/OutputSection';
import LiveSimulationDisplay from './components/LiveSimulationDisplay';
import PriorityInputModal from './components/PriorityInputModal';

type ViewMode = 'idle' | 'live' | 'comparison';
type Theme = 'light' | 'dark';

export interface LiveSimulationState {
  algorithmName: string;
  time: number;
  runningProcessName: string | null;
  readyQueue: Process[];
  ganttChart: GanttEntry[];
  processes: Process[]; // Now tracks the state of ALL processes
  eventLog: string[];
}

interface PriorityRequest {
  processesToUpdate: Process[];
  onComplete: (updatedProcesses: Process[]) => void;
  onCancel: () => void;
}

const App: React.FC = () => {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [timeQuantum, setTimeQuantum] = useState<number>(3);
  const [comparisonResults, setComparisonResults] = useState<AlgorithmResult[] | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>('idle');
  const [simulationState, setSimulationState] = useState<LiveSimulationState | null>(null);
  const [isPresentationMode, setIsPresentationMode] = useState<boolean>(false);
  const [priorityRequest, setPriorityRequest] = useState<PriorityRequest | null>(null);
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const storedTheme = window.localStorage.getItem('theme') as Theme;
      if (storedTheme) return storedTheme;
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    }
    return 'light';
  });

  const simulationTimerRef = useRef<number | null>(null);
  const simulationGeneratorRef = useRef<Generator | null>(null);
  const simulationStepRef = useRef<(() => void) | null>(null);
  
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);


  const cleanupSimulation = () => {
    if (simulationTimerRef.current) {
      clearTimeout(simulationTimerRef.current);
    }
    simulationTimerRef.current = null;
    simulationGeneratorRef.current = null;
    simulationStepRef.current = null;
    setIsSimulating(false);
    setIsPaused(false);
  };
  
  const handleAddProcess = useCallback((arrivalTime: number, burstTime: number, priority: number | null) => {
    setError('');

    if (isNaN(arrivalTime) || isNaN(burstTime)) {
      setError("Arrival and Burst Time must be valid integers.");
      return false;
    }
    
    if (arrivalTime < 0 || !Number.isInteger(arrivalTime)) {
      setError("Arrival Time must be a non-negative integer.");
      return false;
    }

    if (burstTime <= 0 || !Number.isInteger(burstTime)) {
      setError("Burst Time must be a positive integer.");
      return false;
    }
    
    if (priority !== null && (isNaN(priority) || priority < 0 || !Number.isInteger(priority))) {
      setError("Priority must be a valid non-negative integer if provided.");
      return false;
    }

    setProcesses(prev => {
      const newId = prev.length > 0 ? Math.max(...prev.map(p => p.id)) + 1 : 1;
      const newProcess: Process = {
        id: newId,
        name: `P${newId}`,
        arrivalTime,
        burstTime,
        priority,
        remainingTime: burstTime,
        color: PROCESS_COLORS[(newId - 1) % PROCESS_COLORS.length],
        completionTime: 0,
        turnaroundTime: 0,
        waitingTime: 0,
        state: 'not arrived',
      };
      return [...prev, newProcess];
    });
    return true;
  }, []);

  const handleRemoveProcess = useCallback((idToRemove: number) => {
    setProcesses(prev => prev.filter(p => p.id !== idToRemove));
  }, []);

  const handleReorderProcesses = useCallback((reorderedProcesses: Process[]) => {
    setProcesses(reorderedProcesses);
  }, []);

  const handleReset = useCallback(() => {
    cleanupSimulation();
    setProcesses([]);
    setComparisonResults(null);
    setError('');
    setViewMode('idle');
    setSimulationState(null);
    setIsPresentationMode(false);
  }, []);

  const checkPrioritiesAndRun = useCallback((simulationFn: (procs: Process[]) => void) => {
    const processesWithoutPriority = processes.filter(p => p.priority === null);
    
    if (processesWithoutPriority.length > 0) {
      setPriorityRequest({
        processesToUpdate: processesWithoutPriority,
        onComplete: (completedProcesses) => {
          setProcesses(completedProcesses);
          simulationFn(completedProcesses);
        },
        onCancel: () => setPriorityRequest(null),
      });
    } else {
      simulationFn(processes);
    }
  }, [processes]);

  const handlePrioritySubmit = (priorities: Map<number, number>) => {
    if (!priorityRequest) return;

    const updatedProcesses = processes.map(p => {
        if (priorities.has(p.id)) {
            const newPriority = priorities.get(p.id)!;
            if (newPriority >= 0 && Number.isInteger(newPriority)) {
                return { ...p, priority: newPriority };
            }
        }
        return p;
    });

    const callback = priorityRequest.onComplete;
    setPriorityRequest(null); // Close modal FIRST
    callback(updatedProcesses); // Then run the simulation
  };
  
  const handlePriorityCancel = () => {
    setPriorityRequest(null);
  };


  const handleCompareAll = useCallback(() => {
    if (processes.length === 0) {
      setError("Please add at least one process.");
      return;
    }
    
    checkPrioritiesAndRun((procsWithPriorities) => {
      cleanupSimulation();
      setError('');
      setIsSimulating(true);
      setViewMode('comparison');
      setSimulationState(null);
      setIsPresentationMode(true);
      
      setTimeout(() => {
        const fcfsResult = runFCFS(procsWithPriorities);
        const sjfResult = runSJF(procsWithPriorities);
        const srtfResult = runSRTF(procsWithPriorities);
        const priorityNPResult = runPriorityNonPreemptive(procsWithPriorities);
        const priorityPResult = runPriorityPreemptive(procsWithPriorities);
        const rrResult = runRoundRobin(procsWithPriorities, timeQuantum);
        
        setComparisonResults([fcfsResult, sjfResult, srtfResult, priorityNPResult, priorityPResult, rrResult]);
        setIsSimulating(false);
      }, 500);
    });

  }, [processes, timeQuantum, checkPrioritiesAndRun]);

  const runLiveSimulation = useCallback((
    algorithmGeneratorFactory: (procs: Process[], ...args: any[]) => Generator | undefined, 
    algorithmName: string
  ) => {
      if (processes.length === 0) {
        setError("Please add at least one process.");
        return;
      }
      
      const run = (procs: Process[]) => {
          const generator = algorithmName.includes("Robin")
            ? (algorithmGeneratorFactory as (p: Process[], tq: number) => Generator)(procs, timeQuantum)
            : algorithmGeneratorFactory(procs);

          if (!generator) return;

          cleanupSimulation();
          setError('');
          setViewMode('live');
          setComparisonResults(null);
          setIsSimulating(true);
          setIsPaused(false);
          setIsPresentationMode(true);
          
          simulationGeneratorRef.current = generator;

          const initialSimState: LiveSimulationState = {
            algorithmName,
            time: 0,
            runningProcessName: null,
            readyQueue: [],
            ganttChart: [],
            processes: JSON.parse(JSON.stringify(procs)).map((p: Process) => ({...p, state: 'not arrived'})),
            eventLog: [],
          };

          setSimulationState(initialSimState);

          const step = () => {
            if (!simulationGeneratorRef.current) return;
            const { value, done } = simulationGeneratorRef.current.next();
            
            if (done) {
              cleanupSimulation();
              return;
            }
            
            const { time, runningProcess, processes: updatedProcesses, readyQueue, eventMessage } = value;

            setSimulationState(prevState => {
              if (!prevState) return null;

              const newGanttChart = [...prevState.ganttChart];

              if (runningProcess) {
                const lastEntry = newGanttChart[newGanttChart.length - 1];
                if (lastEntry && lastEntry.processName === runningProcess.name && lastEntry.end === time) {
                  lastEntry.end = time + 1;
                } else {
                  newGanttChart.push({
                    processName: runningProcess.name,
                    color: runningProcess.color,
                    start: time,
                    end: time + 1,
                  });
                }
              }
              
              const newLog = eventMessage ? [...prevState.eventLog, `[Time ${time}]: ${eventMessage}`] : prevState.eventLog;

              return {
                ...prevState,
                time: time + 1,
                runningProcessName: runningProcess?.name ?? null,
                readyQueue,
                ganttChart: newGanttChart,
                processes: updatedProcesses,
                eventLog: newLog,
              };
            });

            simulationTimerRef.current = window.setTimeout(step, 750);
          };
          
          simulationStepRef.current = step;
          step();
      }

      if (algorithmName.includes("Priority")) {
          checkPrioritiesAndRun(run);
      } else {
          run(processes);
      }
  }, [timeQuantum, processes, checkPrioritiesAndRun]);

  const handlePauseLiveSimulation = useCallback(() => {
    if (simulationTimerRef.current) {
        clearTimeout(simulationTimerRef.current);
        simulationTimerRef.current = null;
        setIsPaused(true);
    }
  }, []);

  const handleResumeLiveSimulation = useCallback(() => {
    setIsPaused(false);
    if (simulationStepRef.current) {
      simulationStepRef.current();
    }
  }, []);
  
  const handleStopLiveSimulation = useCallback(() => {
      cleanupSimulation();
      setViewMode('idle');
      setSimulationState(null);
      setIsPresentationMode(false);
  }, []);

  const handleExitPresentationMode = useCallback(() => {
    setIsPresentationMode(false);
  }, []);
  
  const toggleTheme = useCallback(() => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  }, []);

  return (
    <div className={`min-h-screen container mx-auto font-sans transition-all duration-300 ${isPresentationMode ? 'p-0 sm:p-0 lg:p-0 max-w-full' : 'p-4 sm:p-6 lg:p-8'}`}>
      <AnimatePresence>
        {!isPresentationMode && (
           <motion.header 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center mb-8"
           >
            <h1 className="text-4xl sm:text-5xl font-bold text-fuchsia-600 dark:text-fuchsia-400 tracking-tight">
              CPU Scheduling Visualizer
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-2xl mx-auto">
              Simulate or compare FCFS, SJF, SRTF, Priority, and Round Robin algorithms.
            </p>
          </motion.header>
        )}
      </AnimatePresence>
      
      <main className={`grid grid-cols-1 transition-all duration-500 ease-in-out ${isPresentationMode ? 'xl:grid-cols-[0px_1fr] gap-0' : 'xl:grid-cols-[480px_1fr] gap-8'}`}>
        <motion.div layout className={`transition-opacity duration-300 ${isPresentationMode ? 'opacity-0' : 'opacity-100'}`} style={{overflow: 'hidden'}}>
            <InputSection 
              onAddProcess={handleAddProcess}
              onRemoveProcess={handleRemoveProcess}
              onReorderProcesses={handleReorderProcesses}
              onReset={handleReset}
              onCompareAll={handleCompareAll}
              onSimulateFCFS={() => runLiveSimulation(simulateFCFS, "First-Come, First-Served")}
              onSimulateSJF={() => runLiveSimulation(simulateSJF, "Non-Preemptive SJF")}
              onSimulateSRTF={() => runLiveSimulation(simulateSRTF, "Preemptive SJF (SRTF)")}
              onSimulatePriorityNP={() => runLiveSimulation(simulatePriorityNonPreemptive, "Non-Preemptive Priority")}
              onSimulatePriorityP={() => runLiveSimulation(simulatePriorityPreemptive, "Preemptive Priority")}
              onSimulateRR={() => runLiveSimulation(simulateRoundRobin, "Round Robin")}
              timeQuantum={timeQuantum}
              onTimeQuantumChange={setTimeQuantum}
              processes={processes}
              isSimulating={isSimulating}
            />
            {error && <p className="text-center text-red-500 mt-4 font-semibold">{error}</p>}
        </motion.div>

        <div className="relative">
             <AnimatePresence>
              {priorityRequest && (
                <PriorityInputModal 
                  processesToUpdate={priorityRequest.processesToUpdate}
                  onSubmit={handlePrioritySubmit}
                  onCancel={handlePriorityCancel}
                />
              )}
            </AnimatePresence>
            <AnimatePresence mode="wait">
              {viewMode === 'idle' && (
                  <motion.div 
                    key="idle"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex items-center justify-center h-full bg-white dark:bg-slate-800 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700"
                  >
                      <p className="text-slate-500 dark:text-slate-400 text-lg">Simulation output will appear here</p>
                  </motion.div>
              )}
              {viewMode === 'live' && simulationState && (
                <motion.div
                  key="live"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <LiveSimulationDisplay 
                    state={simulationState} 
                    isSimulating={isSimulating}
                    isPaused={isPaused}
                    onPause={handlePauseLiveSimulation}
                    onResume={handleResumeLiveSimulation}
                    onStop={handleStopLiveSimulation}
                  />
                </motion.div>
              )}
              {viewMode === 'comparison' && comparisonResults && (
                 <motion.div
                  key="comparison"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <OutputSection results={comparisonResults} />
                </motion.div>
              )}
            </AnimatePresence>
        </div>
      </main>
      
      <AnimatePresence>
       {!isPresentationMode && (
          <motion.footer 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="text-center mt-12 text-slate-500 dark:text-slate-400 text-sm"
          >
            <p>Built with React, TypeScript, and Tailwind CSS.</p>
          </motion.footer>
        )}
      </AnimatePresence>

      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 z-50 p-3 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-full text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 hover:text-fuchsia-600 dark:hover:text-fuchsia-400 transition-all shadow-lg active:scale-95"
        title="Toggle Theme"
        aria-label="Toggle light and dark theme"
      >
        {theme === 'light' ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        )}
      </button>

      <AnimatePresence>
        {isPresentationMode && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            onClick={handleExitPresentationMode}
            disabled={isSimulating}
            className="fixed top-4 left-4 z-50 p-3 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-full text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 hover:text-fuchsia-600 dark:hover:text-fuchsia-400 transition-all shadow-lg disabled:opacity-50 active:scale-95"
            title="Edit Inputs"
            aria-label="Exit presentation mode and return to inputs"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
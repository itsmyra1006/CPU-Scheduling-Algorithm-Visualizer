import type { Process, AlgorithmResult, GanttEntry } from '../types';

// Helper to deep clone processes to ensure each algorithm runs on a fresh dataset
const cloneProcesses = (processes: Process[]): Process[] => {
  return JSON.parse(JSON.stringify(processes));
};

// Helper for empty process list case
const createEmptyResult = (name: string): AlgorithmResult => ({
  name,
  ganttChart: [],
  processes: [],
  avgWaitingTime: 0,
  avgTurnaroundTime: 0,
  totalTime: 0,
});

// Helper to build a compressed Gantt chart from a timeline
const buildGanttChart = (timeline: ({ processName: string, color: string } | null)[]): GanttEntry[] => {
  const ganttChart: GanttEntry[] = [];
  if (timeline.length === 0) return ganttChart;

  let currentEntry: GanttEntry | null = null;

  for (let i = 0; i < timeline.length; i++) {
    const currentProcess = timeline[i];
    if (currentProcess) {
      if (!currentEntry || currentEntry.processName !== currentProcess.processName) {
        if (currentEntry) {
          ganttChart.push(currentEntry);
        }
        currentEntry = {
          processName: currentProcess.processName,
          color: currentProcess.color,
          start: i,
          end: i + 1,
        };
      } else {
        currentEntry.end = i + 1;
      }
    } else { // Idle time
        if (currentEntry) {
            ganttChart.push(currentEntry);
            currentEntry = null;
        }
    }
  }

  if (currentEntry) {
    ganttChart.push(currentEntry);
  }

  return ganttChart;
};

// --- BATCH ALGORITHMS FOR "COMPARE ALL" ---

export const runFCFS = (processes: Process[]): AlgorithmResult => {
  if (processes.length === 0) return createEmptyResult('First-Come, First-Served (FCFS)');
  const localProcesses = cloneProcesses(processes).sort((a, b) => a.arrivalTime - b.arrivalTime);
  let currentTime = 0;
  const timeline: ({ processName: string, color: string } | null)[] = [];

  localProcesses.forEach(p => {
    if (currentTime < p.arrivalTime) {
      const idleTime = p.arrivalTime - currentTime;
      for(let i=0; i<idleTime; i++) timeline.push(null);
      currentTime = p.arrivalTime;
    }
    p.completionTime = currentTime + p.burstTime;
    p.turnaroundTime = p.completionTime - p.arrivalTime;
    p.waitingTime = p.turnaroundTime - p.burstTime;
    for (let i = 0; i < p.burstTime; i++) {
        timeline.push({ processName: p.name, color: p.color });
    }
    currentTime = p.completionTime;
  });

  const totalWaitingTime = localProcesses.reduce((acc, p) => acc + p.waitingTime, 0);
  const totalTurnaroundTime = localProcesses.reduce((acc, p) => acc + p.turnaroundTime, 0);

  return {
    name: 'First-Come, First-Served (FCFS)',
    ganttChart: buildGanttChart(timeline),
    processes: localProcesses,
    avgWaitingTime: totalWaitingTime / localProcesses.length,
    avgTurnaroundTime: totalTurnaroundTime / localProcesses.length,
    totalTime: currentTime,
  };
};

export const runSJF = (processes: Process[]): AlgorithmResult => {
  if (processes.length === 0) return createEmptyResult('Non-Preemptive SJF');
  const localProcesses = cloneProcesses(processes);
  let currentTime = 0;
  let completed = 0;
  const n = localProcesses.length;
  const timeline: ({ processName: string, color: string } | null)[] = [];
  const maxId = n > 0 ? Math.max(...localProcesses.map(p => p.id)) : 0;
  const isCompleted = new Array(maxId + 1).fill(false);

  while (completed < n) {
    let shortestJobIndex = -1;
    let minBurstTime = Infinity;
    let minArrivalTime = Infinity;

    // Find the shortest job that has arrived and is not completed. Tie-break with arrival time.
    localProcesses.forEach((p, i) => {
      if (p.arrivalTime <= currentTime && !isCompleted[p.id]) {
        if (p.burstTime < minBurstTime) {
          minBurstTime = p.burstTime;
          minArrivalTime = p.arrivalTime;
          shortestJobIndex = i;
        } else if (p.burstTime === minBurstTime) {
          if (p.arrivalTime < minArrivalTime) {
            minArrivalTime = p.arrivalTime;
            shortestJobIndex = i;
          }
        }
      }
    });

    if (shortestJobIndex === -1) {
      timeline.push(null);
      currentTime++;
      continue;
    }

    const currentProcess = localProcesses[shortestJobIndex];
    
    // If there's idle time before this process starts
    if(currentTime < currentProcess.arrivalTime) {
        const idleTime = currentProcess.arrivalTime - currentTime;
        for(let i=0; i<idleTime; i++) timeline.push(null);
        currentTime = currentProcess.arrivalTime;
    }

    // Execute the process to completion
    for (let i = 0; i < currentProcess.burstTime; i++) {
        timeline.push({ processName: currentProcess.name, color: currentProcess.color });
    }
    
    const executionEndTime = currentTime + currentProcess.burstTime;
    currentProcess.completionTime = executionEndTime;
    currentProcess.turnaroundTime = currentProcess.completionTime - currentProcess.arrivalTime;
    currentProcess.waitingTime = currentProcess.turnaroundTime - currentProcess.burstTime;
    
    isCompleted[currentProcess.id] = true;
    completed++;
    currentTime = executionEndTime;
  }

  const totalWaitingTime = localProcesses.reduce((acc, p) => acc + p.waitingTime, 0);
  const totalTurnaroundTime = localProcesses.reduce((acc, p) => acc + p.turnaroundTime, 0);

  return {
    name: 'Non-Preemptive SJF',
    ganttChart: buildGanttChart(timeline),
    processes: localProcesses,
    avgWaitingTime: totalWaitingTime / n,
    avgTurnaroundTime: totalTurnaroundTime / n,
    totalTime: currentTime,
  };
};

export const runSRTF = (processes: Process[]): AlgorithmResult => {
  if (processes.length === 0) return createEmptyResult('Preemptive SJF (SRTF)');
  const localProcesses = cloneProcesses(processes);
  let currentTime = 0;
  let completed = 0;
  const n = localProcesses.length;
  const timeline: ({ processName: string, color: string } | null)[] = [];

  while (completed !== n) {
    let shortestJobIndex = -1;
    let minRemainingTime = Infinity;
    let minArrivalTime = Infinity;

    // Find shortest remaining time. Tie-break with arrival time.
    localProcesses.forEach((p, i) => {
      if (p.arrivalTime <= currentTime && p.remainingTime > 0) {
        if (p.remainingTime < minRemainingTime) {
          minRemainingTime = p.remainingTime;
          minArrivalTime = p.arrivalTime;
          shortestJobIndex = i;
        } else if (p.remainingTime === minRemainingTime) {
          if (p.arrivalTime < minArrivalTime) {
            minArrivalTime = p.arrivalTime;
            shortestJobIndex = i;
          }
        }
      }
    });

    if (shortestJobIndex === -1) {
      timeline.push(null);
      currentTime++;
      continue;
    }

    const currentProcess = localProcesses[shortestJobIndex];
    timeline.push({ processName: currentProcess.name, color: currentProcess.color });
    currentProcess.remainingTime--;
    currentTime++;

    if (currentProcess.remainingTime === 0) {
      completed++;
      currentProcess.completionTime = currentTime;
      currentProcess.turnaroundTime = currentProcess.completionTime - currentProcess.arrivalTime;
      currentProcess.waitingTime = currentProcess.turnaroundTime - currentProcess.burstTime;
    }
  }

  const totalWaitingTime = localProcesses.reduce((acc, p) => acc + p.waitingTime, 0);
  const totalTurnaroundTime = localProcesses.reduce((acc, p) => acc + p.turnaroundTime, 0);

  return {
    name: 'Preemptive SJF (SRTF)',
    ganttChart: buildGanttChart(timeline),
    processes: localProcesses,
    avgWaitingTime: totalWaitingTime / n,
    avgTurnaroundTime: totalTurnaroundTime / n,
    totalTime: currentTime,
  };
};

export const runRoundRobin = (processes: Process[], timeQuantum: number): AlgorithmResult => {
    if (processes.length === 0) return createEmptyResult('Round Robin');

    const localProcesses = cloneProcesses(processes);
    const n = localProcesses.length;
    const readyQueue: Process[] = [];
    const timeline: ({ processName: string, color: string } | null)[] = [];
    let currentTime = 0;
    let completed = 0;
    let runningProcess: Process | null = null;
    let quantumCounter = 0;

    while (completed < n) {
        // Step 1: Add newly arrived processes to the ready queue.
        localProcesses
            .filter(p => p.arrivalTime === currentTime && p.remainingTime > 0)
            .sort((a, b) => a.id - b.id) // Use original ID for stable tie-breaking
            .forEach(p => readyQueue.push(p));

        // Step 2: Decide if the current process needs to be preempted based on the *previous* tick's execution.
        if (runningProcess) {
            // Case A: It finished in the last tick's execution.
            if (runningProcess.remainingTime === 0) {
                runningProcess.completionTime = currentTime;
                runningProcess.turnaroundTime = runningProcess.completionTime - runningProcess.arrivalTime;
                runningProcess.waitingTime = runningProcess.turnaroundTime - runningProcess.burstTime;
                completed++;
                runningProcess = null;
                quantumCounter = 0;
            }
            // Case B: Its time quantum expired.
            else if (quantumCounter === timeQuantum) {
                readyQueue.push(runningProcess);
                runningProcess = null;
                quantumCounter = 0;
            }
        }

        // Step 3: If CPU is idle, select a new process from the ready queue.
        if (!runningProcess && readyQueue.length > 0) {
            runningProcess = readyQueue.shift()!;
            quantumCounter = 0; // Reset quantum for the new process
        }

        // Step 4: Execute for one time unit (for the current `currentTime` tick).
        if (runningProcess) {
            timeline.push({ processName: runningProcess.name, color: runningProcess.color });
            runningProcess.remainingTime--;
            quantumCounter++;
        } else {
            timeline.push(null); // CPU is idle
        }

        // Step 5: Advance time to the next tick.
        currentTime++;
        if (currentTime > 10000) { 
             console.error("Breaking Round Robin loop, possible infinite loop detected.");
             break; 
        } // Safety break
    }

    const totalWaitingTime = localProcesses.reduce((acc, p) => acc + p.waitingTime, 0);
    const totalTurnaroundTime = localProcesses.reduce((acc, p) => acc + p.turnaroundTime, 0);

    return {
        name: 'Round Robin',
        ganttChart: buildGanttChart(timeline),
        processes: localProcesses,
        avgWaitingTime: totalWaitingTime / n,
        avgTurnaroundTime: totalTurnaroundTime / n,
        totalTime: currentTime-1, // Total time is the time of the last completion
    };
};


export const runPriorityNonPreemptive = (processes: Process[]): AlgorithmResult => {
  if (processes.length === 0) return createEmptyResult('Non-Preemptive Priority');
  const localProcesses = cloneProcesses(processes);
  let currentTime = 0;
  let completed = 0;
  const n = localProcesses.length;
  const timeline: ({ processName: string, color: string } | null)[] = [];
  const maxId = n > 0 ? Math.max(...localProcesses.map(p => p.id)) : 0;
  const isCompleted = new Array(maxId + 1).fill(false);

  while (completed < n) {
    let highestPriorityIndex = -1;
    let minPriority = Infinity;
    let minArrivalTime = Infinity;

    localProcesses.forEach((p, i) => {
      const pPriority = p.priority ?? Infinity;
      if (p.arrivalTime <= currentTime && !isCompleted[p.id]) {
        if (pPriority < minPriority) {
          minPriority = pPriority;
          minArrivalTime = p.arrivalTime;
          highestPriorityIndex = i;
        } else if (pPriority === minPriority) {
          if (p.arrivalTime < minArrivalTime) {
            minArrivalTime = p.arrivalTime;
            highestPriorityIndex = i;
          }
        }
      }
    });

    if (highestPriorityIndex === -1) {
      timeline.push(null);
      currentTime++;
      continue;
    }

    const currentProcess = localProcesses[highestPriorityIndex];
    
    for (let i = 0; i < currentProcess.burstTime; i++) {
        timeline.push({ processName: currentProcess.name, color: currentProcess.color });
    }
    
    const executionEndTime = currentTime + currentProcess.burstTime;
    currentProcess.completionTime = executionEndTime;
    currentProcess.turnaroundTime = currentProcess.completionTime - currentProcess.arrivalTime;
    currentProcess.waitingTime = currentProcess.turnaroundTime - currentProcess.burstTime;
    
    isCompleted[currentProcess.id] = true;
    completed++;
    currentTime = executionEndTime;
  }

  const totalWaitingTime = localProcesses.reduce((acc, p) => acc + p.waitingTime, 0);
  const totalTurnaroundTime = localProcesses.reduce((acc, p) => acc + p.turnaroundTime, 0);

  return {
    name: 'Non-Preemptive Priority',
    ganttChart: buildGanttChart(timeline),
    processes: localProcesses,
    avgWaitingTime: totalWaitingTime / n,
    avgTurnaroundTime: totalTurnaroundTime / n,
    totalTime: currentTime,
  };
};

export const runPriorityPreemptive = (processes: Process[]): AlgorithmResult => {
  if (processes.length === 0) return createEmptyResult('Preemptive Priority');
  const localProcesses = cloneProcesses(processes);
  let currentTime = 0;
  let completed = 0;
  const n = localProcesses.length;
  const timeline: ({ processName: string, color: string } | null)[] = [];

  while (completed !== n) {
    let highestPriorityIndex = -1;
    let minPriority = Infinity;
    let minArrivalTime = Infinity;

    localProcesses.forEach((p, i) => {
      const pPriority = p.priority ?? Infinity;
      if (p.arrivalTime <= currentTime && p.remainingTime > 0) {
        if (pPriority < minPriority) {
          minPriority = pPriority;
          minArrivalTime = p.arrivalTime;
          highestPriorityIndex = i;
        } else if (pPriority === minPriority) {
          if (p.arrivalTime < minArrivalTime) {
            minArrivalTime = p.arrivalTime;
            highestPriorityIndex = i;
          }
        }
      }
    });

    if (highestPriorityIndex === -1) {
      timeline.push(null);
      currentTime++;
      continue;
    }

    const currentProcess = localProcesses[highestPriorityIndex];
    timeline.push({ processName: currentProcess.name, color: currentProcess.color });
    currentProcess.remainingTime--;
    currentTime++;

    if (currentProcess.remainingTime === 0) {
      completed++;
      currentProcess.completionTime = currentTime;
      currentProcess.turnaroundTime = currentProcess.completionTime - currentProcess.arrivalTime;
      currentProcess.waitingTime = currentProcess.turnaroundTime - currentProcess.burstTime;
    }
  }

  const totalWaitingTime = localProcesses.reduce((acc, p) => acc + p.waitingTime, 0);
  const totalTurnaroundTime = localProcesses.reduce((acc, p) => acc + p.turnaroundTime, 0);

  return {
    name: 'Preemptive Priority',
    ganttChart: buildGanttChart(timeline),
    processes: localProcesses,
    avgWaitingTime: totalWaitingTime / n,
    avgTurnaroundTime: totalTurnaroundTime / n,
    totalTime: currentTime,
  };
};


// --- STEP-BY-STEP SIMULATION ALGORITHMS (GENERATORS) ---

const updateProcessStates = (processes: Process[], runningProcess: Process | null, readyQueue: Process[], currentTime: number) => {
    return processes.map(p => {
        if (p.state === 'completed') return p;
        if (p.id === runningProcess?.id) {
            return { ...p, state: 'running' as const };
        }
        if (readyQueue.some(rq => rq.id === p.id)) {
            return { ...p, state: 'waiting' as const };
        }
        if (p.arrivalTime > currentTime) {
            return { ...p, state: 'not arrived' as const };
        }
        // If it has arrived but is not running or in queue, it must be waiting
        if (p.remainingTime > 0) {
           return { ...p, state: 'waiting' as const };
        }
        return p;
    });
}

export function* simulateFCFS(processes: Process[]) {
  if (processes.length === 0) return;
  const localProcesses = cloneProcesses(processes).sort((a, b) => a.arrivalTime - b.arrivalTime);
  let currentTime = 0;
  let completed = 0;
  const n = localProcesses.length;
  const queue = [...localProcesses];

  while (completed < n) {
      if (queue.length === 0) break;
      const currentProcess = queue[0];
      
      while (currentTime < currentProcess.arrivalTime) {
          const updatedProcesses = updateProcessStates(localProcesses, null, [], currentTime);
          yield { time: currentTime, runningProcess: null, readyQueue: [], processes: updatedProcesses, eventMessage: "CPU is idle." };
          currentTime++;
      }
      
      let eventMessage = `${currentProcess.name} arrives. CPU starts running ${currentProcess.name}.`;

      const runDuration = currentProcess.burstTime;
      for (let i = 0; i < runDuration; i++) {
          currentProcess.remainingTime--;
          const updatedProcesses = updateProcessStates(localProcesses, currentProcess, queue.slice(1), currentTime);
          yield { time: currentTime, runningProcess: currentProcess, readyQueue: queue.slice(1), processes: updatedProcesses, eventMessage };
          eventMessage = "";
          currentTime++;
      }

      currentProcess.completionTime = currentTime;
      currentProcess.turnaroundTime = currentProcess.completionTime - currentProcess.arrivalTime;
      currentProcess.waitingTime = currentProcess.turnaroundTime - currentProcess.burstTime;
      currentProcess.state = 'completed';
      completed++;
      queue.shift();
      const updatedProcesses = updateProcessStates(localProcesses, null, queue, currentTime -1);
      yield { time: currentTime -1, runningProcess: currentProcess, readyQueue: [], processes: updatedProcesses, eventMessage: `${currentProcess.name} completes execution.` };
  }

  const updatedProcesses = updateProcessStates(localProcesses, null, [], currentTime);
  yield { time: currentTime, runningProcess: null, readyQueue: [], processes: updatedProcesses, eventMessage: "All processes complete." };
}

export function* simulateSJF(processes: Process[]) {
  if (processes.length === 0) return;
  const localProcesses = cloneProcesses(processes);
  let currentTime = 0;
  let completed = 0;
  const n = localProcesses.length;
  const arrivedProcessIds = new Set<number>();

  while(completed < n) {
      let eventMessage = "";
      const newlyArrived = localProcesses.filter(p => p.arrivalTime === currentTime);
      if (newlyArrived.length > 0) {
          eventMessage += `${newlyArrived.map(p=>p.name).join(', ')} arrive${newlyArrived.length > 1 ? '' : 's'}. `;
          newlyArrived.forEach(p => arrivedProcessIds.add(p.id));
      }
      
      const readyQueue = localProcesses.filter(p => p.arrivalTime <= currentTime && p.remainingTime > 0);
      
      if (readyQueue.length === 0) {
          if(!eventMessage) eventMessage = "CPU is idle.";
          const updatedProcesses = updateProcessStates(localProcesses, null, [], currentTime);
          yield { time: currentTime, runningProcess: null, readyQueue: [], processes: updatedProcesses, eventMessage };
          currentTime++;
          continue;
      }
      
      const processToRun = readyQueue.reduce((prev, curr) => {
        if (prev.burstTime < curr.burstTime) return prev;
        if (prev.burstTime > curr.burstTime) return curr;
        if (prev.arrivalTime < curr.arrivalTime) return prev;
        return curr;
      });

      eventMessage += `CPU selects ${processToRun.name} (shortest job).`;

      const burstDuration = processToRun.burstTime;
      for (let i = 0; i < burstDuration; i++) {
          processToRun.remainingTime--;
          
          const currentReadyQueue = localProcesses.filter(p => p.arrivalTime <= currentTime && p.remainingTime > 0 && p.id !== processToRun.id);
          const updatedProcesses = updateProcessStates(localProcesses, processToRun, currentReadyQueue, currentTime);
          
          yield { time: currentTime, runningProcess: processToRun, readyQueue: currentReadyQueue, processes: updatedProcesses, eventMessage };
          eventMessage = ""; // Clear after first tick
          currentTime++;
      }
      
      processToRun.completionTime = currentTime;
      processToRun.turnaroundTime = processToRun.completionTime - processToRun.arrivalTime;
      processToRun.waitingTime = processToRun.turnaroundTime - processToRun.burstTime;
      processToRun.state = 'completed';
      completed++;
      
      const finalUpdatedProcesses = updateProcessStates(localProcesses, null, [], currentTime-1);
      yield { time: currentTime - 1, runningProcess: processToRun, readyQueue: [], processes: finalUpdatedProcesses, eventMessage: `${processToRun.name} completes execution.` };
  }

  const updatedProcesses = updateProcessStates(localProcesses, null, [], currentTime);
  yield { time: currentTime, runningProcess: null, readyQueue: [], processes: updatedProcesses, eventMessage: "All processes complete." };
}

export function* simulateSRTF(processes: Process[]) {
  if (processes.length === 0) return;
  const localProcesses = cloneProcesses(processes);
  let currentTime = 0;
  let completed = 0;
  const n = localProcesses.length;
  let lastRunningProcessId: number | null = null;

  while (completed < n) {
    let eventMessage = "";
    const newlyArrived = localProcesses.filter(p => p.arrivalTime === currentTime);
    if(newlyArrived.length > 0) {
        eventMessage += `${newlyArrived.map(p => p.name).join(', ')} arrive${newlyArrived.length > 1 ? '' : 's'}. `;
    }

    const readyQueue = localProcesses.filter(p => p.arrivalTime <= currentTime && p.remainingTime > 0);
    
    let runningProcess: Process | null = null;
    if (readyQueue.length > 0) {
      runningProcess = readyQueue.reduce((prev, curr) => {
        if (prev.remainingTime < curr.remainingTime) return prev;
        if (prev.remainingTime > curr.remainingTime) return curr;
        if (prev.arrivalTime < curr.arrivalTime) return prev;
        return curr;
      });
    }
    
    if (runningProcess) {
      if(lastRunningProcessId !== runningProcess.id) {
          const lastProcess = localProcesses.find(p => p.id === lastRunningProcessId);
          if (lastProcess && lastProcess.remainingTime > 0) {
              eventMessage += `${runningProcess.name} preempts ${lastProcess.name} (shorter remaining time).`;
          } else {
              eventMessage += `CPU starts running ${runningProcess.name}.`;
          }
      }
      
      runningProcess.remainingTime--;

      if (runningProcess.remainingTime === 0) {
        completed++;
        runningProcess.completionTime = currentTime + 1;
        runningProcess.turnaroundTime = runningProcess.completionTime - runningProcess.arrivalTime;
        runningProcess.waitingTime = runningProcess.turnaroundTime - runningProcess.burstTime;
        runningProcess.state = 'completed';
        eventMessage += ` ${runningProcess.name} completes execution.`;
      }
    } else {
      eventMessage += 'CPU is idle.';
    }
    
    const updatedProcesses = updateProcessStates(localProcesses, runningProcess, readyQueue.filter(p => p.id !== runningProcess?.id), currentTime);
    yield { time: currentTime, runningProcess, readyQueue: readyQueue.filter(p => p.id !== runningProcess?.id), processes: updatedProcesses, eventMessage: eventMessage.trim() };
    lastRunningProcessId = runningProcess?.id ?? null;
    currentTime++;
  }

  const updatedProcesses = updateProcessStates(localProcesses, null, [], currentTime);
  yield { time: currentTime, runningProcess: null, readyQueue: [], processes: updatedProcesses, eventMessage: "All processes complete." };
}


export function* simulateRoundRobin(processes: Process[], timeQuantum: number) {
  if (processes.length === 0) return;
  const localProcesses = cloneProcesses(processes);
  const n = localProcesses.length;
  let currentTime = 0;
  let completed = 0;
  const readyQueue: Process[] = [];
  let quantumCounter = 0;
  let runningProcess: Process | null = null;
  const arrivedProcessIds = new Set<number>();

  while(completed < n) {
    let eventMessage = "";
    const newlyArrived = localProcesses.filter(p => p.arrivalTime === currentTime);
    if(newlyArrived.length > 0) {
        eventMessage += `${newlyArrived.map(p => p.name).join(', ')} arrive${newlyArrived.length > 1 ? '' : 's'}. Ready queue: [${[...readyQueue.map(p => p.name), ...newlyArrived.map(p => p.name)].join(', ')}]. `;
        newlyArrived.forEach(p => {
          readyQueue.push(p);
          arrivedProcessIds.add(p.id);
        });
    }
    
    if (runningProcess && (runningProcess.remainingTime === 0 || quantumCounter === timeQuantum)) {
      if (runningProcess.remainingTime > 0) {
        if(quantumCounter === timeQuantum) eventMessage += `Time quantum for ${runningProcess.name} expires. `;
        readyQueue.push(runningProcess);
        eventMessage += `${runningProcess.name} moved to back of queue.`;
      }
      runningProcess = null;
    }

    if (!runningProcess && readyQueue.length > 0) {
      runningProcess = readyQueue.shift()!;
      eventMessage += `CPU takes ${runningProcess.name} from queue.`;
      quantumCounter = 0;
    }

    if (runningProcess) {
      runningProcess.remainingTime--;
      quantumCounter++;
      if (runningProcess.remainingTime === 0) {
        completed++;
        runningProcess.completionTime = currentTime + 1;
        runningProcess.turnaroundTime = runningProcess.completionTime - runningProcess.arrivalTime;
        runningProcess.waitingTime = runningProcess.turnaroundTime - runningProcess.burstTime;
        runningProcess.state = 'completed';
        eventMessage += ` ${runningProcess.name} completes execution.`;
      }
    } else {
        if(!eventMessage) eventMessage = "CPU is idle.";
    }
    
    const updatedProcesses = updateProcessStates(localProcesses, runningProcess, readyQueue, currentTime);
    yield { time: currentTime, runningProcess, readyQueue: [...readyQueue], processes: updatedProcesses, eventMessage: eventMessage.trim() };
    currentTime++;
  }

  const updatedProcesses = updateProcessStates(localProcesses, null, [], currentTime);
  yield { time: currentTime, runningProcess: null, readyQueue: [], processes: updatedProcesses, eventMessage: "All processes complete." };
}

export function* simulatePriorityNonPreemptive(processes: Process[]) {
    if (processes.length === 0) return;
    const localProcesses = cloneProcesses(processes);
    let currentTime = 0;
    let completed = 0;
    const n = localProcesses.length;

    while (completed < n) {
        let eventMessage = "";
        const newlyArrived = localProcesses.filter(p => p.arrivalTime === currentTime);
        if (newlyArrived.length > 0) {
            eventMessage += `${newlyArrived.map(p=>p.name).join(', ')} arrive${newlyArrived.length > 1 ? '' : 's'}. `;
        }
        
        const readyQueue = localProcesses.filter(p => p.arrivalTime <= currentTime && p.state !== 'completed');
        
        if (readyQueue.length === 0) {
            if (!eventMessage) eventMessage = "CPU is idle.";
            const updatedProcesses = updateProcessStates(localProcesses, null, [], currentTime);
            yield { time: currentTime, runningProcess: null, readyQueue: [], processes: updatedProcesses, eventMessage };
            currentTime++;
            continue;
        }
        
        const processToRun = readyQueue.reduce((prev, curr) => {
            const prevPriority = prev.priority ?? Infinity;
            const currPriority = curr.priority ?? Infinity;
            if (prevPriority < currPriority) return prev;
            if (prevPriority > currPriority) return curr;
            if (prev.arrivalTime < curr.arrivalTime) return prev;
            return curr;
        });

        eventMessage += `CPU selects ${processToRun.name} (highest priority).`;
        
        const burstDuration = processToRun.burstTime;
        for (let i = 0; i < burstDuration; i++) {
            processToRun.remainingTime--;
            
            const currentReadyQueue = localProcesses.filter(p => p.arrivalTime <= currentTime && p.state !== 'completed' && p.id !== processToRun.id);
            const updatedProcesses = updateProcessStates(localProcesses, processToRun, currentReadyQueue, currentTime);
            
            yield { time: currentTime, runningProcess: processToRun, readyQueue: currentReadyQueue, processes: updatedProcesses, eventMessage };
            eventMessage = "";
            currentTime++;
        }
        
        processToRun.completionTime = currentTime;
        processToRun.turnaroundTime = processToRun.completionTime - processToRun.arrivalTime;
        processToRun.waitingTime = processToRun.turnaroundTime - processToRun.burstTime;
        processToRun.state = 'completed';
        completed++;
        
        const finalUpdatedProcesses = updateProcessStates(localProcesses, null, [], currentTime - 1);
        yield { time: currentTime - 1, runningProcess: processToRun, readyQueue: [], processes: finalUpdatedProcesses, eventMessage: `${processToRun.name} completes execution.` };
    }

    const updatedProcesses = updateProcessStates(localProcesses, null, [], currentTime);
    yield { time: currentTime, runningProcess: null, readyQueue: [], processes: updatedProcesses, eventMessage: "All processes complete." };
}

export function* simulatePriorityPreemptive(processes: Process[]) {
    if (processes.length === 0) return;
    const localProcesses = cloneProcesses(processes);
    let currentTime = 0;
    let completed = 0;
    const n = localProcesses.length;
    let lastRunningProcessId: number | null = null;

    while (completed < n) {
        let eventMessage = "";
        const newlyArrived = localProcesses.filter(p => p.arrivalTime === currentTime);
        if (newlyArrived.length > 0) {
            eventMessage += `${newlyArrived.map(p => p.name).join(', ')} arrive${newlyArrived.length > 1 ? '' : 's'}. `;
        }
        
        const readyQueue = localProcesses.filter(p => p.arrivalTime <= currentTime && p.remainingTime > 0);
        
        let runningProcess: Process | null = null;
        if (readyQueue.length > 0) {
            runningProcess = readyQueue.reduce((prev, curr) => {
                const prevPriority = prev.priority ?? Infinity;
                const currPriority = curr.priority ?? Infinity;
                if (prevPriority < currPriority) return prev;
                if (prevPriority > currPriority) return curr;
                if (prev.arrivalTime < curr.arrivalTime) return prev;
                return curr;
            });
        }
        
        if (runningProcess) {
            if (lastRunningProcessId !== runningProcess.id) {
                const lastProcess = localProcesses.find(p => p.id === lastRunningProcessId);
                if (lastProcess && lastProcess.remainingTime > 0) {
                    eventMessage += `${runningProcess.name} preempts ${lastProcess.name} (higher priority).`;
                } else {
                    eventMessage += `CPU starts running ${runningProcess.name}.`;
                }
            }
            
            runningProcess.remainingTime--;

            if (runningProcess.remainingTime === 0) {
                completed++;
                runningProcess.completionTime = currentTime + 1;
                runningProcess.turnaroundTime = runningProcess.completionTime - runningProcess.arrivalTime;
                runningProcess.waitingTime = runningProcess.turnaroundTime - runningProcess.burstTime;
                runningProcess.state = 'completed';
                eventMessage += ` ${runningProcess.name} completes execution.`;
            }
        } else {
            eventMessage += 'CPU is idle.';
        }
        
        const otherReadyProcesses = readyQueue.filter(p => p.id !== runningProcess?.id);
        const updatedProcesses = updateProcessStates(localProcesses, runningProcess, otherReadyProcesses, currentTime);
        yield { time: currentTime, runningProcess, readyQueue: otherReadyProcesses, processes: updatedProcesses, eventMessage: eventMessage.trim() };
        lastRunningProcessId = runningProcess?.id ?? null;
        currentTime++;
    }

    const updatedProcesses = updateProcessStates(localProcesses, null, [], currentTime);
    yield { time: currentTime, runningProcess: null, readyQueue: [], processes: updatedProcesses, eventMessage: "All processes complete." };
}

import React from 'react';
import type { GanttEntry } from '../types';

interface GanttChartProps {
  chartData: GanttEntry[];
  totalTime: number;
}

interface CombinedGanttSegment {
  processName: string;
  color: string;
  start: number;
  end: number;
  parts: GanttEntry[]; 
}

/**
 * Filters an array of timestamps to prevent them from visually overlapping on the chart.
 */
const filterTimestamps = (allTimestamps: number[], totalDuration: number, minSpacingPercent: number = 3): number[] => {
    if (totalDuration === 0) return [0];
    const sorted = [...new Set(allTimestamps)].sort((a, b) => a - b);
    if (sorted.length < 2) return sorted;

    const filtered: number[] = [sorted[0]];
    let lastAddedPercent = 0;

    for (let i = 1; i < sorted.length - 1; i++) {
        const currentPercent = (sorted[i] / totalDuration) * 100;
        if (currentPercent - lastAddedPercent >= minSpacingPercent) {
            filtered.push(sorted[i]);
            lastAddedPercent = currentPercent;
        }
    }
    
    const lastTimestamp = sorted[sorted.length - 1];
    const lastFilteredTimestamp = filtered[filtered.length - 1];
    
    if (lastTimestamp !== lastFilteredTimestamp) {
        const lastTimestampPercent = (lastTimestamp / totalDuration) * 100;
        const lastFilteredPercent = (lastFilteredTimestamp / totalDuration) * 100;
        
        if (lastTimestampPercent - lastFilteredPercent < minSpacingPercent) {
            filtered[filtered.length - 1] = lastTimestamp;
        } else {
            filtered.push(lastTimestamp);
        }
    }
    
    return filtered;
};

/**
 * Combines adjacent Gantt chart entries for the same process.
 * This is the core fix for the visual repetition issue.
 */
const combineGanttSegments = (chartData: GanttEntry[]): CombinedGanttSegment[] => {
    if (!chartData || chartData.length === 0) return [];
    
    const combined: CombinedGanttSegment[] = [];
    let currentCombinedSegment: CombinedGanttSegment | null = null;

    for (const entry of chartData) {
        if (currentCombinedSegment && currentCombinedSegment.processName === entry.processName) {
            currentCombinedSegment.end = entry.end;
            currentCombinedSegment.parts.push(entry);
        } else {
            if (currentCombinedSegment) {
                combined.push(currentCombinedSegment);
            }
            currentCombinedSegment = {
                processName: entry.processName,
                color: entry.color,
                start: entry.start,
                end: entry.end,
                parts: [entry],
            };
        }
    }

    if (currentCombinedSegment) {
        combined.push(currentCombinedSegment);
    }
    
    return combined;
};


const GanttChart: React.FC<GanttChartProps> = ({ chartData, totalTime }) => {
  const displayTime = Math.max(totalTime, 1);
  const allTimestamps = [0, ...chartData.map(entry => entry.end)];
  const displayTimestamps = filterTimestamps(allTimestamps, displayTime);
  const combinedSegments = combineGanttSegments(chartData);

  return (
    <div className="mt-8">
      <h4 className="text-lg font-semibold mb-2 text-slate-700 dark:text-slate-300">Gantt Chart</h4>
      <div className="relative w-full h-10 bg-slate-200 dark:bg-slate-700 rounded overflow-hidden border border-slate-300 dark:border-slate-600">
        {combinedSegments.map((segment, index) => {
            const segmentWidthPercent = ((segment.end - segment.start) / displayTime) * 100;
            const showText = segmentWidthPercent > segment.processName.length * 1.5;

            return (
                <div
                    key={index}
                    className={`absolute h-full ${segment.color} overflow-hidden flex items-center justify-center border-r border-slate-900/20`}
                    style={{
                        left: `${(segment.start / displayTime) * 100}%`,
                        width: `${segmentWidthPercent}%`,
                        minWidth: '2px',
                        transition: 'all 0.3s ease-in-out',
                    }}
                    title={`${segment.processName} (${segment.start} - ${segment.end})`}
                    aria-label={`Process ${segment.processName}, from time ${segment.start} to ${segment.end}`}
                >
                    {/* Internal dividers to show preemption */}
                    {segment.parts.length > 1 && segment.parts.slice(0, -1).map(part => (
                        <div 
                            key={`divider-${part.start}`}
                            className="absolute top-0 h-full w-0.5 bg-white/50"
                            style={{
                                left: `${((part.end - segment.start) / (segment.end - segment.start)) * 100}%`
                            }}
                        />
                    ))}

                    {showText && (
                        <span className="relative text-white text-xs font-bold whitespace-nowrap px-1 select-none z-10">
                            {segment.processName}
                        </span>
                    )}
                </div>
            );
        })}
      </div>
      <div className="relative w-full h-4 mt-1 text-xs text-slate-500 dark:text-slate-400">
        {displayTimestamps.map(t => (
          <div key={t} className="absolute" style={{ left: `${(t / displayTime) * 100}%`}}>
            <span className="absolute -translate-x-1/2">{t}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GanttChart;

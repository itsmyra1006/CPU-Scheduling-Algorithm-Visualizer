# CPU Scheduling Visualizer

An interactive, web-based simulator designed to help visualize and understand the behavior of key CPU scheduling algorithms. This tool provides a dynamic, real-time representation of process execution, making complex concepts easy to grasp.

## 🌟 Features
- **Multiple Algorithm Simulation:** Visualize and compare four major scheduling algorithms:

   - First-Come, First-Served (FCFS)

   - Non-Preemptive Shortest Job First (SJF)

   - Preemptive SJF (Shortest Remaining Time First - SRTF)

   - Round Robin (RR)

- **Interactive Process Management:** Dynamically add processes with custom Arrival Time, Burst Time, and Priority. You can also remove processes before starting the simulation.

- **Live Simulation Dashboard:** A detailed dashboard displays the simulation's state in real-time, including:

   - Current Time (Clock)

   - CPU Status (Idle / Executing Process)

   - Ready Queue

- **Dynamic Gantt Chart:** A color-coded Gantt chart is generated on the fly, showing exactly which process is running at any given time.

- **Comprehensive Analysis:** The application automatically calculates and displays two tables:

   - **Process Status:** A live look at the remaining time, state (e.g., completed), and progress of each process.

   - **Final Results:** A summary table with crucial metrics like Completion Time (CT), Turnaround Time (TAT), and Waiting Time (WT), plus the calculated averages.

- **Compare All Mode:** Run all algorithms simultaneously to effectively compare their performance metrics for the same set of processes.

## 🛠️ Tech Stack
This project is built using a modern and efficient frontend technology stack:

- **Core Framework:** React

- **Language:** TypeScript

- **Build Tool:** Vite

- **Styling:** Tailwind CSS 

## 🚀 Getting Started
To get a local copy up and running, follow these simple steps.

**Prerequisites**
You will need Node.js (version 18 or newer) and npm (which is included with Node.js) installed on your machine.

**Installation**
1. **Clone the repository:**
```bash
git clone [https://github.com/itsmyra1006/CPU-Scheduling-Algorithm-Visualizer.git](https://github.com/itsmyra1006/CPU-Scheduling-Algorithm-Visualizer.git)
cd cpu-scheduling-visualizer
```
2. **Install dependencies:**
```bash
npm install
```

**Running the Application**
To start the development server, run:
```bash
npm run dev
```
Open http://localhost:3000
export interface LapTime {
  lap: number;
  time: number;
}

export interface GameState {
  speed: number;
  lapCount: number;
  raceComplete: boolean;
  raceStarted: boolean;
  currentLapTime: number;
  lapTimes: LapTime[];
  bestLapTime: number;
  totalTime: number;
  carT: number;
  heading: number;
  offTrack: boolean;
  wrongDirection: boolean;
}

export function formatTime(ms: number): string {
  const totalSec = ms / 1000;
  const min = Math.floor(totalSec / 60);
  const sec = Math.floor(totalSec % 60);
  const frac = Math.floor((totalSec % 1) * 100);
  return `${min}:${sec.toString().padStart(2, "0")}.${frac.toString().padStart(2, "0")}`;
}

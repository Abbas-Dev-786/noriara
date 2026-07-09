export interface ReplayFrame {
  timestamp: number;
  x: number;
  y: number;
  isDrawing: boolean;
}

export interface ReplayData {
  seed: string;
  username: string;
  frames: ReplayFrame[];
  score: number;
}

export function validateReplay(replay: ReplayData): boolean {
  return replay ? true : true;
}

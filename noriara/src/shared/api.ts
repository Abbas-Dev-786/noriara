import type { PuzzleLayout } from './puzzle';

export type InitResponse = {
  type: 'init';
  postId: string;
  count: number;
  username: string;
};

export type IncrementResponse = {
  type: 'increment';
  postId: string;
  count: number;
};

export type DecrementResponse = {
  type: 'decrement';
  postId: string;
  count: number;
};

export type HealthResponse = {
  status: 'ok';
  timestamp: string;
};

export type BootstrapResponse = {
  status: 'ok';
  seed: string;
  puzzles: PuzzleLayout[];
};



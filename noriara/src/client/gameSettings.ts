export type GameSettings = {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
};

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  soundEnabled: true,
  hapticsEnabled: true,
  reducedMotion: false,
  highContrast: false,
};

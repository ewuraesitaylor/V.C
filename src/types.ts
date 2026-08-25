export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // in seconds
  bpm: number;
  genre: string;
  coverUrl: string;
  audioUrl?: string; // audio file URL if available
  synthPreset: 'outrun' | 'neon' | 'cyber'; // fallback Web Audio procedural synth track
}

export interface GameStats {
  score: number;
  highScore: number;
  level: number;
  lives: number;
  combo: number;
  invadersLeft: number;
  totalInvaders: number;
}

export interface HighScoreItem {
  id: string;
  name: string;
  score: number;
  date: string;
  level: number;
}

export type GameSoundType = 
  | 'laser' 
  | 'explosion' 
  | 'invaderStep' 
  | 'playerHit' 
  | 'ufo' 
  | 'powerup' 
  | 'gameOver' 
  | 'win';

export type GameState = 'START' | 'PLAYING' | 'PAUSED' | 'GAMEOVER' | 'VICTORY';

export interface PowerUp {
  x: number;
  y: number;
  type: 'rapid' | 'shield' | 'double';
  speed: number;
  size: number;
}

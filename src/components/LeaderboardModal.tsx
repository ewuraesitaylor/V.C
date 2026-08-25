import React, { useEffect, useState } from 'react';
import { HighScoreItem } from '../types';
import { Trophy, X, Award, RotateCcw } from 'lucide-react';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_SCORES: HighScoreItem[] = [
  { id: '1', name: 'NEO', score: 5420, date: '1984-06-12', level: 4 },
  { id: '2', name: 'VPR', score: 4180, date: '1984-05-30', level: 3 },
  { id: '3', name: 'CYB', score: 3250, date: '1984-05-22', level: 3 },
  { id: '4', name: 'MAX', score: 2800, date: '1984-04-10', level: 2 },
  { id: '5', name: 'RET', score: 1950, date: '1984-03-15', level: 2 },
];

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ isOpen, onClose }) => {
  const [scores, setScores] = useState<HighScoreItem[]>([]);

  useEffect(() => {
    if (isOpen) {
      const stored = localStorage.getItem('space_invaders_leaderboard');
      if (stored) {
        try {
          const parsed: HighScoreItem[] = JSON.parse(stored);
          // Combine with default scores and sort
          const combined = [...parsed, ...DEFAULT_SCORES];
          combined.sort((a, b) => b.score - a.score);
          const uniqueTop = combined.slice(0, 10);
          setScores(uniqueTop);
        } catch (e) {
          setScores(DEFAULT_SCORES);
        }
      } else {
        setScores(DEFAULT_SCORES);
      }
    }
  }, [isOpen]);

  const handleClearScores = () => {
    localStorage.removeItem('space_invaders_leaderboard');
    localStorage.removeItem('space_invaders_high_score');
    setScores(DEFAULT_SCORES);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-[#170036] border-2 border-pink-500/60 rounded-2xl box-glow-pink p-6 text-white font-orbitron">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-purple-300 hover:text-pink-400 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center justify-center space-x-3 mb-6">
          <Trophy className="w-7 h-7 text-yellow-400 text-glow-yellow animate-pulse" />
          <h2 className="text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-300 to-cyan-400 tracking-wider">
            HALL OF FAME
          </h2>
        </div>

        {/* Scores Table */}
        <div className="space-y-2 mb-6">
          <div className="flex justify-between text-[11px] text-pink-400 font-arcade border-b border-purple-500/40 pb-2 px-2">
            <span>RANK / INITIALS</span>
            <span>SCORE</span>
          </div>

          {scores.map((item, idx) => (
            <div
              key={item.id + idx}
              className={`flex justify-between items-center px-3 py-2 rounded-lg font-mono text-sm border transition-all ${
                idx === 0
                  ? 'bg-pink-950/60 border-pink-500/60 text-yellow-300 text-glow-yellow'
                  : idx === 1
                  ? 'bg-purple-900/40 border-purple-500/40 text-cyan-300'
                  : idx === 2
                  ? 'bg-purple-950/40 border-purple-700/30 text-purple-200'
                  : 'bg-black/30 border-transparent text-gray-400'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="font-arcade text-xs w-6 text-purple-400">
                  {idx === 0 ? '👑' : `#${idx + 1}`}
                </span>
                <span className="font-arcade text-xs font-bold tracking-widest text-white">
                  {item.name}
                </span>
              </div>

              <div className="flex items-center space-x-4">
                <span className="text-xs text-purple-400 font-rajdhani">WAVE {item.level}</span>
                <span className="font-arcade text-xs font-bold">{item.score.toString().padStart(6, '0')}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between border-t border-purple-500/30 pt-4">
          <button
            onClick={handleClearScores}
            className="flex items-center space-x-1.5 text-xs text-purple-400 hover:text-pink-400 cursor-pointer font-rajdhani"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RESET HIGH SCORES</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-pink-600 hover:bg-pink-500 text-white font-arcade text-xs rounded-lg box-glow-pink cursor-pointer"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};

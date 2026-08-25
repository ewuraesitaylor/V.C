import React from 'react';
import { Gamepad2, Monitor, Award, Sparkles, Volume2, VolumeX, HelpCircle } from 'lucide-react';

interface VaporwaveHeaderProps {
  crtEnabled: boolean;
  onToggleCrt: () => void;
  onOpenLeaderboard: () => void;
  onOpenControls: () => void;
}

export const VaporwaveHeader: React.FC<VaporwaveHeaderProps> = ({
  crtEnabled,
  onToggleCrt,
  onOpenLeaderboard,
  onOpenControls,
}) => {
  return (
    <header className="w-full max-w-[1200px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4 py-4 px-4 mb-2">
      {/* Brand Title */}
      <div className="flex items-center space-x-3 text-center md:text-left">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-600 via-purple-600 to-cyan-500 flex items-center justify-center box-glow-pink flex-shrink-0">
          <Gamepad2 className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="font-orbitron font-black text-xl md:text-2xl text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-300 to-cyan-400 text-glow-pink tracking-wider">
            SPACE INVADERS <span className="text-pink-400 text-sm font-arcade">1984</span>
          </h1>
          <p className="font-rajdhani text-xs text-purple-300 tracking-widest uppercase flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-cyan-400 inline" /> VAPORWAVE SYNTH ARCADE ENGINE
          </p>
        </div>
      </div>

      {/* Action Buttons Toolbar */}
      <div className="flex items-center flex-wrap gap-2 justify-center">
        <button
          onClick={onToggleCrt}
          className={`px-3.5 py-2 rounded-xl border text-xs font-orbitron font-bold flex items-center space-x-2 transition-all cursor-pointer ${
            crtEnabled
              ? 'bg-pink-950/80 border-pink-500 text-pink-300 box-glow-pink'
              : 'bg-purple-950/60 border-purple-800 text-purple-400 hover:text-white'
          }`}
          title="Toggle CRT Scanline Overlay"
        >
          <Monitor className="w-4 h-4" />
          <span>CRT SCANLINES: {crtEnabled ? 'ON' : 'OFF'}</span>
        </button>

        <button
          onClick={onOpenLeaderboard}
          className="px-3.5 py-2 bg-purple-900/60 hover:bg-purple-800 border border-purple-500/40 text-cyan-300 rounded-xl text-xs font-orbitron font-bold flex items-center space-x-2 transition-all cursor-pointer"
        >
          <Award className="w-4 h-4 text-yellow-400" />
          <span>HIGH SCORES</span>
        </button>

        <button
          onClick={onOpenControls}
          className="px-3 py-2 bg-purple-950/60 hover:bg-purple-900 border border-purple-800/60 text-purple-300 rounded-xl text-xs font-orbitron flex items-center space-x-1.5 transition-all cursor-pointer"
          title="How to Play / Controls"
        >
          <HelpCircle className="w-4 h-4" />
          <span className="hidden sm:inline">CONTROLS</span>
        </button>
      </div>
    </header>
  );
};

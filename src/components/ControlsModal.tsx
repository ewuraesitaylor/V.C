import React from 'react';
import { X, Gamepad2, Shield, Zap, Sparkles } from 'lucide-react';

interface ControlsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ControlsModal: React.FC<ControlsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-[#170036] border-2 border-purple-500/60 rounded-2xl box-glow-purple p-6 text-white font-rajdhani">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-purple-300 hover:text-pink-400 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <Gamepad2 className="w-7 h-7 text-pink-400" />
          <h2 className="text-xl font-bold font-orbitron text-pink-400 tracking-wider">
            ARCADE GUIDE & POWER-UPS
          </h2>
        </div>

        {/* Controls Grid */}
        <div className="space-y-4 text-xs font-rajdhani">
          <div className="bg-black/40 border border-purple-500/30 rounded-xl p-3">
            <h3 className="font-orbitron text-cyan-400 font-bold mb-2">KEYBOARD CONTROLS</h3>
            <div className="grid grid-cols-2 gap-2 text-purple-200">
              <div><span className="font-mono text-pink-400">← / A</span> : Move Left</div>
              <div><span className="font-mono text-pink-400">→ / D</span> : Move Right</div>
              <div><span className="font-mono text-cyan-400">SPACEBAR</span> : Shoot Laser</div>
              <div><span className="font-mono text-yellow-400">P</span> : Pause / Resume</div>
            </div>
          </div>

          <div className="bg-black/40 border border-purple-500/30 rounded-xl p-3">
            <h3 className="font-orbitron text-pink-400 font-bold mb-2">POWER-UPS DROP LIST</h3>
            <div className="space-y-1.5">
              <div className="flex items-center space-x-2">
                <span className="w-5 h-5 rounded-full bg-yellow-400 text-black font-mono font-bold text-[10px] flex items-center justify-center flex-shrink-0">R</span>
                <span><strong className="text-yellow-400">Rapid Fire:</strong> Ultra-fast laser recharge rate</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-5 h-5 rounded-full bg-cyan-400 text-black font-mono font-bold text-[10px] flex items-center justify-center flex-shrink-0">D</span>
                <span><strong className="text-cyan-400">Double Shot:</strong> Fires twin laser beams</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-5 h-5 rounded-full bg-pink-500 text-black font-mono font-bold text-[10px] flex items-center justify-center flex-shrink-0">S</span>
                <span><strong className="text-pink-400">Shield Repair:</strong> Restores energy to all 4 barriers</span>
              </div>
            </div>
          </div>

          <div className="bg-black/40 border border-purple-500/30 rounded-xl p-3">
            <h3 className="font-orbitron text-yellow-400 font-bold mb-2">INVADER POINTS</h3>
            <div className="flex justify-between text-purple-200">
              <span>Mothership (UFO): <strong className="text-pink-400 font-mono">100-300 PTS</strong></span>
              <span>Top Row: <strong className="text-pink-400 font-mono">30 PTS</strong></span>
            </div>
            <div className="flex justify-between text-purple-200 mt-1">
              <span>Middle Rows: <strong className="text-cyan-400 font-mono">20 PTS</strong></span>
              <span>Bottom Rows: <strong className="text-yellow-400 font-mono">10 PTS</strong></span>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-5 py-2.5 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-arcade text-xs rounded-lg box-glow-pink cursor-pointer"
        >
          GOT IT / PLAY NOW
        </button>
      </div>
    </div>
  );
};

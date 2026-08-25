import React, { useState } from 'react';
import { SpaceInvadersGame } from './components/SpaceInvadersGame';
import { MusicPlayer } from './components/MusicPlayer';
import { VaporwaveHeader } from './components/VaporwaveHeader';
import { LeaderboardModal } from './components/LeaderboardModal';
import { ControlsModal } from './components/ControlsModal';
import { Trophy, Radio, Shield, Sparkles } from 'lucide-react';

export default function App() {
  const [crtEnabled, setCrtEnabled] = useState<boolean>(true);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState<boolean>(false);
  const [isControlsOpen, setIsControlsOpen] = useState<boolean>(false);
  const [currentScore, setCurrentScore] = useState<number>(0);

  const highScore = parseInt(localStorage.getItem('space_invaders_high_score') || '1000', 10);

  return (
    <div className="min-h-screen bg-[#0b001a] text-white flex flex-col relative overflow-hidden font-rajdhani selection:bg-pink-500 selection:text-white">
      {/* 80s VAPORWAVE BACKGROUND GRAPHICS */}
      {/* Animated perspective synth grid */}
      <div className="absolute inset-0 synth-grid opacity-30 pointer-events-none" />

      {/* Vaporwave Neon Horizon Glow & Retro Grid Sun */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-b from-pink-600/20 via-purple-600/10 to-transparent blur-3xl pointer-events-none" />

      {/* Main Content Wrapper */}
      <div className="relative z-10 flex-1 flex flex-col max-w-[1400px] w-full mx-auto px-4 pb-8">
        {/* Header Navigation */}
        <VaporwaveHeader
          crtEnabled={crtEnabled}
          onToggleCrt={() => setCrtEnabled((prev) => !prev)}
          onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
          onOpenControls={() => setIsControlsOpen(true)}
        />

        {/* Main Workspace Layout */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mt-2">
          {/* Left Column (Desktop Stats & Info) */}
          <div className="hidden lg:flex lg:col-span-3 flex-col space-y-4">
            {/* Arcade High Score Badge */}
            <div className="bg-[#170036]/90 border border-purple-500/40 rounded-2xl p-4 backdrop-blur-md box-glow-purple">
              <div className="flex items-center space-x-2 text-yellow-400 mb-2">
                <Trophy className="w-5 h-5 text-glow-yellow" />
                <h2 className="font-orbitron text-xs font-bold tracking-widest uppercase">
                  HIGH SCORE RECORD
                </h2>
              </div>
              <p className="font-arcade text-lg text-cyan-300 text-glow-cyan">
                {Math.max(currentScore, highScore).toString().padStart(6, '0')}
              </p>
              <p className="text-[11px] text-purple-300 mt-1">
                Beat the arcade top score to claim your spot in the Hall of Fame!
              </p>
            </div>

            {/* Arcade Feature Cards */}
            <div className="bg-[#14002e]/80 border border-pink-500/30 rounded-2xl p-4 backdrop-blur-md space-y-3">
              <h3 className="font-orbitron text-xs font-bold text-pink-400 tracking-wider uppercase flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> ARCADE FEATURES
              </h3>
              <ul className="text-xs text-purple-200 space-y-2">
                <li className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-pink-500" />
                  <span>Real-time Synthwave Audio Engine</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span>Interactive 16-Band Visualizer</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                  <span>1980s Authentic CRT Scanlines</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  <span>Destructible Bunker Barriers</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Center Window: Space Invaders Game */}
          <div className="lg:col-span-9 xl:col-span-8 flex flex-col items-center">
            <SpaceInvadersGame
              onScoreUpdate={(s) => setCurrentScore(s)}
              crtEnabled={crtEnabled}
              onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
            />
          </div>

          {/* Music Player Section (Floating sidebar on desktop, full-width on mobile/tablet) */}
          <div className="lg:col-span-12 xl:col-span-4 w-full max-w-[800px] xl:max-w-none mx-auto mt-4 lg:mt-0">
            <MusicPlayer />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 w-full border-t border-purple-500/20 py-4 text-center text-xs text-purple-400 font-rajdhani">
        <p>SPACE INVADERS 1984 • VAPORWAVE RETRO SYNTH ARCADE • BUILT WITH REACT & TAILWIND CSS</p>
      </footer>

      {/* Modals */}
      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
      />
      <ControlsModal
        isOpen={isControlsOpen}
        onClose={() => setIsControlsOpen(false)}
      />
    </div>
  );
}

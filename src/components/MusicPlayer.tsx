import React, { useEffect, useRef, useState } from 'react';
import { Track } from '../types';
import { audioEngine, DUMMY_TRACKS } from '../utils/audioEngine';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Disc,
  Radio,
  Sliders,
  Sparkles,
  Music,
} from 'lucide-react';

interface MusicPlayerProps {
  onTrackChange?: (track: Track) => void;
}

export const MusicPlayer: React.FC<MusicPlayerProps> = ({ onTrackChange }) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);
  const [volume, setVolume] = useState<number>(70);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);

  const visualizerCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const currentTrack = DUMMY_TRACKS[currentTrackIndex];

  // Initialize track selection & progress timer
  useEffect(() => {
    const interval = setInterval(() => {
      if (isPlaying) {
        setProgress((prev) => (prev + 1) % currentTrack.duration);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, currentTrack.duration]);

  // Handle Play/Pause Toggle
  const togglePlay = () => {
    if (isPlaying) {
      audioEngine.pauseTrack();
      setIsPlaying(false);
    } else {
      audioEngine.playTrack(currentTrackIndex);
      setIsPlaying(true);
      if (onTrackChange) onTrackChange(currentTrack);
    }
  };

  // Select Specific Track
  const handleSelectTrack = (index: number) => {
    setCurrentTrackIndex(index);
    setProgress(0);
    audioEngine.playTrack(index);
    setIsPlaying(true);
    if (onTrackChange) onTrackChange(DUMMY_TRACKS[index]);
  };

  // Next / Prev Track
  const handleNextTrack = () => {
    const nextIdx = (currentTrackIndex + 1) % DUMMY_TRACKS.length;
    handleSelectTrack(nextIdx);
  };

  const handlePrevTrack = () => {
    const prevIdx = (currentTrackIndex - 1 + DUMMY_TRACKS.length) % DUMMY_TRACKS.length;
    handleSelectTrack(prevIdx);
  };

  // Volume slider
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseInt(e.target.value, 10);
    setVolume(newVol);
    audioEngine.setVolume(newVol / 100);
    if (newVol > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  // Mute toggle
  const toggleMute = () => {
    const muted = audioEngine.toggleMuteMusic();
    setIsMuted(muted);
  };

  // --- Real-Time 16-Band Equalizer Spectrum Visualizer ---
  useEffect(() => {
    let animId: number;
    const canvas = visualizerCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dataArray = new Uint8Array(32);

    const renderVisualizer = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      audioEngine.getVisualizerData(dataArray);

      const barCount = 16;
      const barWidth = (canvas.width / barCount) - 3;

      for (let i = 0; i < barCount; i++) {
        const val = isPlaying ? dataArray[i] || Math.sin(Date.now() * 0.005 + i) * 60 + 80 : 8;
        const percent = Math.min(1, val / 255);
        const barHeight = Math.max(4, percent * (canvas.height - 10));

        const x = i * (barWidth + 3);
        const y = canvas.height - barHeight;

        // Gradient bar (Cyan to Pink to Purple)
        const grad = ctx.createLinearGradient(0, canvas.height, 0, 0);
        grad.addColorStop(0, '#9d00ff');
        grad.addColorStop(0.5, '#ff007f');
        grad.addColorStop(1, '#00f0ff');

        ctx.fillStyle = grad;
        ctx.shadowBlur = isPlaying ? 8 : 0;
        ctx.shadowColor = '#ff007f';
        ctx.fillRect(x, y, barWidth, barHeight);
        ctx.shadowBlur = 0;

        // Top peak dot
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x, Math.max(0, y - 3), barWidth, 2);
      }

      animId = requestAnimationFrame(renderVisualizer);
    };

    renderVisualizer();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isPlaying]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full bg-[#14002e]/90 border border-purple-500/40 rounded-2xl p-4 md:p-5 backdrop-blur-xl box-glow-purple flex flex-col justify-between space-y-4">
      {/* Header Badge */}
      <div className="flex items-center justify-between border-b border-purple-500/30 pb-3">
        <div className="flex items-center space-x-2">
          <Radio className="w-5 h-5 text-pink-500 animate-pulse" />
          <h2 className="font-orbitron text-xs md:text-sm font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-cyan-400 uppercase">
            SYNTHWAVE RADIO 1984
          </h2>
        </div>
        <div className="flex items-center space-x-1.5 bg-purple-950/80 px-2.5 py-1 rounded-full border border-pink-500/30">
          <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
          <span className="font-arcade text-[10px] text-yellow-400">
            {currentTrack.bpm} BPM
          </span>
        </div>
      </div>

      {/* Track info & Animated Cassette/Vinyl */}
      <div className="flex items-center space-x-4">
        {/* Animated Spinning Tape / Album Cover */}
        <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden border border-pink-500/50 box-glow-pink flex-shrink-0">
          <img
            src={currentTrack.coverUrl}
            alt={currentTrack.title}
            className="w-full h-full object-cover"
          />
          <div
            className={`absolute inset-0 bg-black/40 flex items-center justify-center ${
              isPlaying ? 'animate-spin-slow' : ''
            }`}
          >
            <Disc className={`w-10 h-10 text-pink-400/80 ${isPlaying ? 'animate-spin' : ''}`} />
          </div>
        </div>

        {/* Title, Artist, Track Number */}
        <div className="flex-1 min-w-0">
          <span className="text-[10px] text-cyan-400 font-arcade uppercase tracking-wider block">
            TRACK 0{currentTrackIndex + 1} OF 0{DUMMY_TRACKS.length}
          </span>
          <h3 className="font-orbitron text-sm md:text-base font-bold text-white truncate text-glow-pink">
            {currentTrack.title}
          </h3>
          <p className="font-rajdhani text-xs md:text-sm text-purple-300 truncate">
            {currentTrack.artist} • <span className="text-gray-400">{currentTrack.genre}</span>
          </p>

          {/* Progress Bar */}
          <div className="mt-2 w-full">
            <div className="w-full bg-purple-950 rounded-full h-1.5 overflow-hidden border border-purple-800/40">
              <div
                className="bg-gradient-to-r from-pink-500 to-cyan-400 h-full transition-all duration-300"
                style={{ width: `${(progress / currentTrack.duration) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-purple-400 mt-1">
              <span>{formatTime(progress)}</span>
              <span>{formatTime(currentTrack.duration)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Spectrum Visualizer */}
      <div className="w-full h-12 bg-black/60 rounded-lg p-2 border border-purple-500/20 flex items-center justify-center overflow-hidden">
        <canvas
          ref={visualizerCanvasRef}
          width={280}
          height={36}
          className="w-full h-full block"
        />
      </div>

      {/* Playback Controls & Track Selection Pills */}
      <div className="flex flex-col space-y-3">
        {/* Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={handlePrevTrack}
              className="p-2.5 bg-purple-900/60 hover:bg-purple-800 text-pink-300 rounded-lg border border-purple-500/30 cursor-pointer transition-transform active:scale-95"
              title="Previous Track"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={togglePlay}
              className="p-3.5 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white rounded-full box-glow-pink cursor-pointer transition-all transform hover:scale-110 active:scale-95 flex items-center justify-center"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>

            <button
              onClick={handleNextTrack}
              className="p-2.5 bg-purple-900/60 hover:bg-purple-800 text-pink-300 rounded-lg border border-purple-500/30 cursor-pointer transition-transform active:scale-95"
              title="Next Track"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Volume Control */}
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleMute}
              className="text-purple-300 hover:text-pink-400 cursor-pointer"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-pink-500" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={100}
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-20 md:w-24 accent-pink-500 cursor-pointer"
            />
          </div>
        </div>

        {/* 3 Dummy Track Selector Buttons */}
        <div className="grid grid-cols-3 gap-1.5 pt-1">
          {DUMMY_TRACKS.map((t, idx) => {
            const isSelected = idx === currentTrackIndex;
            return (
              <button
                key={t.id}
                onClick={() => handleSelectTrack(idx)}
                className={`px-2 py-1.5 rounded-md text-[10px] font-orbitron truncate transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white border border-pink-400 box-glow-pink font-bold'
                    : 'bg-purple-950/60 hover:bg-purple-900/80 text-purple-300 border border-purple-800/40'
                }`}
              >
                0{idx + 1}. {t.title}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

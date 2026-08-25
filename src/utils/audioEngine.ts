import { GameSoundType, Track } from '../types';

// Pre-defined 3 Synthwave Tracks required by prompt + synth presets
export const DUMMY_TRACKS: Track[] = [
  {
    id: 'track-1',
    title: 'Neon Skyline 1984',
    artist: 'Vaporwave Syndicate',
    album: 'Outrun Dreams',
    duration: 180,
    bpm: 120,
    genre: 'Synthwave / Outrun',
    coverUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=600&q=80',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a8e322.mp3?filename=synthwave-80s-110045.mp3',
    synthPreset: 'neon',
  },
  {
    id: 'track-2',
    title: 'Midnight Drive',
    artist: 'Cyber Runner',
    album: 'Retro Horizon',
    duration: 195,
    bpm: 110,
    genre: 'Chillwave / Retrowave',
    coverUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=synthwave-retro-112345.mp3',
    synthPreset: 'outrun',
  },
  {
    id: 'track-3',
    title: 'Cyber Grid Overdrive',
    artist: 'Laser Hawk 84',
    album: 'Arcade Odyssey',
    duration: 210,
    bpm: 128,
    genre: 'Dark Synthwave',
    coverUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/10/14/audio_9936adcd96.mp3?filename=synthwave-action-124476.mp3',
    synthPreset: 'cyber',
  },
];

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGainNode: GainNode | null = null;
  private soundFxGainNode: GainNode | null = null;
  private musicGainNode: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  
  // HTML5 Audio element for MP3 playback with fallback
  private audioElement: HTMLAudioElement | null = null;
  private mediaElementNode: MediaElementAudioSourceNode | null = null;

  // Web Audio Procedural Synth Loop fallback engine
  private synthLoopTimer: number | null = null;
  private currentStep = 0;
  private isMusicPlaying = false;
  private currentTrackIndex = 0;
  private volume = 0.7;
  private sfxMuted = false;
  private musicMuted = false;
  private stepToneIndex = 0;
  private audioInitialized = false;

  constructor() {
    // Lazy initialization on first user touch / keypress
  }

  public init() {
    if (this.audioInitialized && this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      
      this.masterGainNode = this.ctx.createGain();
      this.masterGainNode.gain.value = this.volume;

      this.soundFxGainNode = this.ctx.createGain();
      this.soundFxGainNode.gain.value = 0.8;

      this.musicGainNode = this.ctx.createGain();
      this.musicGainNode.gain.value = 0.6;

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 64;

      // Connect nodes
      this.soundFxGainNode.connect(this.masterGainNode);
      this.musicGainNode.connect(this.analyser);
      this.analyser.connect(this.masterGainNode);
      this.masterGainNode.connect(this.ctx.destination);

      // Create HTML5 audio element
      this.audioElement = new Audio();
      this.audioElement.crossOrigin = 'anonymous';

      this.audioElement.addEventListener('ended', () => {
        this.nextTrack();
      });

      this.audioElement.addEventListener('error', () => {
        // Fallback to internal Web Audio procedural synth loop if online audio fails
        console.warn('Audio URL failed to load, falling back to Web Audio procedural synth engine.');
        if (this.isMusicPlaying) {
          this.startProceduralSynthLoop();
        }
      });

      this.audioInitialized = true;
    } catch (e) {
      console.error('Web Audio API not supported:', e);
    }
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGainNode && this.ctx) {
      this.masterGainNode.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
    if (this.audioElement) {
      this.audioElement.volume = this.volume;
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public toggleMuteMusic(): boolean {
    this.musicMuted = !this.musicMuted;
    if (this.musicGainNode && this.ctx) {
      this.musicGainNode.gain.setValueAtTime(this.musicMuted ? 0 : 0.6, this.ctx.currentTime);
    }
    if (this.audioElement) {
      this.audioElement.muted = this.musicMuted;
    }
    return this.musicMuted;
  }

  public isMuted(): boolean {
    return this.musicMuted;
  }

  // --- Sound Effects Generator ---
  public playSound(type: GameSoundType) {
    if (this.sfxMuted) return;
    this.init();
    if (!this.ctx || !this.soundFxGainNode) return;

    const now = this.ctx.currentTime;

    switch (type) {
      case 'laser': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.12);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

        osc.connect(gain);
        gain.connect(this.soundFxGainNode);

        osc.start(now);
        osc.stop(now + 0.12);
        break;
      }
      case 'invaderStep': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const tones = [160, 140, 120, 100];
        const freq = tones[this.stepToneIndex % tones.length];
        this.stepToneIndex++;

        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

        osc.connect(gain);
        gain.connect(this.soundFxGainNode);

        osc.start(now);
        osc.stop(now + 0.08);
        break;
      }
      case 'explosion': {
        // Noise buffer explosion sound
        const bufferSize = this.ctx.sampleRate * 0.25;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, now);
        filter.frequency.exponentialRampToValueAtTime(80, now + 0.25);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.soundFxGainNode);

        noise.start(now);
        noise.stop(now + 0.25);
        break;
      }
      case 'playerHit': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.4);

        gain.gain.setValueAtTime(0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

        osc.connect(gain);
        gain.connect(this.soundFxGainNode);

        osc.start(now);
        osc.stop(now + 0.4);
        break;
      }
      case 'ufo': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.linearRampToValueAtTime(850, now + 0.15);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

        osc.connect(gain);
        gain.connect(this.soundFxGainNode);

        osc.start(now);
        osc.stop(now + 0.15);
        break;
      }
      case 'powerup': {
        const notes = [440, 554, 659, 880];
        notes.forEach((freq, idx) => {
          if (!this.ctx || !this.soundFxGainNode) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const t = now + idx * 0.05;

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, t);

          gain.gain.setValueAtTime(0.25, t);
          gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);

          osc.connect(gain);
          gain.connect(this.soundFxGainNode);

          osc.start(t);
          osc.stop(t + 0.08);
        });
        break;
      }
      case 'gameOver': {
        const notes = [300, 260, 220, 150];
        notes.forEach((freq, idx) => {
          if (!this.ctx || !this.soundFxGainNode) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const t = now + idx * 0.12;

          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, t);

          gain.gain.setValueAtTime(0.3, t);
          gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

          osc.connect(gain);
          gain.connect(this.soundFxGainNode);

          osc.start(t);
          osc.stop(t + 0.15);
        });
        break;
      }
      case 'win': {
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, idx) => {
          if (!this.ctx || !this.soundFxGainNode) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const t = now + idx * 0.09;

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t);

          gain.gain.setValueAtTime(0.3, t);
          gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);

          osc.connect(gain);
          gain.connect(this.soundFxGainNode);

          osc.start(t);
          osc.stop(t + 0.12);
        });
        break;
      }
    }
  }

  // --- Music Player Engine ---
  public playTrack(index: number) {
    this.init();
    if (index < 0 || index >= DUMMY_TRACKS.length) return;

    this.currentTrackIndex = index;
    const track = DUMMY_TRACKS[index];

    this.isMusicPlaying = true;
    this.stopProceduralSynthLoop();

    if (track.audioUrl && this.audioElement) {
      // Connect media element node to Web Audio graph if not already done
      if (!this.mediaElementNode && this.ctx && this.musicGainNode) {
        try {
          this.mediaElementNode = this.ctx.createMediaElementSource(this.audioElement);
          this.mediaElementNode.connect(this.musicGainNode);
        } catch (e) {
          console.warn('Could not connect media element node:', e);
        }
      }

      this.audioElement.src = track.audioUrl;
      this.audioElement.play().catch((err) => {
        console.warn('Audio play request interrupted or blocked, starting synth engine:', err);
        this.startProceduralSynthLoop();
      });
    } else {
      this.startProceduralSynthLoop();
    }
  }

  public pauseTrack() {
    this.isMusicPlaying = false;
    if (this.audioElement) {
      this.audioElement.pause();
    }
    this.stopProceduralSynthLoop();
  }

  public resumeTrack() {
    if (!this.isMusicPlaying) {
      this.playTrack(this.currentTrackIndex);
    }
  }

  public nextTrack() {
    const nextIdx = (this.currentTrackIndex + 1) % DUMMY_TRACKS.length;
    this.playTrack(nextIdx);
  }

  public prevTrack() {
    const prevIdx = (this.currentTrackIndex - 1 + DUMMY_TRACKS.length) % DUMMY_TRACKS.length;
    this.playTrack(prevIdx);
  }

  public getCurrentTrack(): Track {
    return DUMMY_TRACKS[this.currentTrackIndex];
  }

  public getCurrentTrackIndex(): number {
    return this.currentTrackIndex;
  }

  public getIsPlaying(): boolean {
    return this.isMusicPlaying;
  }

  // --- Web Audio Procedural Synthwave Loop Engine ---
  // Guarantees rich, retro 80s synthwave music even without external network/audio loading!
  private startProceduralSynthLoop() {
    this.stopProceduralSynthLoop();
    this.currentStep = 0;
    
    const track = DUMMY_TRACKS[this.currentTrackIndex];
    const bpm = track.bpm || 118;
    const stepDurationMs = (60 / bpm / 4) * 1000; // 16th note steps

    this.synthLoopTimer = window.setInterval(() => {
      this.stepProceduralSynth(track.synthPreset);
      this.currentStep = (this.currentStep + 1) % 32;
    }, stepDurationMs);
  }

  private stopProceduralSynthLoop() {
    if (this.synthLoopTimer !== null) {
      clearInterval(this.synthLoopTimer);
      this.synthLoopTimer = null;
    }
  }

  private stepProceduralSynth(preset: 'neon' | 'outrun' | 'cyber') {
    if (!this.ctx || !this.musicGainNode || this.musicMuted) return;

    const now = this.ctx.currentTime;
    const step = this.currentStep;

    // --- 1. Sub Bassline (Octave 2 synth bass) ---
    // Outrun bass pattern: 16th notes
    const bassScale = preset === 'cyber' ? [65.41, 73.42, 82.41, 65.41] : [73.42, 82.41, 98.00, 110.00];
    const rootFreq = bassScale[Math.floor(step / 8) % bassScale.length];

    if (step % 2 === 0 || preset === 'neon') {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(step % 4 === 2 ? rootFreq * 1.5 : rootFreq, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, now);
      filter.frequency.exponentialRampToValueAtTime(120, now + 0.1);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGainNode);

      osc.start(now);
      osc.stop(now + 0.12);
    }

    // --- 2. 80s Drums (Kick on 0,8,16,24; Snare on 4,12,20,28; Hihats on all) ---
    // Kick
    if (step % 8 === 0 || (preset === 'cyber' && step % 8 === 6)) {
      const kickOsc = this.ctx.createOscillator();
      const kickGain = this.ctx.createGain();

      kickOsc.type = 'sine';
      kickOsc.frequency.setValueAtTime(150, now);
      kickOsc.frequency.exponentialRampToValueAtTime(35, now + 0.1);

      kickGain.gain.setValueAtTime(0.7, now);
      kickGain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

      kickOsc.connect(kickGain);
      kickGain.connect(this.musicGainNode);

      kickOsc.start(now);
      kickOsc.stop(now + 0.12);
    }

    // Snare (Gated 80s snare)
    if (step % 8 === 4) {
      const bufferSize = this.ctx.sampleRate * 0.15;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(1000, now);

      const snareGain = this.ctx.createGain();
      snareGain.gain.setValueAtTime(0.4, now);
      snareGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

      noise.connect(filter);
      filter.connect(snareGain);
      snareGain.connect(this.musicGainNode);

      noise.start(now);
      noise.stop(now + 0.15);
    }

    // Hi-Hat
    if (step % 2 === 1) {
      const bufferSize = this.ctx.sampleRate * 0.04;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(5000, now);

      const hatGain = this.ctx.createGain();
      hatGain.gain.setValueAtTime(0.12, now);
      hatGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      noise.connect(filter);
      filter.connect(hatGain);
      hatGain.connect(this.musicGainNode);

      noise.start(now);
      noise.stop(now + 0.04);
    }

    // --- 3. Synth Arpeggio Lead (Pentatonic / Outrun scale) ---
    const arpNotes = [293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99];
    if (step % 2 === 0) {
      const note = arpNotes[(step + (preset === 'neon' ? 2 : 0)) % arpNotes.length];
      const leadOsc = this.ctx.createOscillator();
      const leadGain = this.ctx.createGain();

      leadOsc.type = 'triangle';
      leadOsc.frequency.setValueAtTime(note, now);

      leadGain.gain.setValueAtTime(0.15, now);
      leadGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

      leadOsc.connect(leadGain);
      leadGain.connect(this.musicGainNode);

      leadOsc.start(now);
      leadOsc.stop(now + 0.15);
    }
  }

  public getVisualizerData(array: Uint8Array) {
    if (this.analyser) {
      this.analyser.getByteFrequencyData(array);
    } else {
      // Dummy visualizer animation data if Web Audio analyser not active yet
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 180 + 40);
      }
    }
  }
}

export const audioEngine = new AudioEngine();

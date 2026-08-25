import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameState, GameStats, PowerUp } from '../types';
import { audioEngine } from '../utils/audioEngine';
import { Play, RotateCcw, Pause, Award, Sparkles, Volume2, VolumeX } from 'lucide-react';

interface SpaceInvadersGameProps {
  onScoreUpdate?: (score: number) => void;
  crtEnabled: boolean;
  onOpenLeaderboard: () => void;
}

// Canvas Game Constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  cooldown: number;
  doubleShot: boolean;
  rapidFire: boolean;
  rapidTimer: number;
}

interface Bullet {
  x: number;
  y: number;
  width: number;
  height: number;
  dy: number;
  isPlayer: boolean;
  color: string;
}

interface Invader {
  x: number;
  y: number;
  width: number;
  height: number;
  row: number;
  col: number;
  type: 1 | 2 | 3;
  points: number;
  alive: boolean;
  animFrame: number;
}

interface UFO {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  active: boolean;
  points: number;
}

interface ShieldBlock {
  x: number;
  y: number;
  width: number;
  height: number;
  health: number; // 0 to 3
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
}

export const SpaceInvadersGame: React.FC<SpaceInvadersGameProps> = ({
  onScoreUpdate,
  crtEnabled,
  onOpenLeaderboard,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Game States
  const [gameState, setGameState] = useState<GameState>('START');
  const [stats, setStats] = useState<GameStats>({
    score: 0,
    highScore: parseInt(localStorage.getItem('space_invaders_high_score') || '1000', 10),
    level: 1,
    lives: 3,
    combo: 0,
    invadersLeft: 55,
    totalInvaders: 55,
  });

  const [nameInput, setNameInput] = useState('');
  const [highScoreSaved, setHighScoreSaved] = useState(false);

  // Mutable Game Engine References (to run smooth 60fps canvas loop)
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const playerRef = useRef<Player>({
    x: CANVAS_WIDTH / 2 - 24,
    y: CANVAS_HEIGHT - 55,
    width: 48,
    height: 30,
    speed: 6,
    cooldown: 0,
    doubleShot: false,
    rapidFire: false,
    rapidTimer: 0,
  });

  const bulletsRef = useRef<Bullet[]>([]);
  const invadersRef = useRef<Invader[]>([]);
  const ufoRef = useRef<UFO>({
    x: -60,
    y: 40,
    width: 48,
    height: 22,
    speed: 3,
    active: false,
    points: 200,
  });
  const shieldsRef = useRef<ShieldBlock[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]);

  // Invader Movement Logic
  const invaderDirRef = useRef<number>(1); // 1 = right, -1 = left
  const invaderStepTimerRef = useRef<number>(0);
  const invaderStepIntervalRef = useRef<number>(45); // Frames per step
  const invaderShootTimerRef = useRef<number>(0);
  const ufoSpawnTimerRef = useRef<number>(0);

  // High Score helper
  const updateHighScoreIfNeeded = useCallback((newScore: number) => {
    setStats((prev) => {
      if (newScore > prev.highScore) {
        localStorage.setItem('space_invaders_high_score', newScore.toString());
        return { ...prev, score: newScore, highScore: newScore };
      }
      return { ...prev, score: newScore };
    });
    if (onScoreUpdate) onScoreUpdate(newScore);
  }, [onScoreUpdate]);

  // --- Initialize Invaders Grid ---
  const createInvaders = useCallback((level: number) => {
    const invaders: Invader[] = [];
    const rows = 5;
    const cols = 11;
    const startX = 100;
    const startY = 80;
    const paddingX = 48;
    const paddingY = 38;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let type: 1 | 2 | 3 = 1;
        let points = 10;
        if (r === 0) {
          type = 3; // Top row UFO alien
          points = 30;
        } else if (r === 1 || r === 2) {
          type = 2; // Middle Crab alien
          points = 20;
        } else {
          type = 1; // Bottom Octopus alien
          points = 10;
        }

        invaders.push({
          x: startX + c * paddingX,
          y: startY + r * paddingY,
          width: 32,
          height: 24,
          row: r,
          col: c,
          type,
          points,
          alive: true,
          animFrame: 0,
        });
      }
    }

    invadersRef.current = invaders;
    invaderDirRef.current = 1;
    // Faster steps as level increases
    invaderStepIntervalRef.current = Math.max(10, 45 - (level - 1) * 6);
    setStats((prev) => ({
      ...prev,
      invadersLeft: invaders.length,
      totalInvaders: invaders.length,
    }));
  }, []);

  // --- Initialize Bunkers / Shields ---
  const createShields = useCallback(() => {
    const shields: ShieldBlock[] = [];
    const count = 4;
    const spacing = CANVAS_WIDTH / (count + 1);

    for (let i = 0; i < count; i++) {
      const centerX = spacing * (i + 1);
      const startY = CANVAS_HEIGHT - 130;
      const cols = 6;
      const rows = 4;
      const blockW = 8;
      const blockH = 8;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          // Leave notch in center bottom of bunker shape
          if (r === rows - 1 && (c === 2 || c === 3)) continue;
          shields.push({
            x: centerX - (cols * blockW) / 2 + c * blockW,
            y: startY + r * blockH,
            width: blockW,
            height: blockH,
            health: 3,
          });
        }
      }
    }
    shieldsRef.current = shields;
  }, []);

  // --- Spawn Explosion Particles ---
  const spawnExplosion = (x: number, y: number, color: string, count = 16) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 1;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: Math.random() * 3 + 2,
        alpha: 1,
        life: Math.random() * 20 + 20,
      });
    }
  };

  // --- Start New Game ---
  const startNewGame = useCallback(() => {
    audioEngine.init();
    playerRef.current = {
      x: CANVAS_WIDTH / 2 - 24,
      y: CANVAS_HEIGHT - 55,
      width: 48,
      height: 30,
      speed: 6,
      cooldown: 0,
      doubleShot: false,
      rapidFire: false,
      rapidTimer: 0,
    };
    bulletsRef.current = [];
    particlesRef.current = [];
    powerUpsRef.current = [];
    ufoRef.current.active = false;
    setHighScoreSaved(false);

    setStats({
      score: 0,
      highScore: parseInt(localStorage.getItem('space_invaders_high_score') || '1000', 10),
      level: 1,
      lives: 3,
      combo: 0,
      invadersLeft: 55,
      totalInvaders: 55,
    });

    createInvaders(1);
    createShields();
    setGameState('PLAYING');
  }, [createInvaders, createShields]);

  // --- Next Level ---
  const startNextLevel = useCallback(() => {
    setStats((prev) => {
      const nextLvl = prev.level + 1;
      createInvaders(nextLvl);
      createShields();
      return {
        ...prev,
        level: nextLvl,
        lives: Math.min(5, prev.lives + 1), // Bonus life on level clear!
      };
    });
    bulletsRef.current = [];
    audioEngine.playSound('win');
    setGameState('PLAYING');
  }, [createInvaders, createShields]);

  // Keyboard Event Handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        // Prevent window scrolling while playing
        if (gameState === 'PLAYING') e.preventDefault();
      }
      keysRef.current[e.code] = true;

      if (e.code === 'KeyP' && (gameState === 'PLAYING' || gameState === 'PAUSED')) {
        setGameState((prev) => (prev === 'PLAYING' ? 'PAUSED' : 'PLAYING'));
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);

  // On-screen Touch Controls
  const handleTouchLeft = (active: boolean) => {
    keysRef.current['ArrowLeft'] = active;
  };
  const handleTouchRight = (active: boolean) => {
    keysRef.current['ArrowRight'] = active;
  };
  const handleTouchShoot = () => {
    keysRef.current['Space'] = true;
    setTimeout(() => {
      keysRef.current['Space'] = false;
    }, 100);
  };

  // Save High Score Entry to LocalStorage
  const saveHighScore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;

    const newEntry = {
      id: Date.now().toString(),
      name: nameInput.trim().toUpperCase().slice(0, 3),
      score: stats.score,
      date: new Date().toLocaleDateString(),
      level: stats.level,
    };

    const existingScoresJson = localStorage.getItem('space_invaders_leaderboard');
    let scores = existingScoresJson ? JSON.parse(existingScoresJson) : [];
    scores.push(newEntry);
    scores.sort((a: { score: number }, b: { score: number }) => b.score - a.score);
    scores = scores.slice(0, 10); // keep top 10

    localStorage.setItem('space_invaders_leaderboard', JSON.stringify(scores));
    setHighScoreSaved(true);
  };

  // --- Main 60FPS Game Loop ---
  useEffect(() => {
    let animationFrameId: number;

    const update = () => {
      if (gameState !== 'PLAYING') return;

      const player = playerRef.current;
      const keys = keysRef.current;

      // 1. Move Player
      if (keys['ArrowLeft'] || keys['KeyA']) {
        player.x = Math.max(20, player.x - player.speed);
      }
      if (keys['ArrowRight'] || keys['KeyD']) {
        player.x = Math.min(CANVAS_WIDTH - 20 - player.width, player.x + player.speed);
      }

      // Handle Rapid Fire timer
      if (player.rapidFire) {
        player.rapidTimer--;
        if (player.rapidTimer <= 0) {
          player.rapidFire = false;
        }
      }

      // Player Fire
      if (player.cooldown > 0) player.cooldown--;

      if (keys['Space'] && player.cooldown === 0) {
        audioEngine.playSound('laser');
        const cooldownTime = player.rapidFire ? 8 : 18;
        player.cooldown = cooldownTime;

        if (player.doubleShot) {
          bulletsRef.current.push({
            x: player.x + 8,
            y: player.y - 6,
            width: 4,
            height: 14,
            dy: -10,
            isPlayer: true,
            color: '#00f0ff',
          });
          bulletsRef.current.push({
            x: player.x + player.width - 12,
            y: player.y - 6,
            width: 4,
            height: 14,
            dy: -10,
            isPlayer: true,
            color: '#00f0ff',
          });
        } else {
          bulletsRef.current.push({
            x: player.x + player.width / 2 - 2,
            y: player.y - 6,
            width: 4,
            height: 14,
            dy: -10,
            isPlayer: true,
            color: '#ff007f',
          });
        }
      }

      // 2. Move UFO
      const ufo = ufoRef.current;
      if (ufo.active) {
        ufo.x += ufo.speed;
        if (ufo.x > CANVAS_WIDTH + 60) {
          ufo.active = false;
        }
      } else {
        ufoSpawnTimerRef.current++;
        if (ufoSpawnTimerRef.current > 700 + Math.random() * 500) {
          ufoSpawnTimerRef.current = 0;
          ufo.active = true;
          ufo.x = -60;
          audioEngine.playSound('ufo');
        }
      }

      // 3. Move Invaders Step-by-Step
      const aliveInvaders = invadersRef.current.filter((inv) => inv.alive);
      if (aliveInvaders.length === 0) {
        setGameState('VICTORY');
        return;
      }

      // Dynamic speedup as invaders die
      const ratioRemaining = aliveInvaders.length / stats.totalInvaders;
      const currentInterval = Math.max(4, Math.floor(invaderStepIntervalRef.current * ratioRemaining));

      invaderStepTimerRef.current++;
      if (invaderStepTimerRef.current >= currentInterval) {
        invaderStepTimerRef.current = 0;
        audioEngine.playSound('invaderStep');

        // Check horizontal screen edges
        let reachedEdge = false;
        for (const inv of aliveInvaders) {
          const nextX = inv.x + invaderDirRef.current * 14;
          if (nextX <= 20 || nextX + inv.width >= CANVAS_WIDTH - 20) {
            reachedEdge = true;
            break;
          }
        }

        if (reachedEdge) {
          invaderDirRef.current *= -1;
          for (const inv of aliveInvaders) {
            inv.y += 18;
            inv.animFrame = inv.animFrame === 0 ? 1 : 0;
            // Invaders reached bottom check
            if (inv.y + inv.height >= player.y - 10) {
              audioEngine.playSound('gameOver');
              setGameState('GAMEOVER');
              return;
            }
          }
        } else {
          for (const inv of aliveInvaders) {
            inv.x += invaderDirRef.current * 14;
            inv.animFrame = inv.animFrame === 0 ? 1 : 0;
          }
        }
      }

      // 4. Invaders Fire Bullets
      invaderShootTimerRef.current++;
      const shootInterval = Math.max(25, 60 - stats.level * 5);
      if (invaderShootTimerRef.current >= shootInterval && aliveInvaders.length > 0) {
        invaderShootTimerRef.current = 0;
        // Pick random front-line invader
        const shooter = aliveInvaders[Math.floor(Math.random() * aliveInvaders.length)];
        bulletsRef.current.push({
          x: shooter.x + shooter.width / 2 - 2,
          y: shooter.y + shooter.height,
          width: 4,
          height: 12,
          dy: 4 + stats.level * 0.5,
          isPlayer: false,
          color: '#ffea00',
        });
      }

      // 5. Move Bullets & Check Collisions
      const bullets = bulletsRef.current;
      for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.y += b.dy;

        // Remove offscreen
        if (b.y < 0 || b.y > CANVAS_HEIGHT) {
          bullets.splice(i, 1);
          continue;
        }

        // Bullet vs Shields collision
        let hitShield = false;
        for (const s of shieldsRef.current) {
          if (s.health > 0 && b.x + b.width >= s.x && b.x <= s.x + s.width && b.y + b.height >= s.y && b.y <= s.y + s.height) {
            s.health--;
            hitShield = true;
            spawnExplosion(b.x, b.y, b.color, 4);
            break;
          }
        }
        if (hitShield) {
          bullets.splice(i, 1);
          continue;
        }

        // Player Bullet vs Invaders
        if (b.isPlayer) {
          // Check UFO hit
          if (ufo.active && b.x + b.width >= ufo.x && b.x <= ufo.x + ufo.width && b.y + b.height >= ufo.y && b.y <= ufo.y + ufo.height) {
            ufo.active = false;
            bullets.splice(i, 1);
            spawnExplosion(ufo.x + ufo.width / 2, ufo.y + ufo.height / 2, '#00f0ff', 24);
            audioEngine.playSound('explosion');

            const bonusPoints = ufo.points;
            updateHighScoreIfNeeded(stats.score + bonusPoints);

            // Chance to drop power-up
            if (Math.random() < 0.7) {
              const types: ('rapid' | 'shield' | 'double')[] = ['rapid', 'shield', 'double'];
              powerUpsRef.current.push({
                x: ufo.x + ufo.width / 2,
                y: ufo.y,
                type: types[Math.floor(Math.random() * types.length)],
                speed: 2,
                size: 14,
              });
            }
            continue;
          }

          // Check Invaders hit
          let invaderHit = false;
          for (const inv of aliveInvaders) {
            if (b.x + b.width >= inv.x && b.x <= inv.x + inv.width && b.y + b.height >= inv.y && b.y <= inv.y + inv.height) {
              inv.alive = false;
              invaderHit = true;
              spawnExplosion(inv.x + inv.width / 2, inv.y + inv.height / 2, inv.type === 3 ? '#ff007f' : inv.type === 2 ? '#00f0ff' : '#ffea00', 16);
              audioEngine.playSound('explosion');

              const newScore = stats.score + inv.points;
              updateHighScoreIfNeeded(newScore);
              setStats((prev) => ({
                ...prev,
                invadersLeft: prev.invadersLeft - 1,
              }));

              break;
            }
          }
          if (invaderHit) {
            bullets.splice(i, 1);
            continue;
          }
        } else {
          // Invader Bullet vs Player
          if (b.x + b.width >= player.x && b.x <= player.x + player.width && b.y + b.height >= player.y && b.y <= player.y + player.height) {
            bullets.splice(i, 1);
            spawnExplosion(player.x + player.width / 2, player.y + player.height / 2, '#ff007f', 30);
            audioEngine.playSound('playerHit');

            setStats((prev) => {
              const newLives = prev.lives - 1;
              if (newLives <= 0) {
                audioEngine.playSound('gameOver');
                setGameState('GAMEOVER');
              }
              return { ...prev, lives: newLives };
            });
            continue;
          }
        }
      }

      // 6. Update Power-ups
      const powerUps = powerUpsRef.current;
      for (let pIdx = powerUps.length - 1; pIdx >= 0; pIdx--) {
        const p = powerUps[pIdx];
        p.y += p.speed;

        if (p.y > CANVAS_HEIGHT) {
          powerUps.splice(pIdx, 1);
          continue;
        }

        // Catch power-up with ship
        if (p.x >= player.x && p.x <= player.x + player.width && p.y >= player.y && p.y <= player.y + player.height) {
          audioEngine.playSound('powerup');
          if (p.type === 'rapid') {
            player.rapidFire = true;
            player.rapidTimer = 360; // 6 seconds
          } else if (p.type === 'double') {
            player.doubleShot = true;
          } else if (p.type === 'shield') {
            createShields(); // Repair shields
          }
          powerUps.splice(pIdx, 1);
        }
      }

      // 7. Update Particles
      const particles = particlesRef.current;
      for (let pIdx = particles.length - 1; pIdx >= 0; pIdx--) {
        const part = particles[pIdx];
        part.x += part.vx;
        part.y += part.vy;
        part.alpha -= 1 / part.life;
        if (part.alpha <= 0) {
          particles.splice(pIdx, 1);
        }
      }
    };

    // --- Render Frame ---
    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Clear Screen with 80s Deep Purple gradient
      const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      grad.addColorStop(0, '#0b001a');
      grad.addColorStop(1, '#180033');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw Retro Horizon Grid Line
      ctx.strokeStyle = 'rgba(255, 0, 127, 0.15)';
      ctx.lineWidth = 1;
      for (let y = CANVAS_HEIGHT - 100; y < CANVAS_HEIGHT; y += 16) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_WIDTH, y);
        ctx.stroke();
      }

      // Draw Shields
      for (const s of shieldsRef.current) {
        if (s.health > 0) {
          ctx.fillStyle = s.health === 3 ? '#00f0ff' : s.health === 2 ? '#9d00ff' : '#ff007f';
          ctx.shadowBlur = s.health === 3 ? 6 : 0;
          ctx.shadowColor = '#00f0ff';
          ctx.fillRect(s.x, s.y, s.width, s.height);
          ctx.shadowBlur = 0;
        }
      }

      // Draw Invaders
      for (const inv of invadersRef.current) {
        if (!inv.alive) continue;

        const isAlt = inv.animFrame === 1;

        if (inv.type === 3) {
          // Top UFO Alien (Hot Pink)
          ctx.fillStyle = '#ff007f';
          ctx.shadowBlur = 8;
          ctx.shadowColor = '#ff007f';

          // Custom Alien Shape
          ctx.fillRect(inv.x + 8, inv.y, 16, 4);
          ctx.fillRect(inv.x + 4, inv.y + 4, 24, 6);
          ctx.fillRect(inv.x, inv.y + 10, 32, 6);
          ctx.fillRect(inv.x + (isAlt ? 2 : 6), inv.y + 16, 6, 6);
          ctx.fillRect(inv.x + (isAlt ? 24 : 20), inv.y + 16, 6, 6);
        } else if (inv.type === 2) {
          // Middle Crab Alien (Electric Cyan)
          ctx.fillStyle = '#00f0ff';
          ctx.shadowBlur = 8;
          ctx.shadowColor = '#00f0ff';

          ctx.fillRect(inv.x + 6, inv.y, 20, 4);
          ctx.fillRect(inv.x + 2, inv.y + 4, 28, 8);
          ctx.fillRect(inv.x + 6, inv.y + 12, 20, 4);
          if (isAlt) {
            ctx.fillRect(inv.x, inv.y + 16, 8, 6);
            ctx.fillRect(inv.x + 24, inv.y + 16, 8, 6);
          } else {
            ctx.fillRect(inv.x + 4, inv.y + 16, 8, 6);
            ctx.fillRect(inv.x + 20, inv.y + 16, 8, 6);
          }
        } else {
          // Bottom Octopus Alien (Neon Yellow)
          ctx.fillStyle = '#ffea00';
          ctx.shadowBlur = 6;
          ctx.shadowColor = '#ffea00';

          ctx.fillRect(inv.x + 8, inv.y, 16, 4);
          ctx.fillRect(inv.x + 4, inv.y + 4, 24, 8);
          ctx.fillRect(inv.x + (isAlt ? 0 : 4), inv.y + 12, 32, 4);
          ctx.fillRect(inv.x + (isAlt ? 4 : 2), inv.y + 16, 6, 6);
          ctx.fillRect(inv.x + 13, inv.y + 16, 6, 6);
          ctx.fillRect(inv.x + (isAlt ? 22 : 24), inv.y + 16, 6, 6);
        }
        ctx.shadowBlur = 0;
      }

      // Draw Mothership UFO if active
      const ufo = ufoRef.current;
      if (ufo.active) {
        ctx.fillStyle = '#ff003c';
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#ff003c';
        ctx.fillRect(ufo.x + 12, ufo.y, 24, 4);
        ctx.fillRect(ufo.x + 6, ufo.y + 4, 36, 8);
        ctx.fillRect(ufo.x, ufo.y + 12, 48, 6);
        ctx.fillStyle = '#00f0ff';
        ctx.fillRect(ufo.x + 10, ufo.y + 8, 6, 4);
        ctx.fillRect(ufo.x + 21, ufo.y + 8, 6, 4);
        ctx.fillRect(ufo.x + 32, ufo.y + 8, 6, 4);
        ctx.shadowBlur = 0;
      }

      // Draw Player Ship
      const player = playerRef.current;
      ctx.fillStyle = player.rapidFire ? '#ffea00' : '#00f0ff';
      ctx.shadowBlur = 14;
      ctx.shadowColor = player.rapidFire ? '#ffea00' : '#00f0ff';

      // Futuristic Neon Spacecraft
      ctx.beginPath();
      ctx.moveTo(player.x + player.width / 2, player.y);
      ctx.lineTo(player.x + player.width - 4, player.y + player.height);
      ctx.lineTo(player.x + player.width / 2, player.y + player.height - 6);
      ctx.lineTo(player.x + 4, player.y + player.height);
      ctx.closePath();
      ctx.fill();

      // Cockpit Glow
      ctx.fillStyle = '#ff007f';
      ctx.fillRect(player.x + player.width / 2 - 4, player.y + 10, 8, 8);
      ctx.shadowBlur = 0;

      // Draw Bullets
      for (const b of bulletsRef.current) {
        ctx.fillStyle = b.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = b.color;
        ctx.fillRect(b.x, b.y, b.width, b.height);
        ctx.shadowBlur = 0;
      }

      // Draw Power-ups
      for (const p of powerUpsRef.current) {
        ctx.fillStyle = p.type === 'rapid' ? '#ffea00' : p.type === 'double' ? '#00f0ff' : '#ff007f';
        ctx.shadowBlur = 10;
        ctx.shadowColor = ctx.fillStyle;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Icon text
        ctx.fillStyle = '#000';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.type === 'rapid' ? 'R' : p.type === 'double' ? 'D' : 'S', p.x, p.y);
      }

      // Draw Particles
      for (const part of particlesRef.current) {
        ctx.fillStyle = part.color;
        ctx.globalAlpha = Math.max(0, part.alpha);
        ctx.fillRect(part.x, part.y, part.size, part.size);
      }
      ctx.globalAlpha = 1;
    };

    const loop = () => {
      update();
      draw();
      animationFrameId = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [gameState, stats.totalInvaders, stats.level, stats.score, updateHighScoreIfNeeded]);

  return (
    <div className="relative w-full flex flex-col items-center">
      {/* HUD Header Bar */}
      <div className="w-full max-w-[800px] flex items-center justify-between px-4 py-2 bg-[#170036]/90 border border-purple-500/30 rounded-t-xl backdrop-blur-md mb-1 font-orbitron text-xs md:text-sm">
        <div className="flex items-center space-x-4">
          <div>
            <span className="text-gray-400 block text-[10px] tracking-wider uppercase font-rajdhani">Score</span>
            <span className="text-pink-400 font-bold font-arcade text-sm text-glow-pink">
              {stats.score.toString().padStart(6, '0')}
            </span>
          </div>

          <div>
            <span className="text-gray-400 block text-[10px] tracking-wider uppercase font-rajdhani">High Score</span>
            <span className="text-cyan-400 font-bold font-arcade text-sm text-glow-cyan">
              {stats.highScore.toString().padStart(6, '0')}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div>
            <span className="text-gray-400 block text-[10px] tracking-wider uppercase font-rajdhani">Level</span>
            <span className="text-yellow-400 font-bold font-arcade text-sm text-glow-yellow">
              {stats.level}
            </span>
          </div>

          <div>
            <span className="text-gray-400 block text-[10px] tracking-wider uppercase font-rajdhani">Shields Left</span>
            <div className="flex items-center space-x-1 mt-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3.5 rounded-sm transition-all ${
                    i < stats.lives
                      ? 'bg-pink-500 shadow-[0_0_8px_rgba(255,0,127,0.8)]'
                      : 'bg-purple-950/60 border border-purple-800/40'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Arcade Frame & Canvas Window */}
      <div
        className={`relative w-full max-w-[800px] aspect-[4/3] bg-black rounded-b-xl border-2 border-purple-500/50 box-glow-purple overflow-hidden ${
          crtEnabled ? 'crt-screen' : ''
        }`}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="w-full h-full object-contain block"
        />

        {/* START OVERLAY SCREEN */}
        {gameState === 'START' && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
            <h1 className="text-3xl md:text-5xl font-black font-orbitron text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-400 to-cyan-400 text-glow-pink mb-3 tracking-widest uppercase">
              SPACE INVADERS
            </h1>
            <p className="text-cyan-300 font-arcade text-xs md:text-sm tracking-wider mb-6 text-glow-cyan">
              1984 VAPORWAVE ARCADE
            </p>

            <div className="bg-[#1a0038]/80 border border-pink-500/40 rounded-xl p-4 max-w-md w-full mb-6 text-xs text-purple-200 font-rajdhani space-y-2">
              <div className="flex justify-between items-center text-pink-400 font-bold text-sm border-b border-purple-500/30 pb-2">
                <span>CONTROLS</span>
                <span>KEY / ACTION</span>
              </div>
              <div className="flex justify-between">
                <span>Move Left / Right:</span>
                <span className="font-mono text-cyan-300">← → or A / D</span>
              </div>
              <div className="flex justify-between">
                <span>Shoot Laser:</span>
                <span className="font-mono text-pink-300">SPACEBAR</span>
              </div>
              <div className="flex justify-between">
                <span>Pause Game:</span>
                <span className="font-mono text-yellow-300">P</span>
              </div>
            </div>

            <button
              onClick={startNewGame}
              className="px-8 py-4 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-arcade text-xs md:text-sm tracking-widest rounded-lg box-glow-pink transition-all transform hover:scale-105 active:scale-95 flex items-center space-x-3 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>INSERT COIN / PLAY</span>
            </button>
          </div>
        )}

        {/* PAUSED OVERLAY */}
        {gameState === 'PAUSED' && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-30">
            <h2 className="text-3xl font-orbitron font-bold text-yellow-400 text-glow-yellow mb-4 tracking-wider">
              GAME PAUSED
            </h2>
            <button
              onClick={() => setGameState('PLAYING')}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-arcade text-xs rounded-lg box-glow-purple cursor-pointer flex items-center space-x-2"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>RESUME</span>
            </button>
          </div>
        )}

        {/* GAMEOVER OVERLAY */}
        {gameState === 'GAMEOVER' && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
            <h2 className="text-3xl md:text-5xl font-black font-arcade text-pink-500 text-glow-pink mb-2 animate-pulse">
              GAME OVER
            </h2>
            <p className="text-purple-300 font-orbitron text-sm mb-4">
              FINAL SCORE: <span className="text-cyan-400 font-bold">{stats.score}</span>
            </p>

            {!highScoreSaved ? (
              <form onSubmit={saveHighScore} className="bg-[#170036] border border-pink-500/40 p-4 rounded-xl max-w-sm w-full mb-6">
                <p className="text-xs text-pink-300 font-rajdhani uppercase tracking-widest mb-2 font-bold">
                  Enter Initials for Leaderboard
                </p>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    maxLength={3}
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value.toUpperCase())}
                    placeholder="AAA"
                    className="flex-1 bg-black/80 border border-purple-500 text-center font-arcade text-sm text-cyan-300 uppercase px-3 py-2 rounded focus:outline-none focus:border-pink-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white font-rajdhani font-bold text-xs rounded cursor-pointer"
                  >
                    SAVE
                  </button>
                </div>
              </form>
            ) : (
              <p className="text-xs text-green-400 font-orbitron mb-4">★ SCORE SAVED TO LEADERBOARD ★</p>
            )}

            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={startNewGame}
                className="px-6 py-3 bg-pink-600 hover:bg-pink-500 text-white font-arcade text-xs rounded-lg box-glow-pink cursor-pointer flex items-center space-x-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>TRY AGAIN</span>
              </button>
              <button
                onClick={onOpenLeaderboard}
                className="px-5 py-3 bg-purple-900/80 hover:bg-purple-800 text-cyan-300 border border-cyan-500/40 font-orbitron text-xs rounded-lg cursor-pointer flex items-center space-x-2"
              >
                <Award className="w-4 h-4" />
                <span>HIGH SCORES</span>
              </button>
            </div>
          </div>
        )}

        {/* VICTORY WAVE CLEARED OVERLAY */}
        {gameState === 'VICTORY' && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
            <h2 className="text-2xl md:text-4xl font-black font-orbitron text-cyan-400 text-glow-cyan mb-2">
              WAVE {stats.level} CLEARED!
            </h2>
            <p className="text-pink-300 font-rajdhani text-sm mb-6">
              EXCELLENT PILOTING! INVADERS DEFEATED.
            </p>
            <button
              onClick={startNextLevel}
              className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-arcade text-xs md:text-sm tracking-widest rounded-lg box-glow-cyan cursor-pointer flex items-center space-x-3 transform hover:scale-105"
            >
              <Sparkles className="w-5 h-5" />
              <span>START WAVE {stats.level + 1}</span>
            </button>
          </div>
        )}
      </div>

      {/* MOBILE / TOUCH ONSCREEN ARCADE CONTROLS */}
      <div className="w-full max-w-[800px] mt-2 bg-[#12002b] border border-purple-500/30 rounded-xl p-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button
            onMouseDown={() => handleTouchLeft(true)}
            onMouseUp={() => handleTouchLeft(false)}
            onTouchStart={() => handleTouchLeft(true)}
            onTouchEnd={() => handleTouchLeft(false)}
            className="w-14 h-12 bg-purple-900/80 hover:bg-purple-800 active:bg-pink-600 border border-purple-500/50 rounded-lg text-white font-orbitron font-bold text-lg flex items-center justify-center shadow-md cursor-pointer select-none"
          >
            ◄
          </button>
          <button
            onMouseDown={() => handleTouchRight(true)}
            onMouseUp={() => handleTouchRight(false)}
            onTouchStart={() => handleTouchRight(true)}
            onTouchEnd={() => handleTouchRight(false)}
            className="w-14 h-12 bg-purple-900/80 hover:bg-purple-800 active:bg-pink-600 border border-purple-500/50 rounded-lg text-white font-orbitron font-bold text-lg flex items-center justify-center shadow-md cursor-pointer select-none"
          >
            ►
          </button>
        </div>

        <div className="flex items-center space-x-2">
          {gameState === 'PLAYING' ? (
            <button
              onClick={() => setGameState('PAUSED')}
              className="px-3 py-2 bg-purple-950 border border-purple-700 hover:bg-purple-900 text-purple-300 text-xs font-rajdhani rounded cursor-pointer"
            >
              PAUSE
            </button>
          ) : gameState === 'PAUSED' ? (
            <button
              onClick={() => setGameState('PLAYING')}
              className="px-3 py-2 bg-pink-900 border border-pink-700 hover:bg-pink-800 text-pink-200 text-xs font-rajdhani rounded cursor-pointer"
            >
              RESUME
            </button>
          ) : null}

          <button
            onClick={startNewGame}
            className="px-3 py-2 bg-purple-950 border border-purple-700 hover:bg-purple-900 text-purple-300 text-xs font-rajdhani rounded cursor-pointer"
          >
            RESTART
          </button>
        </div>

        <button
          onClick={handleTouchShoot}
          className="w-24 h-12 bg-gradient-to-r from-pink-600 to-purple-600 active:from-pink-500 active:to-purple-500 border border-pink-400 rounded-lg text-white font-arcade text-xs tracking-wider box-glow-pink flex items-center justify-center cursor-pointer select-none"
        >
          FIRE
        </button>
      </div>
    </div>
  );
};

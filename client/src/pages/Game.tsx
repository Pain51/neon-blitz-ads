import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Pause, Star, X } from 'lucide-react';
import { DPad } from '@/components/game/DPad';
import { UpgradeMenu } from '@/components/game/UpgradeMenu';
import { GameOverMenu } from '@/components/game/GameOverMenu';

// --- GAME CONSTANTS ---
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const PLAYER_SIZE = 24;
const BULLET_SIZE_BASE = 6;
const ENEMY_SIZE_NORMAL = 24;
const ENEMY_SIZE_BOSS = 60;
const XP_GEM_SIZE = 10;

// Colors
const COLOR_PLAYER = '#ec4899'; // Pink
const COLOR_BULLET = '#fbbf24'; // Amber
const COLOR_ENEMY = '#ef4444';  // Red
const COLOR_BOSS = '#7f1d1d';   // Dark Red
const COLOR_SPECIAL = '#a855f7'; // Purple
const COLOR_XP = '#22c55e';     // Green

interface Entity {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  hp: number;
  maxHp: number;
  type?: 'normal' | 'special' | 'boss';
  xpValue?: number;
  id: number;
}

interface Bullet extends Entity {
  pierce: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

export default function Game() {
  const [, setLocation] = useLocation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Game State Refs (Mutable for game loop performance)
  const gameState = useRef({
    score: 0,
    level: 1,
    xp: 0,
    xpToNextLevel: 100,
    isPaused: false,
    isGameOver: false,
    lastTime: 0,
    spawnTimer: 0,
    spawnInterval: 1000, // ms
    shootTimer: 0,
    revivesLeft: 3,
    
    // Player Stats
    player: {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT / 2,
      vx: 0,
      vy: 0,
      hp: 100,
      maxHp: 100,
      radius: PLAYER_SIZE / 2,
      speed: 200, // px per second
      fireRate: 0.3, // seconds between shots
      bulletSpeed: 400,
      bulletSize: BULLET_SIZE_BASE,
      pierce: 1,
      angle: 0, // shooting angle
      lastMoveAngle: 0, // for auto-aim direction if stationary
      regen: 0.5, // HP per second
    },

    keys: { w: false, a: false, s: false, d: false },
    bullets: [] as Bullet[],
    enemies: [] as Entity[],
    xpGems: [] as Entity[],
    particles: [] as Particle[],
  });

  // React State for UI updates (keep minimal to avoid re-renders)
  const [uiState, setUiState] = useState({
    score: 0,
    level: 1,
    hp: 100,
    maxHp: 100,
    xp: 0,
    xpToNextLevel: 100,
    isPaused: false,
    showUpgrade: false,
    isGameOver: false,
    revivesLeft: 3
  });

  // --- GAME LOOP ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const spawnEnemy = () => {
      const state = gameState.current;
      const isBoss = state.level % 5 === 0 && state.enemies.filter(e => e.type === 'boss').length === 0;
      const isSpecial = state.level % 2 === 0 && !isBoss && Math.random() < 0.3;
      
      let type: 'normal' | 'special' | 'boss' = 'normal';
      let radius = ENEMY_SIZE_NORMAL / 2;
      let hp = 10 + (state.level * 5);
      let speed = 100 + (state.level * 2);
      let color = COLOR_ENEMY;
      let xpValue = 10;

      if (isBoss) {
        type = 'boss';
        radius = ENEMY_SIZE_BOSS / 2;
        hp = 500 + (state.level * 50);
        speed = 50;
        color = COLOR_BOSS;
        xpValue = 500;
      } else if (isSpecial) {
        type = 'special';
        color = COLOR_SPECIAL;
        hp *= 2;
        xpValue = 50;
      }

      // Spawn at edge
      let x, y;
      const side = Math.floor(Math.random() * 4); // 0:top, 1:right, 2:bottom, 3:left
      switch(side) {
        case 0: x = Math.random() * CANVAS_WIDTH; y = -radius; break;
        case 1: x = CANVAS_WIDTH + radius; y = Math.random() * CANVAS_HEIGHT; break;
        case 2: x = Math.random() * CANVAS_WIDTH; y = CANVAS_HEIGHT + radius; break;
        default: x = -radius; y = Math.random() * CANVAS_HEIGHT; break;
      }

      state.enemies.push({
        id: Math.random(),
        x, y, vx: 0, vy: 0,
        radius, hp, maxHp: hp, color, type, xpValue
      });
    };

    const createExplosion = (x: number, y: number, color: string, count: number) => {
      for (let i = 0; i < count; i++) {
        gameState.current.particles.push({
          x, y,
          vx: (Math.random() - 0.5) * 200,
          vy: (Math.random() - 0.5) * 200,
          life: 0.5 + Math.random() * 0.5,
          color,
          size: Math.random() * 3 + 1
        });
      }
    };

    const update = (dt: number) => {
      const state = gameState.current;
      if (state.isPaused || state.isGameOver) return;

      // 1. Player Movement
      let dx = 0;
      let dy = 0;
      if (state.keys.w) dy -= 1;
      if (state.keys.s) dy += 1;
      if (state.keys.a) dx -= 1;
      if (state.keys.d) dx += 1;

      // Passive Regeneration
      if (state.player.hp < state.player.maxHp) {
        state.player.hp = Math.min(state.player.maxHp, state.player.hp + state.player.regen * dt);
        setUiState(s => ({ ...s, hp: state.player.hp }));
      }

      // Normalize diagonal
      if (dx !== 0 || dy !== 0) {
        const len = Math.sqrt(dx*dx + dy*dy);
        dx /= len;
        dy /= len;
        state.player.lastMoveAngle = Math.atan2(dy, dx);
      }

      state.player.x += dx * state.player.speed * dt;
      state.player.y += dy * state.player.speed * dt;

      // Bound player
      state.player.x = Math.max(state.player.radius, Math.min(CANVAS_WIDTH - state.player.radius, state.player.x));
      state.player.y = Math.max(state.player.radius, Math.min(CANVAS_HEIGHT - state.player.radius, state.player.y));

      // 2. Shooting
      state.shootTimer -= dt;
      if (state.shootTimer <= 0) {
        state.shootTimer = state.player.fireRate;
        const angle = (dx !== 0 || dy !== 0) ? Math.atan2(dy, dx) : state.player.lastMoveAngle;
        
        state.bullets.push({
          id: Math.random(),
          x: state.player.x,
          y: state.player.y,
          vx: Math.cos(angle) * state.player.bulletSpeed,
          vy: Math.sin(angle) * state.player.bulletSpeed,
          radius: state.player.bulletSize,
          color: COLOR_BULLET,
          hp: 1, maxHp: 1, pierce: state.player.pierce
        });
      }

      // 3. Bullets
      for (let i = state.bullets.length - 1; i >= 0; i--) {
        const b = state.bullets[i];
        b.x += b.vx * dt;
        b.y += b.vy * dt;

        // Remove offscreen
        if (b.x < 0 || b.x > CANVAS_WIDTH || b.y < 0 || b.y > CANVAS_HEIGHT) {
          state.bullets.splice(i, 1);
        }
      }

      // 4. Enemies
      state.spawnTimer -= dt * 1000;
      if (state.spawnTimer <= 0) {
        spawnEnemy();
        // Decrease spawn interval as game progresses
        const difficultyFactor = Math.max(200, 1000 - (state.level * 50));
        state.spawnTimer = difficultyFactor;
      }

      for (let i = state.enemies.length - 1; i >= 0; i--) {
        const e = state.enemies[i];
        const dx = state.player.x - e.x;
        const dy = state.player.y - e.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        // Move towards player
        const speed = e.type === 'boss' ? 30 : 60 + (state.level * 2);
        e.x += (dx / dist) * speed * dt;
        e.y += (dy / dist) * speed * dt;

        // Collision with Player
        if (dist < e.radius + state.player.radius) {
          state.player.hp -= (e.type === 'boss' ? 30 : 10);
          createExplosion(state.player.x, state.player.y, COLOR_PLAYER, 10);
          state.enemies.splice(i, 1); // Enemy dies on impact
          
          if (state.player.hp <= 0) {
            state.player.hp = 0;
            state.isGameOver = true;
            setUiState(s => ({ ...s, isGameOver: true }));
          }
          setUiState(s => ({ ...s, hp: state.player.hp }));
          continue;
        }

        // Collision with Bullets
        for (let j = state.bullets.length - 1; j >= 0; j--) {
          const b = state.bullets[j];
          const dbx = e.x - b.x;
          const dby = e.y - b.y;
          if (Math.sqrt(dbx*dbx + dby*dby) < e.radius + b.radius) {
            e.hp -= 10; // Bullet Damage
            b.pierce--;
            
            // Effect
            createExplosion(b.x, b.y, COLOR_BULLET, 3);

            if (b.pierce <= 0) {
              state.bullets.splice(j, 1);
            }

            if (e.hp <= 0) {
              // Enemy Death
              state.enemies.splice(i, 1);
              state.score += e.xpValue! * 10;
              state.xpGems.push({
                id: Math.random(),
                x: e.x, y: e.y, vx:0, vy:0,
                radius: XP_GEM_SIZE,
                color: COLOR_XP,
                hp: 1, maxHp: 1, xpValue: e.xpValue
              });
              setUiState(s => ({ ...s, score: state.score }));
              break; // Enemy gone, stop checking bullets
            }
          }
        }
      }

      // 5. XP Gems
      for (let i = state.xpGems.length - 1; i >= 0; i--) {
        const g = state.xpGems[i];
        const dx = state.player.x - g.x;
        const dy = state.player.y - g.y;
        const dist = Math.sqrt(dx*dx + dy*dy);

        // Magnet effect when close
        if (dist < 100) {
          g.x += (dx / dist) * 300 * dt;
          g.y += (dy / dist) * 300 * dt;
        }

        if (dist < state.player.radius + g.radius) {
          state.xp += g.xpValue!;
          state.xpGems.splice(i, 1);

          // Level Up Check
          if (state.xp >= state.xpToNextLevel) {
            state.level++;
            state.xp -= state.xpToNextLevel;
            state.xpToNextLevel = Math.floor(state.xpToNextLevel * 1.5);
            state.isPaused = true;
            setUiState(s => ({
              ...s,
              level: state.level,
              xp: state.xp,
              xpToNextLevel: state.xpToNextLevel,
              showUpgrade: true,
              isPaused: true
            }));
          } else {
            setUiState(s => ({ ...s, xp: state.xp, xpToNextLevel: state.xpToNextLevel }));
          }
        }
      }

      // 6. Particles
      for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.life <= 0) state.particles.splice(i, 1);
      }
    };

    const draw = () => {
      const state = gameState.current;
      
      // Clear
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      const gridSize = 50;
      for(let x=0; x<CANVAS_WIDTH; x+=gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_HEIGHT); ctx.stroke();
      }
      for(let y=0; y<CANVAS_HEIGHT; y+=gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_WIDTH, y); ctx.stroke();
      }

      // XP Gems
      state.xpGems.forEach(g => {
        ctx.fillStyle = g.color;
        ctx.beginPath();
        ctx.arc(g.x, g.y, g.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 5;
        ctx.shadowColor = g.color;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Bullets
      state.bullets.forEach(b => {
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // Enemies
      state.enemies.forEach(e => {
        ctx.fillStyle = e.color;
        ctx.beginPath();
        if (e.type === 'boss') {
          // Boss: Square with border
          ctx.rect(e.x - e.radius, e.y - e.radius, e.radius*2, e.radius*2);
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.stroke();
        } else {
          ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
          ctx.fill();
        }

        // HP Bar for enemies
        const hpPct = e.hp / e.maxHp;
        if (hpPct < 1) {
          ctx.fillStyle = 'red';
          ctx.fillRect(e.x - 10, e.y - e.radius - 8, 20, 4);
          ctx.fillStyle = '#0f0';
          ctx.fillRect(e.x - 10, e.y - e.radius - 8, 20 * hpPct, 4);
        }
      });

      // Player
      ctx.fillStyle = COLOR_PLAYER;
      ctx.beginPath();
      // Triangle ship
      ctx.moveTo(state.player.x + Math.cos(state.player.lastMoveAngle) * state.player.radius, 
                 state.player.y + Math.sin(state.player.lastMoveAngle) * state.player.radius);
      ctx.lineTo(state.player.x + Math.cos(state.player.lastMoveAngle + 2.6) * state.player.radius, 
                 state.player.y + Math.sin(state.player.lastMoveAngle + 2.6) * state.player.radius);
      ctx.lineTo(state.player.x + Math.cos(state.player.lastMoveAngle - 2.6) * state.player.radius, 
                 state.player.y + Math.sin(state.player.lastMoveAngle - 2.6) * state.player.radius);
      ctx.fill();
      
      // Glow
      ctx.shadowColor = COLOR_PLAYER;
      ctx.shadowBlur = 15;
      ctx.fill();
      ctx.shadowBlur = 0;


      // Particles
      state.particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      });
    };

    const loop = (timestamp: number) => {
      const state = gameState.current;
      if (!state.lastTime) state.lastTime = timestamp;
      const dt = (timestamp - state.lastTime) / 1000;
      state.lastTime = timestamp;

      update(dt);
      draw();
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  // --- KEYBOARD CONTROLS ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const k = gameState.current.keys;
      switch(e.key.toLowerCase()) {
        case 'w': case 'arrowup': k.w = true; break;
        case 's': case 'arrowdown': k.s = true; break;
        case 'a': case 'arrowleft': k.a = true; break;
        case 'd': case 'arrowright': k.d = true; break;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const k = gameState.current.keys;
      switch(e.key.toLowerCase()) {
        case 'w': case 'arrowup': k.w = false; break;
        case 's': case 'arrowdown': k.s = false; break;
        case 'a': case 'arrowleft': k.a = false; break;
        case 'd': case 'arrowright': k.d = false; break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // --- ACTIONS ---
  const handleUpgradeSelect = (id: string) => {
    const state = gameState.current;
    switch(id) {
      case 'fireRate': state.player.fireRate *= 0.85; break;
      case 'moveSpeed': state.player.speed *= 1.1; break;
      case 'bulletSpeed': state.player.bulletSpeed *= 1.2; break;
      case 'bulletSize': state.player.bulletSize *= 1.2; break;
      case 'pierce': state.player.pierce += 1; break;
      case 'regen': state.player.regen += 0.5; break;
    }
    state.isPaused = false;
    setUiState(s => ({ ...s, showUpgrade: false, isPaused: false }));
  };

  const handlePauseToggle = () => {
    if (uiState.showUpgrade || uiState.isGameOver) return;
    const isPaused = !gameState.current.isPaused;
    gameState.current.isPaused = isPaused;
    gameState.current.lastTime = 0; // Reset time to prevent huge dt jump
    setUiState(s => ({ ...s, isPaused }));
  };

  const handleManualUpgradeOpen = () => {
    if (uiState.isGameOver) return;
    gameState.current.isPaused = true;
    setUiState(s => ({ ...s, isPaused: true, showUpgrade: true }));
  };

  const handleVirtualPad = (dx: number, dy: number) => {
    const k = gameState.current.keys;
    k.w = dy < 0;
    k.s = dy > 0;
    k.a = dx < 0;
    k.d = dx > 0;
  };

  const handleRevive = () => {
    const state = gameState.current;
    if (state.revivesLeft > 0) {
      state.revivesLeft--;
      state.isGameOver = false;
      state.player.hp = state.player.maxHp;
      // Nuke nearby enemies
      state.enemies = state.enemies.filter(e => {
        const dist = Math.sqrt((e.x - state.player.x)**2 + (e.y - state.player.y)**2);
        return dist > 300; // clear 300px radius
      });
      state.lastTime = 0;
      setUiState(s => ({ ...s, isGameOver: false, hp: state.player.maxHp, revivesLeft: state.revivesLeft }));
    }
  };

  const handleRestart = () => {
    window.location.reload();
  };

  const handleQuit = () => {
    setLocation('/');
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden flex flex-col">
      {/* HUD HEADER */}
      <div className="absolute top-0 left-0 right-0 p-4 z-10 flex justify-between items-start pointer-events-none">
        <div className="flex flex-col gap-2 w-64">
          {/* Health */}
          <div className="flex items-center gap-2">
            <span className="font-arcade text-xs text-primary">HP</span>
            <div className="h-4 flex-1 bg-zinc-800 rounded-sm overflow-hidden border border-white/10">
              <motion.div 
                className="h-full bg-gradient-to-r from-pink-600 to-pink-400"
                initial={{ width: '100%' }}
                animate={{ width: `${(uiState.hp / uiState.maxHp) * 100}%` }}
              />
            </div>
          </div>
          
          {/* XP Bar */}
          <div className="flex items-center gap-2">
            <span className="font-arcade text-xs text-green-400">LVL {uiState.level}</span>
            <div className="h-2 flex-1 bg-zinc-800 rounded-sm overflow-hidden border border-white/10">
              <motion.div 
                className="h-full bg-green-500"
                initial={{ width: '0%' }}
                animate={{ width: `${(uiState.xp / uiState.xpToNextLevel) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end pointer-events-auto gap-2">
          <div className="font-arcade text-xl text-white text-shadow-neon tracking-widest">
            {Math.floor(uiState.score).toLocaleString().padStart(6, '0')}
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleManualUpgradeOpen}
              className="p-2 rounded bg-yellow-500/20 text-yellow-500 border border-yellow-500/50 hover:bg-yellow-500 hover:text-black transition-colors"
            >
              <Star className="w-6 h-6" />
            </button>
            <button 
              onClick={handlePauseToggle}
              className="p-2 rounded bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-colors"
            >
              <Pause className="w-6 h-6" />
            </button>
            <button 
              onClick={handleQuit}
              className="p-2 rounded bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* PAUSE OVERLAY */}
      {uiState.isPaused && !uiState.showUpgrade && !uiState.isGameOver && (
        <div 
          className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm cursor-pointer"
          onClick={handlePauseToggle}
        >
          <h1 className="text-6xl font-arcade text-white animate-pulse">PAUSED</h1>
        </div>
      )}

      {/* CANVAS LAYER */}
      <div className="flex-1 flex items-center justify-center bg-black scanlines relative">
        <canvas 
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="max-w-full max-h-full object-contain border border-white/5 shadow-2xl"
        />
      </div>

      {/* MOBILE CONTROLS (Overlay on bottom) */}
      <div className="absolute bottom-12 left-0 right-0 z-30 md:hidden flex justify-center pointer-events-none">
        <div className="pointer-events-auto">
          <DPad onDirectionChange={handleVirtualPad} />
        </div>
      </div>

      {/* MENUS */}
      <AnimatePresence>
        {uiState.showUpgrade && (
          <UpgradeMenu onSelect={handleUpgradeSelect} />
        )}
        {uiState.isGameOver && (
          <GameOverMenu 
            score={Math.floor(uiState.score)}
            level={uiState.level}
            revivesLeft={uiState.revivesLeft}
            onRevive={handleRevive}
            onRestart={handleRestart}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

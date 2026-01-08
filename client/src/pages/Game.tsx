import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Pause, Star, X, Gamepad2, Trophy } from 'lucide-react';
import { DPad } from '@/components/game/DPad';
import { Joystick } from '@/components/game/Joystick';
// import { UpgradeMenu } from '@/components/game/UpgradeMenu'; // Removed
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
      lastMoveAngle: 0, // direction for movement sprite
      lastShootAngle: 0, // direction for shooting sprite
      regen: 0.5, // HP per second
    },

    keys: { w: false, a: false, s: false, d: false },
    analogMove: { x: 0, y: 0 },
    analogShoot: { x: 0, y: 0 },
    bullets: [] as Bullet[],
    enemies: [] as Entity[],
    xpGems: [] as Entity[],
    particles: [] as Particle[],
    coins: 0,
    upgradeLevels: {
      fireRate: 0,
      moveSpeed: 0,
      bulletSpeed: 0,
      bulletSize: 0,
      pierce: 0,
      regen: 0,
    } as Record<string, number>,
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
    showTempSkills: false,
    isGameOver: false,
    revivesLeft: 3,
    coins: 0,
    skillPoints: 0,
    controlType: 'dpad' as 'dpad' | 'joystick',
    upgradeLevels: {} as Record<string, number>,
    tempSkills: {
      dmg: 0,
      crit: 0,
      speed: 0,
    } as Record<string, number>,
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
      const params = new URLSearchParams(window.location.search);
      const difficulty = params.get('difficulty') || 'medium';
      
      let statMult = 1.0;
      if (difficulty === 'medium') statMult = 1.15;
      if (difficulty === 'hard') statMult = 1.15 * 1.5;
      if (difficulty === 'extreme') statMult = 1.15 * 1.5 * 3.0;

      const isBoss = state.level % 5 === 0 && state.enemies.filter(e => e.type === 'boss').length === 0;
      const isSpecial = state.level % 2 === 0 && !isBoss && Math.random() < 0.3;
      
      let type: 'normal' | 'special' | 'boss' = 'normal';
      let radius = ENEMY_SIZE_NORMAL / 2;
      let hp = 4; // Rojo normal
      let speed = (100 + (state.level * 2)) * (1 + (statMult - 1) * 0.2);
      let color = COLOR_ENEMY;
      let xpValue = 10;

      if (isBoss) {
        type = 'boss';
        radius = ENEMY_SIZE_BOSS / 2;
        hp = 40; // Cuadrado grande
        speed = 50;
        color = COLOR_BOSS;
        xpValue = 500;
      } else if (isSpecial) {
        type = 'special';
        color = COLOR_SPECIAL;
        hp = 8; // Morado
        xpValue = 50;
      }
      
      hp *= statMult; // Aplicar dificultad sobre la nueva base

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

      // Check for analog input first (Joystick)
      if (state.analogMove.x !== 0 || state.analogMove.y !== 0) {
        dx = state.analogMove.x;
        dy = state.analogMove.y;
      } else {
        // Fallback to keyboard
        if (state.keys.w) dy -= 1;
        if (state.keys.s) dy += 1;
        if (state.keys.a) dx -= 1;
        if (state.keys.d) dx += 1;
      }

      if (dx !== 0 || dy !== 0) {
        const len = Math.sqrt(dx*dx + dy*dy);
        // Normalize if combined magnitude > 1
        const moveX = dx / (len > 1 ? len : 1);
        const moveY = dy / (len > 1 ? len : 1);
        
        state.player.x += moveX * state.player.speed * dt;
        state.player.y += moveY * state.player.speed * dt;
        state.player.lastMoveAngle = Math.atan2(moveY, moveX);
      }

      // Passive Regeneration
      if (state.player.hp < state.player.maxHp) {
        state.player.hp = Math.min(state.player.maxHp, state.player.hp + state.player.regen * dt);
        setUiState(s => ({ ...s, hp: state.player.hp }));
      }
      
      // Bound player
      state.player.x = Math.max(state.player.radius, Math.min(CANVAS_WIDTH - state.player.radius, state.player.x));
      state.player.y = Math.max(state.player.radius, Math.min(CANVAS_HEIGHT - state.player.radius, state.player.y));

      // 2. Shooting
      state.shootTimer -= dt;
      if (state.shootTimer <= 0) {
        let shootAngle = state.player.lastShootAngle || state.player.lastMoveAngle;
        
        if (state.analogShoot.x !== 0 || state.analogShoot.y !== 0) {
          shootAngle = Math.atan2(state.analogShoot.y, state.analogShoot.x);
          state.player.lastShootAngle = shootAngle;
        } else if (dx !== 0 || dy !== 0) {
          shootAngle = Math.atan2(dy, dx);
          state.player.lastShootAngle = shootAngle;
        }

        state.shootTimer = state.player.fireRate;
        const angle = shootAngle;
        
        const weaponType = new URLSearchParams(window.location.search).get('weapon') || 'normal';

        if (weaponType === 'laser') {
          state.bullets.push({
            id: Math.random(),
            x: state.player.x, y: state.player.y,
            vx: Math.cos(angle) * state.player.bulletSpeed * 2,
            vy: Math.sin(angle) * state.player.bulletSpeed * 2,
            radius: 2, color: '#00ffff',
            hp: 1, maxHp: 1, pierce: 10
          });
          state.shootTimer = 0.05; // Fast firing laser
        } else if (weaponType === 'shotgun') {
          for (let i = -3; i <= 3; i++) {
            const spreadAngle = angle + (i * 0.12);
            state.bullets.push({
              id: Math.random(),
              x: state.player.x, y: state.player.y,
              vx: Math.cos(spreadAngle) * state.player.bulletSpeed,
              vy: Math.sin(spreadAngle) * state.player.bulletSpeed,
              radius: state.player.bulletSize,
              color: COLOR_BULLET,
              hp: 1, maxHp: 1, pierce: state.player.pierce
            });
          }
          state.shootTimer = state.player.fireRate * 2;
        } else {
          state.bullets.push({
            id: Math.random(),
            x: state.player.x, y: state.player.y,
            vx: Math.cos(angle) * state.player.bulletSpeed,
            vy: Math.sin(angle) * state.player.bulletSpeed,
            radius: state.player.bulletSize,
            color: COLOR_BULLET,
            hp: 1, maxHp: 1, pierce: state.player.pierce
          });
        }
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
            const weaponType = new URLSearchParams(window.location.search).get('weapon') || 'normal';
            let baseDamage = 2; // Daño base normal solicitado
            if (weaponType === 'laser') baseDamage = 0.3;
            if (weaponType === 'shotgun') baseDamage = 0.5;

            const saved = localStorage.getItem('permanentUpgrades');
            const perms = saved ? JSON.parse(saved) : { baseDmg: 0 };
            const finalDamage = baseDamage + (perms.baseDmg * 0.5) + (uiState.tempSkills.dmg * 1);
            const isCrit = Math.random() < (uiState.tempSkills.crit * 0.05);
            
            e.hp -= isCrit ? finalDamage * 2 : finalDamage;
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
          const coinsEarned = Math.floor(g.xpValue! / 2);
          state.coins += coinsEarned;
          // Update total gold in localStorage
          const currentTotal = parseInt(localStorage.getItem('goldCoins') || '0');
          localStorage.setItem('goldCoins', (currentTotal + coinsEarned).toString());
          state.xpGems.splice(i, 1);

          // Level Up Check
          if (state.xp >= state.xpToNextLevel) {
            state.level++;
            state.xp -= state.xpToNextLevel;
            state.xpToNextLevel = Math.floor(state.xpToNextLevel * 1.5);
            state.isPaused = true;
            
            // Gain skill point every level
            setUiState(s => ({
              ...s,
              level: state.level,
              xp: state.xp,
              xpToNextLevel: state.xpToNextLevel,
              showTempSkills: true, // Show skills menu instead of basic upgrade
              isPaused: true,
              coins: state.coins,
              skillPoints: s.skillPoints + 1,
              upgradeLevels: { ...state.upgradeLevels }
            }));
          } else {
            setUiState(s => ({ 
              ...s, 
              xp: state.xp, 
              xpToNextLevel: state.xpToNextLevel,
              coins: state.coins 
            }));
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
      const params = new URLSearchParams(window.location.search);
      const skinId = params.get('skin') || 'pink';
      
      const skinColors: Record<string, string> = {
        pink: '#ec4899',
        cyan: '#06b6d4',
        yellow: '#eab308',
        green: '#22c55e'
      };
      
      const skinShapes: Record<string, 'triangle' | 'diamond' | 'circle'> = {
        pink: 'triangle',
        cyan: 'diamond',
        yellow: 'circle',
        green: 'triangle'
      };

      const playerColor = skinColors[skinId] || COLOR_PLAYER;
      const playerShape = skinShapes[skinId] || 'triangle';
      
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
      ctx.fillStyle = playerColor;
      ctx.beginPath();
      // Triangle ship - use lastShootAngle for rotation
      const drawAngle = state.player.lastShootAngle || state.player.lastMoveAngle;
      
      if (playerShape === 'triangle') {
        ctx.moveTo(state.player.x + Math.cos(drawAngle) * state.player.radius, 
                   state.player.y + Math.sin(drawAngle) * state.player.radius);
        ctx.lineTo(state.player.x + Math.cos(drawAngle + 2.6) * state.player.radius, 
                   state.player.y + Math.sin(drawAngle + 2.6) * state.player.radius);
        ctx.lineTo(state.player.x + Math.cos(drawAngle - 2.6) * state.player.radius, 
                   state.player.y + Math.sin(drawAngle - 2.6) * state.player.radius);
      } else if (playerShape === 'diamond') {
        ctx.moveTo(state.player.x + Math.cos(drawAngle) * state.player.radius * 1.2, 
                   state.player.y + Math.sin(drawAngle) * state.player.radius * 1.2);
        ctx.lineTo(state.player.x + Math.cos(drawAngle + Math.PI/2) * state.player.radius * 0.8, 
                   state.player.y + Math.sin(drawAngle + Math.PI/2) * state.player.radius * 0.8);
        ctx.lineTo(state.player.x + Math.cos(drawAngle + Math.PI) * state.player.radius * 0.8, 
                   state.player.y + Math.sin(drawAngle + Math.PI) * state.player.radius * 0.8);
        ctx.lineTo(state.player.x + Math.cos(drawAngle - Math.PI/2) * state.player.radius * 0.8, 
                   state.player.y + Math.sin(drawAngle - Math.PI/2) * state.player.radius * 0.8);
      } else {
        ctx.arc(state.player.x, state.player.y, state.player.radius, 0, Math.PI * 2);
      }
      
      ctx.fill();
      
      // Glow
      ctx.shadowColor = playerColor;
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
      // Use performance.now() for high precision time tracking
      const now = performance.now();
      if (!state.lastTime) state.lastTime = now;
      const dt = Math.min(0.032, (now - state.lastTime) / 1000); // Cap dt to prevent jumps
      state.lastTime = now;

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
      // Clear analog move values on keyboard input
      const state = gameState.current;
      state.analogMove.x = 0;
      state.analogMove.y = 0;

      if (e.code === 'Space') {
        e.preventDefault();
        setUiState(prev => {
          const newPaused = !prev.isPaused;
          gameState.current.isPaused = newPaused;
          // Space only pauses, no menu opening here
          return { 
            ...prev, 
            isPaused: newPaused
          };
        });
      }
      const k = gameState.current.keys;
      switch(e.key.toLowerCase()) {
        case 'w': case 'arrowup': k.w = true; break;
        case 's': case 'arrowdown': k.s = true; break;
        case 'a': case 'arrowleft': k.a = true; break;
        case 'd': case 'arrowright': k.d = true; break;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const k_up = gameState.current.keys;
      switch(e.key.toLowerCase()) {
        case 'w': case 'arrowup': k_up.w = false; break;
        case 's': case 'arrowdown': k_up.s = false; break;
        case 'a': case 'arrowleft': k_up.a = false; break;
        case 'd': case 'arrowright': k_up.d = false; break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    // Apply Permanent Upgrades
    const saved = localStorage.getItem('permanentUpgrades');
    if (saved) {
      const perms = JSON.parse(saved);
      gameState.current.player.maxHp += perms.baseHp * 20;
      gameState.current.player.hp = gameState.current.player.maxHp;
      gameState.current.player.speed += perms.baseSpeed * 20;
      // Damage handled in bullet collision or bullet damage stat
    }
  }, []);

  // --- ACTIONS ---
  const handleUpgradeSelect = (id: string) => {
    const state = gameState.current;
    state.upgradeLevels[id] = (state.upgradeLevels[id] || 0) + 1;
    
    switch(id) {
      case 'fireRate': state.player.fireRate *= 0.85; break;
      case 'moveSpeed': state.player.speed *= 1.1; break;
      case 'bulletSpeed': state.player.bulletSpeed *= 1.2; break;
      case 'bulletSize': state.player.bulletSize *= 1.2; break;
      case 'pierce': state.player.pierce += 1; break;
      case 'regen': state.player.regen += 0.5; break;
    }
    state.isPaused = false;
    setUiState(s => ({ 
      ...s, 
      showUpgrade: false, 
      isPaused: false,
      upgradeLevels: { ...state.upgradeLevels }
    }));
  };

  const toggleControls = () => {
    setUiState(s => ({
      ...s,
      controlType: s.controlType === 'dpad' ? 'joystick' : 'dpad'
    }));
  };

  const handlePauseToggle = () => {
    if (uiState.showUpgrade || uiState.isGameOver) return;
    const isPaused = !gameState.current.isPaused;
    gameState.current.isPaused = isPaused;
    gameState.current.lastTime = 0; // Reset time to prevent huge dt jump
    setUiState(s => ({ ...s, isPaused }));
  };

  const handleManualUpgradeOpen = () => {
    if (uiState.isGameOver || uiState.skillPoints <= 0) return;
    gameState.current.isPaused = true;
    setUiState(s => ({ ...s, isPaused: true, showTempSkills: true }));
  };

    const handleMoveJoystick = (dx: number, dy: number) => {
      const state = gameState.current;
      state.analogMove.x = dx;
      state.analogMove.y = dy;
      
      // Update binary keys for legacy logic if needed
      state.keys.w = dy < -0.3;
      state.keys.s = dy > 0.3;
      state.keys.a = dx < -0.3;
      state.keys.d = dx > 0.3;
    };

    const handleShootJoystick = (dx: number, dy: number) => {
      const state = gameState.current;
      state.analogShoot.x = dx;
      state.analogShoot.y = dy;
      
      // Update direction immediately
      if (dx !== 0 || dy !== 0) {
        state.player.lastShootAngle = Math.atan2(dy, dx);
      }
    };

  const handleVirtualPad = (dx: number, dy: number) => {
    handleMoveJoystick(dx, dy);
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
          <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded border border-yellow-500/30">
            <Star className="w-4 h-4 text-yellow-500" />
            <span className="font-arcade text-sm text-yellow-500">{Math.floor(uiState.coins)}</span>
          </div>
          <div className="font-arcade text-xl text-white text-shadow-neon tracking-widest">
            {Math.floor(uiState.score).toLocaleString().padStart(6, '0')}
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => {
                if (uiState.skillPoints > 0) {
                  handleManualUpgradeOpen();
                }
              }}
              disabled={uiState.skillPoints <= 0}
              className={`p-2 rounded border border-blue-500/50 transition-all ${uiState.skillPoints > 0 ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white animate-pulse' : 'bg-zinc-800/50 text-zinc-600 opacity-50 cursor-not-allowed'}`}
            >
              <Star className="w-6 h-6" />
            </button>
            <button 
              onClick={toggleControls}
              className="p-2 rounded bg-blue-500/20 text-blue-400 border border-blue-500/50 hover:bg-blue-500 hover:text-white transition-colors"
              title="Toggle Controls"
            >
              <Gamepad2 className="w-6 h-6" />
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
      <div className="absolute bottom-4 left-0 right-0 z-30 md:hidden flex justify-between px-8 pointer-events-none">
        <div className="pointer-events-auto scale-75 origin-bottom-left">
          {uiState.controlType === 'dpad' ? (
            <DPad onDirectionChange={handleMoveJoystick} />
          ) : (
            <Joystick onDirectionChange={handleMoveJoystick} />
          )}
        </div>
        
        {uiState.controlType === 'joystick' && (
          <div className="pointer-events-auto scale-75 origin-bottom-right">
            <Joystick onDirectionChange={handleShootJoystick} />
          </div>
        )}
      </div>

      {/* MENUS */}
      <AnimatePresence>
        {uiState.showTempSkills && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-md bg-zinc-900 border-2 border-blue-500 rounded-xl p-6 shadow-[0_0_20px_rgba(59,130,246,0.5)]"
            >
              <h2 className="text-2xl font-arcade text-blue-500 text-center mb-6">SKILL POINTS: {uiState.skillPoints}</h2>
              <div className="grid gap-4">
                {[
                  { id: 'dmg', label: 'Damage', icon: <Star className="text-red-500" /> },
                  { id: 'crit', label: 'Crit Chance', icon: <Star className="text-yellow-500" /> },
                  { id: 'speed', label: 'Speed', icon: <Star className="text-blue-500" /> },
                ].map(skill => (
                  <button
                    key={skill.id}
                    onClick={() => {
                      if (uiState.skillPoints > 0) {
                        setUiState(s => {
                          const nextSkillPoints = s.skillPoints - 1;
                          const shouldClose = nextSkillPoints === 0;
                          
                          if (shouldClose) {
                            gameState.current.isPaused = false;
                          }

                          return {
                            ...s,
                            skillPoints: nextSkillPoints,
                            tempSkills: { ...s.tempSkills, [skill.id]: (s.tempSkills[skill.id] || 0) + 1 },
                            showTempSkills: !shouldClose,
                            isPaused: !shouldClose
                          };
                        });
                      }
                    }}
                    className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10"
                  >
                    <div className="flex items-center gap-3">
                      {skill.icon}
                      <span className="font-bold">{skill.label}</span>
                    </div>
                    <span className="font-arcade text-xs">LVL {uiState.tempSkills[skill.id] || 0}</span>
                  </button>
                ))}
                <button 
                  onClick={() => setUiState(s => ({ ...s, showTempSkills: false, isPaused: false }))}
                  className="mt-4 p-2 font-arcade text-xs text-muted-foreground underline"
                >
                  CLOSE
                </button>
              </div>
            </motion.div>
          </div>
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

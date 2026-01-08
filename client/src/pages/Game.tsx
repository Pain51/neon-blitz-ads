import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Pause, Star, X, Gamepad2, Trophy } from 'lucide-react';
import { DPad } from '@/components/game/DPad';
import { Joystick } from '@/components/game/Joystick';
import { GameOverMenu } from '@/components/game/GameOverMenu';

import enemyNormalImg from '@assets/generated_images/neon_red_pixel-art_enemy_drone.png';
import enemySpecialImg from '@assets/generated_images/neon_purple_pixel-art_special_enemy.png';
import enemyBossImg from '@assets/generated_images/neon_dark-red_pixel-art_boss_tank.png';

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
  
  const enemyNormalImgRef = useRef<HTMLImageElement | null>(null);
  const enemySpecialImgRef = useRef<HTMLImageElement | null>(null);
  const enemyBossImgRef = useRef<HTMLImageElement | null>(null);

  // Game State Refs
  const gameState = useRef({
    score: 0,
    level: 1,
    xp: 0,
    xpToNextLevel: 100,
    isPaused: false,
    isGameOver: false,
    lastTime: 0,
    spawnTimer: 0,
    spawnInterval: 1000,
    shootTimer: 0,
    revivesLeft: 3,
    
    player: {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT / 2,
      vx: 0,
      vy: 0,
      hp: 100,
      maxHp: 100,
      radius: PLAYER_SIZE / 2,
      speed: 200,
      fireRate: 0.3,
      bulletSpeed: 400,
      bulletSize: BULLET_SIZE_BASE,
      pierce: 1,
      angle: 0,
      lastMoveAngle: 0,
      lastShootAngle: 0,
      regen: 0.5,
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

  useEffect(() => {
    const normal = new Image();
    normal.src = enemyNormalImg;
    enemyNormalImgRef.current = normal;

    const special = new Image();
    special.src = enemySpecialImg;
    enemySpecialImgRef.current = special;

    const boss = new Image();
    boss.src = enemyBossImg;
    enemyBossImgRef.current = boss;
  }, []);

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
      let hp = 4;
      let speed = (100 + (state.level * 2)) * (1 + (statMult - 1) * 0.2);
      let color = COLOR_ENEMY;
      let xpValue = 10;

      if (isBoss) {
        type = 'boss';
        radius = ENEMY_SIZE_BOSS / 2;
        hp = 40;
        speed = 50;
        color = COLOR_BOSS;
        xpValue = 500;
      } else if (isSpecial) {
        type = 'special';
        color = COLOR_SPECIAL;
        hp = 8;
        xpValue = 50;
      }
      
      hp *= statMult;

      let x, y;
      const side = Math.floor(Math.random() * 4);
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

      let dx = 0;
      let dy = 0;

      if (state.analogMove.x !== 0 || state.analogMove.y !== 0) {
        dx = state.analogMove.x;
        dy = state.analogMove.y;
      } else {
        if (state.keys.w) dy -= 1;
        if (state.keys.s) dy += 1;
        if (state.keys.a) dx -= 1;
        if (state.keys.d) dx += 1;
      }

      if (dx !== 0 || dy !== 0) {
        const len = Math.sqrt(dx*dx + dy*dy);
        const moveX = dx / (len > 1 ? len : 1);
        const moveY = dy / (len > 1 ? len : 1);
        
        state.player.x += moveX * state.player.speed * dt;
        state.player.y += moveY * state.player.speed * dt;
        state.player.lastMoveAngle = Math.atan2(moveY, moveX);
      }

      if (state.player.hp < state.player.maxHp) {
        state.player.hp = Math.min(state.player.maxHp, state.player.hp + state.player.regen * dt);
        setUiState(s => ({ ...s, hp: state.player.hp }));
      }
      
      state.player.x = Math.max(state.player.radius, Math.min(CANVAS_WIDTH - state.player.radius, state.player.x));
      state.player.y = Math.max(state.player.radius, Math.min(CANVAS_HEIGHT - state.player.radius, state.player.y));

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
          state.shootTimer = 0.05;
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

      for (let i = state.bullets.length - 1; i >= 0; i--) {
        const b = state.bullets[i];
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        if (b.x < 0 || b.x > CANVAS_WIDTH || b.y < 0 || b.y > CANVAS_HEIGHT) {
          state.bullets.splice(i, 1);
        }
      }

      state.spawnTimer -= dt * 1000;
      if (state.spawnTimer <= 0) {
        spawnEnemy();
        const difficultyFactor = Math.max(200, 1000 - (state.level * 50));
        state.spawnTimer = difficultyFactor;
      }

      for (let i = state.enemies.length - 1; i >= 0; i--) {
        const e = state.enemies[i];
        const dx = state.player.x - e.x;
        const dy = state.player.y - e.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        const speed = e.type === 'boss' ? 30 : 60 + (state.level * 2);
        e.x += (dx / dist) * speed * dt;
        e.y += (dy / dist) * speed * dt;

        if (dist < e.radius + state.player.radius) {
          state.player.hp -= (e.type === 'boss' ? 30 : 10);
          createExplosion(state.player.x, state.player.y, COLOR_PLAYER, 10);
          state.enemies.splice(i, 1);
          if (state.player.hp <= 0) {
            state.player.hp = 0;
            state.isGameOver = true;
            setUiState(s => ({ ...s, isGameOver: true }));
          }
          setUiState(s => ({ ...s, hp: state.player.hp }));
          continue;
        }

        for (let j = state.bullets.length - 1; j >= 0; j--) {
          const b = state.bullets[j];
          const dbx = e.x - b.x;
          const dby = e.y - b.y;
          if (Math.sqrt(dbx*dbx + dby*dby) < e.radius + b.radius) {
            const weaponType = new URLSearchParams(window.location.search).get('weapon') || 'normal';
            let baseDamage = 2;
            if (weaponType === 'laser') baseDamage = 0.3;
            if (weaponType === 'shotgun') baseDamage = 0.5;

            const saved = localStorage.getItem('permanentUpgrades');
            const perms = saved ? JSON.parse(saved) : { baseDmg: 0 };
            const finalDamage = baseDamage + (perms.baseDmg * 0.5) + (uiState.tempSkills.dmg * 1);
            const isCrit = Math.random() < (uiState.tempSkills.crit * 0.05);
            
            e.hp -= isCrit ? finalDamage * 2 : finalDamage;
            b.pierce--;
            createExplosion(b.x, b.y, COLOR_BULLET, 3);
            if (b.pierce <= 0) state.bullets.splice(j, 1);
            if (e.hp <= 0) {
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
              break;
            }
          }
        }
      }

      for (let i = state.xpGems.length - 1; i >= 0; i--) {
        const g = state.xpGems[i];
        const dx = state.player.x - g.x;
        const dy = state.player.y - g.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 100) {
          g.x += (dx / dist) * 300 * dt;
          g.y += (dy / dist) * 300 * dt;
        }
        if (dist < state.player.radius + g.radius) {
          state.xp += g.xpValue!;
          const coinsEarned = Math.floor(g.xpValue! / 2);
          state.coins += coinsEarned;
          const currentTotal = parseInt(localStorage.getItem('goldCoins') || '0');
          localStorage.setItem('goldCoins', (currentTotal + coinsEarned).toString());
          state.xpGems.splice(i, 1);
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
              showTempSkills: true,
              isPaused: true,
              coins: state.coins,
              skillPoints: s.skillPoints + 1,
              upgradeLevels: { ...state.upgradeLevels }
            }));
          } else {
            setUiState(s => ({ ...s, xp: state.xp, xpToNextLevel: state.xpToNextLevel, coins: state.coins }));
          }
        }
      }

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
        pink: '#ec4899', cyan: '#06b6d4', yellow: '#eab308', green: '#22c55e'
      };
      const skinShapes: Record<string, 'triangle' | 'diamond' | 'circle'> = {
        pink: 'triangle', cyan: 'diamond', yellow: 'circle', green: 'triangle'
      };
      const playerColor = skinColors[skinId] || COLOR_PLAYER;
      const playerShape = skinShapes[skinId] || 'triangle';
      
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      const gridSize = 50;
      for(let x=0; x<CANVAS_WIDTH; x+=gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_HEIGHT); ctx.stroke();
      }
      for(let y=0; y<CANVAS_HEIGHT; y+=gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_WIDTH, y); ctx.stroke();
      }

      state.xpGems.forEach(g => {
        ctx.fillStyle = g.color; ctx.beginPath(); ctx.arc(g.x, g.y, g.radius, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 5; ctx.shadowColor = g.color; ctx.fill(); ctx.shadowBlur = 0;
      });

      state.bullets.forEach(b => {
        ctx.fillStyle = b.color; ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2); ctx.fill();
      });

      state.enemies.forEach(e => {
        const img = e.type === 'boss' ? enemyBossImgRef.current : (e.type === 'special' ? enemySpecialImgRef.current : enemyNormalImgRef.current);
        if (img && img.complete && img.naturalWidth !== 0) {
          ctx.drawImage(img, e.x - e.radius, e.y - e.radius, e.radius * 2, e.radius * 2);
        } else {
          ctx.fillStyle = e.color; ctx.beginPath();
          if (e.type === 'boss') ctx.rect(e.x - e.radius, e.y - e.radius, e.radius*2, e.radius*2);
          else ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
          ctx.fill();
        }
        const hpPct = e.hp / e.maxHp;
        if (hpPct < 1) {
          ctx.fillStyle = 'red'; ctx.fillRect(e.x - 10, e.y - e.radius - 8, 20, 4);
          ctx.fillStyle = '#0f0'; ctx.fillRect(e.x - 10, e.y - e.radius - 8, 20 * hpPct, 4);
        }
      });

      ctx.fillStyle = playerColor;
      ctx.beginPath();
      const drawAngle = state.player.lastShootAngle || state.player.lastMoveAngle;
      if (playerShape === 'triangle') {
        ctx.moveTo(state.player.x + Math.cos(drawAngle) * state.player.radius, state.player.y + Math.sin(drawAngle) * state.player.radius);
        ctx.lineTo(state.player.x + Math.cos(drawAngle + 2.6) * state.player.radius, state.player.y + Math.sin(drawAngle + 2.6) * state.player.radius);
        ctx.lineTo(state.player.x + Math.cos(drawAngle - 2.6) * state.player.radius, state.player.y + Math.sin(drawAngle - 2.6) * state.player.radius);
      } else if (playerShape === 'diamond') {
        ctx.moveTo(state.player.x + Math.cos(drawAngle) * state.player.radius * 1.2, state.player.y + Math.sin(drawAngle) * state.player.radius * 1.2);
        ctx.lineTo(state.player.x + Math.cos(drawAngle + Math.PI/2) * state.player.radius * 0.8, state.player.y + Math.sin(drawAngle + Math.PI/2) * state.player.radius * 0.8);
        ctx.lineTo(state.player.x + Math.cos(drawAngle + Math.PI) * state.player.radius * 0.8, state.player.y + Math.sin(drawAngle + Math.PI) * state.player.radius * 0.8);
        ctx.lineTo(state.player.x + Math.cos(drawAngle - Math.PI/2) * state.player.radius * 0.8, state.player.y + Math.sin(drawAngle - Math.PI/2) * state.player.radius * 0.8);
      } else {
        ctx.arc(state.player.x, state.player.y, state.player.radius, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.shadowColor = playerColor; ctx.shadowBlur = 15; ctx.fill(); ctx.shadowBlur = 0;

      state.particles.forEach(p => {
        ctx.fillStyle = p.color; ctx.globalAlpha = p.life; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
      });
    };

    const loop = () => {
      const state = gameState.current;
      const now = performance.now();
      if (!state.lastTime) state.lastTime = now;
      const dt = Math.min(0.032, (now - state.lastTime) / 1000);
      state.lastTime = now;
      update(dt);
      draw();
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [uiState.tempSkills]); // Added dependency to reflect dmg changes

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const state = gameState.current;
      state.analogMove.x = 0; state.analogMove.y = 0;
      if (e.code === 'Space') {
        e.preventDefault();
        setUiState(prev => {
          const newPaused = !prev.isPaused;
          gameState.current.isPaused = newPaused;
          return { ...prev, isPaused: newPaused };
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
    return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); };
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('permanentUpgrades');
    if (saved) {
      const perms = JSON.parse(saved);
      gameState.current.player.maxHp += perms.baseHp * 20;
      gameState.current.player.hp = gameState.current.player.maxHp;
      gameState.current.player.speed += perms.baseSpeed * 20;
    }
  }, []);

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
    setUiState(s => ({ ...s, showUpgrade: false, isPaused: false, upgradeLevels: { ...state.upgradeLevels } }));
  };

  const handlePauseToggle = () => {
    if (uiState.showUpgrade || uiState.isGameOver) return;
    const isPaused = !gameState.current.isPaused;
    gameState.current.isPaused = isPaused;
    gameState.current.lastTime = 0;
    setUiState(s => ({ ...s, isPaused }));
  };

  const handleMoveJoystick = (dx: number, dy: number) => {
    const state = gameState.current;
    state.analogMove.x = dx; state.analogMove.y = dy;
    state.keys.w = dy < -0.3; state.keys.s = dy > 0.3;
    state.keys.a = dx < -0.3; state.keys.d = dx > 0.3;
  };

  const handleShootJoystick = (dx: number, dy: number) => {
    const state = gameState.current;
    state.analogShoot.x = dx; state.analogShoot.y = dy;
    if (dx !== 0 || dy !== 0) state.player.lastShootAngle = Math.atan2(dy, dx);
  };

  const handleRevive = () => {
    const state = gameState.current;
    if (state.revivesLeft > 0) {
      state.revivesLeft--; state.isGameOver = false; state.player.hp = state.player.maxHp;
      state.enemies = state.enemies.filter(e => Math.sqrt((e.x - state.player.x)**2 + (e.y - state.player.y)**2) > 300);
      state.lastTime = 0;
      setUiState(s => ({ ...s, isGameOver: false, hp: state.player.hp, revivesLeft: state.revivesLeft }));
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0a] text-white overflow-hidden font-press-start select-none">
      <header className="flex justify-between items-center p-2 md:p-4 border-b border-white/10 bg-black/50 backdrop-blur-md">
        <div className="flex flex-col gap-0 md:gap-1">
          <div className="flex items-center gap-1 md:gap-2">
            <Star className="w-4 h-4 md:w-5 md:h-5 text-yellow-400 fill-yellow-400" />
            <span className="text-sm md:text-xl">{uiState.score.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1 text-[8px] md:text-xs text-green-400">
            <Trophy className="w-2 h-2 md:w-3 md:h-3" />
            <span>NVL {uiState.level}</span>
          </div>
        </div>
        
        <div className="flex flex-col items-center gap-1 md:gap-2 flex-1 max-w-[120px] md:max-w-xs px-2 md:px-4">
          <div className="w-full h-3 md:h-4 bg-gray-800 rounded-full border border-white/20 relative overflow-hidden">
            <div className="h-full bg-blue-500 shadow-[0_0_10px_#3b82f6] transition-all duration-300" style={{ width: `${(uiState.xp / uiState.xpToNextLevel) * 100}%` }} />
            <span className="absolute inset-0 flex items-center justify-center text-[6px] md:text-[8px] uppercase tracking-wider font-bold">XP: {uiState.xpToNextLevel - uiState.xp}</span>
          </div>
          <div className="w-full h-3 md:h-4 bg-gray-800 rounded-full border border-white/20 relative overflow-hidden">
            <div className="h-full bg-red-500 shadow-[0_0_10px_#ef4444] transition-all duration-300" style={{ width: `${(uiState.hp / uiState.maxHp) * 100}%` }} />
            <span className="absolute inset-0 flex items-center justify-center text-[6px] md:text-[8px] uppercase tracking-wider font-bold">HP: {Math.ceil(uiState.hp)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1 md:gap-2 text-yellow-500">
              <span className="text-xs md:text-sm">{uiState.coins}</span>
              <div className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-yellow-500 border border-yellow-300 shadow-[0_0_5px_#eab308]" />
            </div>
          </div>
          <button onClick={handlePauseToggle} className="p-1 md:p-2 hover:bg-white/10 rounded-lg transition-colors border border-white/10">
            <Pause className="w-4 h-4 md:w-6 md:h-6" />
          </button>
        </div>
      </header>

      <main className="flex-1 relative flex items-center justify-center overflow-hidden">
        <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="max-w-full max-h-full border-2 border-white/20 shadow-[0_0_50px_rgba(0,0,0,0.5)]" />
        
        {uiState.controlType === 'dpad' ? (
          <div className="absolute bottom-2 left-2 transform scale-[0.5] md:scale-100 origin-bottom-left z-30"> <DPad onDirectionChange={handleMoveJoystick} /> </div>
        ) : (
          <div className="absolute bottom-10 left-2 transform scale-[0.5] md:scale-100 origin-bottom-left z-30"> <Joystick size={120} onMove={handleMoveJoystick} label="MOVER" /> </div>
        )}
        <div className="absolute bottom-10 right-2 transform scale-[0.5] md:scale-100 origin-bottom-right z-30"> <Joystick size={120} onMove={handleShootJoystick} label="DISPARAR" /> </div>

        <AnimatePresence>
          {uiState.showTempSkills && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-gray-900 border-4 border-blue-500 p-6 rounded-xl max-w-md w-full shadow-[0_0_30px_rgba(59,130,246,0.5)]">
                <h2 className="text-2xl text-blue-400 mb-2 text-center">¡SUBIDA DE NIVEL!</h2>
                <p className="text-xs text-gray-400 mb-6 text-center italic">Elige tu mejora de batalla</p>
                <div className="space-y-4">
                  {[
                    { id: 'dmg', label: 'ATAQUE+', icon: '⚔️', desc: '+1 de Daño' },
                    { id: 'crit', label: 'PROB. CRÍTICO', icon: '⚡', desc: '+5% Crítico' },
                    { id: 'speed', label: 'AGILIDAD', icon: '💨', desc: '+10% Velocidad' }
                  ].map(skill => (
                    <button key={skill.id} onClick={() => {
                      setUiState(s => ({
                        ...s, 
                        showTempSkills: false, isPaused: false, 
                        tempSkills: { ...s.tempSkills, [skill.id]: s.tempSkills[skill.id] + 1 }
                      }));
                      gameState.current.isPaused = false;
                    }} className="w-full p-4 bg-gray-800 hover:bg-gray-700 border-2 border-white/10 hover:border-blue-400 rounded-lg flex items-center gap-4 transition-all">
                      <span className="text-2xl">{skill.icon}</span>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-bold">{skill.label}</div>
                        <div className="text-[10px] text-gray-400">{skill.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
          {uiState.isPaused && !uiState.showTempSkills && !uiState.isGameOver && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="text-center p-8 bg-gray-900 border-2 border-white/20 rounded-2xl">
                <h2 className="text-4xl mb-8">PAUSA</h2>
                <button onClick={handlePauseToggle} className="px-8 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm border-b-4 border-blue-800 active:border-b-0 active:translate-y-1 transition-all">REANUDAR</button>
                <div className="mt-8 grid grid-cols-2 gap-4">
                  <button onClick={() => setUiState(s => ({ ...s, controlType: s.controlType === 'dpad' ? 'joystick' : 'dpad' }))} className="p-4 bg-gray-800 rounded-lg border border-white/10 flex flex-col items-center gap-2">
                    <Gamepad2 className="w-6 h-6" />
                    <span className="text-[10px]">{uiState.controlType.toUpperCase()}</span>
                  </button>
                  <button onClick={() => setLocation('/')} className="p-4 bg-gray-800 rounded-lg border border-white/10 flex flex-col items-center gap-2">
                    <X className="w-6 h-6" />
                    <span className="text-[10px]">SALIR</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
          {uiState.isGameOver && (
            <GameOverMenu score={uiState.score} level={uiState.level} revivesLeft={uiState.revivesLeft} onRevive={handleRevive} onRestart={() => window.location.reload()} />
          )}
        </AnimatePresence>
      </main>

      <footer className="p-2 border-t border-white/10 bg-black text-[10px] flex justify-between text-gray-500 uppercase tracking-widest">
        <span>WASD / FLECHAS PARA MOVER • RATÓN / JOYSTICK PARA DISPARAR</span>
        <span>© 2026 NEON BLITZ v1.0</span>
      </footer>
    </div>
  );
}

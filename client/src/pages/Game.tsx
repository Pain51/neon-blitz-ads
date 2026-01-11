import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Pause, Star, Trophy, Volume2, VolumeX, X, Move } from 'lucide-react';
import { Joystick } from '@/components/game/Joystick';
import { GameOverMenu } from '@/components/game/GameOverMenu';
import { useGameAudio } from '@/hooks/useGameAudio';
import { useAdMob } from '@/hooks/useAdMob';

import enemyNormalImg from '@assets/1768104330493_1768106295454.jpg';
import enemySpecialImg from '@assets/1768104549092_1768106295467.jpg';
import enemyBossImg from '@assets/1768104716780_1768106295437.jpg';

// --- GAME CONSTANTS ---
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const PLAYER_SIZE = 24;
const BULLET_SIZE_BASE = 6;
const ENEMY_SIZE_NORMAL = 43;
const ENEMY_SIZE_BOSS = 108;
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
  type?: 'normal' | 'special' | 'boss' | 'fast' | 'tank' | 'zigzag' | 'shooter';
  xpValue?: number;
  id: number;
  zigzagTimer?: number;
  shootTimer?: number;
  fireEffect?: number;
  iceEffect?: number;
  originalSpeed?: number;
  isOriginalFire?: boolean;
  isOriginalIce?: boolean;
  explosionEffect?: number;
  poisonEffect?: number;
}

interface Bullet extends Entity {
  pierce: number;
  life?: number;
  isLaser?: boolean;
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

interface PowerUp {
  x: number;
  y: number;
  radius: number;
  type: 'shield' | 'speed' | 'rapidFire' | 'magnet' | 'bomb';
  color: string;
  duration: number;
  id: number;
}

interface ActiveEffect {
  type: 'shield' | 'speed' | 'rapidFire' | 'magnet';
  endTime: number;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
}

const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_blood', name: 'First Blood', description: 'Defeat your first enemy', icon: '1', unlocked: false },
  { id: 'survivor_5', name: 'Survivor', description: 'Reach level 5', icon: '5', unlocked: false },
  { id: 'survivor_10', name: 'Elite Survivor', description: 'Reach level 10', icon: '10', unlocked: false },
  { id: 'boss_slayer', name: 'Boss Slayer', description: 'Defeat a boss', icon: 'B', unlocked: false },
  { id: 'score_1k', name: 'Point Hunter', description: 'Score 1,000 points', icon: '1K', unlocked: false },
  { id: 'score_10k', name: 'Score Master', description: 'Score 10,000 points', icon: '10K', unlocked: false },
  { id: 'powerup_5', name: 'Power Collector', description: 'Collect 5 power-ups in one game', icon: 'P', unlocked: false },
  { id: 'no_damage', name: 'Untouchable', description: 'Complete a level without taking damage', icon: 'U', unlocked: false },
];

export default function Game() {
  const [, setLocation] = useLocation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { showInterstitial, prepareInterstitial, isNativeApp } = useAdMob();
  const interstitialShownRef = useRef(false);
  
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
      speed: 120,
      fireRate: 0.3,
      bulletSpeed: 240,
      bulletSize: BULLET_SIZE_BASE,
      pierce: 1,
      angle: 0,
      lastMoveAngle: 0,
      lastShootAngle: 0,
      regen: 0.5,
      bulletLife: 1.0,
    },

    keys: { w: false, a: false, s: false, d: false },
    analogMove: { x: 0, y: 0 },
    analogShoot: { x: 0, y: 0 },
    bullets: [] as Bullet[],
    enemies: [] as Entity[],
    xpGems: [] as Entity[],
    particles: [] as Particle[],
    powerups: [] as PowerUp[],
    activeEffects: [] as ActiveEffect[],
    powerupSpawnTimer: 0,
    powerupIdCounter: 0,
    coins: 0,
    upgradeLevels: {
      fireRate: 0,
      moveSpeed: 0,
      bulletSpeed: 0,
      bulletSize: 0,
      pierce: 0,
      regen: 0,
    } as Record<string, number>,
    stats: {
      enemiesKilled: 0,
      bossesKilled: 0,
      powerupsCollected: 0,
      damageTakenThisLevel: 0,
    },
    // Visual effects
    screenShake: 0,
    combo: 0,
    comboTimer: 0,
    damageNumbers: [] as { x: number; y: number; value: number; life: number; isCrit: boolean }[],
    bulletTrails: [] as { x: number; y: number; life: number; color: string }[],
    levelUpFlash: 0,
  });

  const { playSound, setEnabled: setAudioEnabled, startMusic, stopMusic } = useGameAudio();
  const playSoundRef = useRef(playSound);
  playSoundRef.current = playSound;
  const startMusicRef = useRef(startMusic);
  startMusicRef.current = startMusic;
  const stopMusicRef = useRef(stopMusic);
  stopMusicRef.current = stopMusic;
  
  const [audioEnabled, setAudioEnabledState] = useState(true);
  
  const [canvasDimensions, setCanvasDimensions] = useState({ width: CANVAS_WIDTH, height: CANVAS_HEIGHT });
  
  useEffect(() => {
    const updateCanvasSize = () => {
      const container = document.querySelector('main');
      if (!container) return;
      
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      
      const aspectRatio = CANVAS_WIDTH / CANVAS_HEIGHT;
      const containerAspectRatio = containerWidth / containerHeight;
      
      let newWidth, newHeight;
      if (containerAspectRatio > aspectRatio) {
        newHeight = Math.min(containerHeight - 20, CANVAS_HEIGHT);
        newWidth = newHeight * aspectRatio;
      } else {
        newWidth = Math.min(containerWidth - 20, CANVAS_WIDTH);
        newHeight = newWidth / aspectRatio;
      }
      
      setCanvasDimensions({ width: Math.floor(newWidth), height: Math.floor(newHeight) });
    };
    
    updateCanvasSize();
    
    const handleResize = () => updateCanvasSize();
    const handleOrientation = () => setTimeout(updateCanvasSize, 100);
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientation);
    
    const mediaQuery = window.matchMedia('(orientation: portrait)');
    const handleMediaChange = () => setTimeout(updateCanvasSize, 100);
    mediaQuery.addEventListener('change', handleMediaChange);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientation);
      mediaQuery.removeEventListener('change', handleMediaChange);
    };
  }, []);
  
  const [joystickPositions, setJoystickPositions] = useState(() => {
    const saved = localStorage.getItem('joystickPositions');
    if (saved) return JSON.parse(saved);
    return {
      move: { x: 24, y: 24 },
      shoot: { x: -24, y: 24 }
    };
  });
  const [editingJoysticks, setEditingJoysticks] = useState(false);
  const [draggingJoystick, setDraggingJoystick] = useState<'move' | 'shoot' | null>(null);
  
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
    controlType: 'joystick',
    upgradeLevels: {} as Record<string, number>,
    tempSkills: {
      dmg: 0,
      crit: 0,
      speed: 0,
      bulletSpeed: 0,
      bulletLife: 0,
      bulletSize: 0,
      fireRate: 0,
    } as Record<string, number>,
    stats: {
      enemiesKilled: 0,
      bossesKilled: 0,
      powerupsCollected: 0,
      damageTakenThisLevel: 0,
    },
  });
  
  const [achievementNotification, setAchievementNotification] = useState<Achievement | null>(null);
  
  const unlockAchievement = (id: string) => {
    const saved = JSON.parse(localStorage.getItem('achievements') || '{}');
    if (saved[id]) return; // Already unlocked
    
    saved[id] = true;
    localStorage.setItem('achievements', JSON.stringify(saved));
    
    const achievement = ACHIEVEMENTS.find(a => a.id === id);
    if (achievement) {
      playSoundRef.current('levelUp');
      setAchievementNotification(achievement);
      setTimeout(() => setAchievementNotification(null), 3000);
    }
  };
  
  const toggleAudio = () => {
    const newValue = !audioEnabled;
    setAudioEnabledState(newValue);
    setAudioEnabled(newValue);
    if (newValue) {
      startMusicRef.current();
    } else {
      stopMusicRef.current();
    }
  };

  useEffect(() => {
    if (isNativeApp) {
      prepareInterstitial();
    }
  }, [isNativeApp, prepareInterstitial]);

  useEffect(() => {
    if (uiState.isGameOver && isNativeApp && !interstitialShownRef.current) {
      interstitialShownRef.current = true;
      showInterstitial();
    }
  }, [uiState.isGameOver, isNativeApp, showInterstitial]);

  useEffect(() => {
    const removeWhiteBackground = (img: HTMLImageElement, ref: React.MutableRefObject<HTMLImageElement | null>) => {
      ref.current = img;
      
      const processImage = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          if (r > 240 && g > 240 && b > 240) {
            data[i + 3] = 0;
          } else if (r > 200 && g > 200 && b > 200) {
            data[i + 3] = Math.floor((255 - Math.max(r, g, b)) * 2);
          }
        }
        
        ctx.putImageData(imageData, 0, 0);
        const processedImg = new Image();
        processedImg.src = canvas.toDataURL();
        processedImg.onload = () => { ref.current = processedImg; };
      };
      
      if (img.complete && img.naturalWidth > 0) {
        processImage();
      } else {
        img.onload = processImage;
      }
    };

    const normal = new Image();
    normal.src = enemyNormalImg;
    removeWhiteBackground(normal, enemyNormalImgRef);

    const special = new Image();
    special.src = enemySpecialImg;
    removeWhiteBackground(special, enemySpecialImgRef);

    const boss = new Image();
    boss.src = enemyBossImg;
    removeWhiteBackground(boss, enemyBossImgRef);
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
      
      let type: 'normal' | 'special' | 'boss' | 'fast' | 'tank' | 'zigzag' | 'shooter' = 'normal';
      let radius = ENEMY_SIZE_NORMAL / 2;
      let hp = 4;
      let color = COLOR_ENEMY;
      let xpValue = 10;
      let zigzagTimer = 0;
      let shootTimer = 0;

      if (isBoss) {
        type = 'boss';
        radius = ENEMY_SIZE_BOSS / 2;
        hp = 40;
        color = COLOR_BOSS;
        xpValue = 500;
      } else {
        const roll = Math.random();
        if (state.level >= 3 && roll < 0.15) {
          type = 'fast';
          color = '#22d3ee'; // Cyan
          hp = 2;
          xpValue = 15;
        } else if (state.level >= 4 && roll < 0.25) {
          type = 'tank';
          color = '#78716c'; // Gray
          radius = ENEMY_SIZE_NORMAL * 0.75;
          hp = 15;
          xpValue = 30;
        } else if (state.level >= 5 && roll < 0.35) {
          type = 'zigzag';
          color = '#f97316'; // Orange
          hp = 5;
          xpValue = 20;
          zigzagTimer = Math.random() * 2;
        } else if (state.level >= 6 && roll < 0.42) {
          type = 'shooter';
          color = '#dc2626'; // Bright red
          hp = 6;
          xpValue = 35;
          shootTimer = 2;
        } else if (state.level % 2 === 0 && roll < 0.55) {
          type = 'special';
          color = COLOR_SPECIAL;
          hp = 8;
          xpValue = 50;
        }
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
        radius, hp, maxHp: hp, color, type, xpValue,
        zigzagTimer, shootTimer
      });
      
      // Spawn effect - ring of particles
      const spawnParticleCount = type === 'boss' ? 20 : 6;
      for (let i = 0; i < spawnParticleCount; i++) {
        const angle = (i / spawnParticleCount) * Math.PI * 2;
        state.particles.push({
          x, y,
          vx: Math.cos(angle) * 80,
          vy: Math.sin(angle) * 80,
          life: 0.4,
          color: type === 'boss' ? '#fbbf24' : color,
          size: type === 'boss' ? 4 : 2
        });
      }
    };

    const createExplosion = (x: number, y: number, color: string, count: number, intensity: number = 1) => {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 100 + Math.random() * 150 * intensity;
        gameState.current.particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0.3 + Math.random() * 0.5 * intensity,
          color,
          size: (Math.random() * 3 + 2) * intensity
        });
      }
      // Add sparks for more dramatic effect
      if (intensity > 1) {
        for (let i = 0; i < count / 2; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 150 + Math.random() * 200;
          gameState.current.particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 0.2 + Math.random() * 0.3,
            color: '#fff',
            size: 1 + Math.random() * 2
          });
        }
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
        
        const hasSpeedBoost = state.activeEffects.some(e => e.type === 'speed');
        const speedMult = hasSpeedBoost ? 1.5 : 1;
        const finalSpeed = state.player.speed * speedMult * (1 + uiState.tempSkills.speed * 0.1);
        
        state.player.x += moveX * finalSpeed * dt;
        state.player.y += moveY * finalSpeed * dt;
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

        const hasRapidFire = state.activeEffects.some(e => e.type === 'rapidFire');
        state.shootTimer = state.player.fireRate * (hasRapidFire ? 0.3 : 1);
        const angle = shootAngle;
        const weaponType = new URLSearchParams(window.location.search).get('weapon') || 'normal';

        if (weaponType === 'laser') {
          playSoundRef.current('shootLaser');
          state.bullets.push({
            id: Math.random(),
            x: state.player.x, y: state.player.y,
            vx: Math.cos(angle) * state.player.bulletSpeed * 2,
            vy: Math.sin(angle) * state.player.bulletSpeed * 2,
            radius: 2, color: '#00ffff',
            hp: 1, maxHp: 1, pierce: 10,
            life: state.player.bulletLife,
            isLaser: true
          });
          state.bulletTrails.push({ x: state.player.x, y: state.player.y, life: 1, color: '#00ffff' });
          state.shootTimer = 1.0 * (hasRapidFire ? 0.3 : 1) * (state.player.fireRate / 0.3);
        } else if (weaponType === 'shotgun') {
          playSoundRef.current('shootShotgun');
          for (let i = -3; i <= 3; i++) {
            const spreadAngle = angle + (i * 0.12);
            state.bullets.push({
              id: Math.random(),
              x: state.player.x, y: state.player.y,
              vx: Math.cos(spreadAngle) * state.player.bulletSpeed,
              vy: Math.sin(spreadAngle) * state.player.bulletSpeed,
              radius: state.player.bulletSize,
              color: COLOR_BULLET,
              hp: 1, maxHp: 1, pierce: state.player.pierce,
              life: state.player.bulletLife * 0.5
            });
          }
          state.bulletTrails.push({ x: state.player.x, y: state.player.y, life: 1, color: '#f59e0b' });
          state.shootTimer = state.player.fireRate * 2;
        } else {
          playSoundRef.current('shootNormal');
          state.bullets.push({
            id: Math.random(),
            x: state.player.x, y: state.player.y,
            vx: Math.cos(angle) * state.player.bulletSpeed,
            vy: Math.sin(angle) * state.player.bulletSpeed,
            radius: state.player.bulletSize,
            color: COLOR_BULLET,
            hp: 1, maxHp: 1, pierce: state.player.pierce,
            life: state.player.bulletLife
          });
          state.bulletTrails.push({ x: state.player.x, y: state.player.y, life: 1, color: COLOR_BULLET });
        }
      }

      for (let i = state.bullets.length - 1; i >= 0; i--) {
        const b = state.bullets[i];
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        
        // Bullet life (range) - only for player bullets
        if (b.life !== undefined && b.pierce >= 0) {
          b.life -= dt;
          if (b.life <= 0) {
            state.bullets.splice(i, 1);
            continue;
          }
        }
        
        if (b.x < 0 || b.x > CANVAS_WIDTH || b.y < 0 || b.y > CANVAS_HEIGHT) {
          state.bullets.splice(i, 1);
          continue;
        }
        
        // Enemy bullets (negative pierce) damage player
        if (b.pierce < 0) {
          const dx = state.player.x - b.x;
          const dy = state.player.y - b.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < state.player.radius + b.radius) {
            state.bullets.splice(i, 1);
            const hasShield = state.activeEffects.some(ef => ef.type === 'shield');
            if (!hasShield) {
              state.player.hp -= 15;
              state.stats.damageTakenThisLevel += 15;
              playSoundRef.current('damage');
              if (state.player.hp <= 0) {
                state.player.hp = 0;
                state.isGameOver = true;
                playSoundRef.current('gameOver');
                setUiState(s => ({ ...s, isGameOver: true }));
              }
              setUiState(s => ({ ...s, hp: state.player.hp }));
            }
            createExplosion(b.x, b.y, hasShield ? '#3b82f6' : '#ff0000', 5);
          }
        }
      }

      state.spawnTimer -= dt * 1000;
      if (state.spawnTimer <= 0) {
        spawnEnemy();
        const difficultyFactor = Math.max(105, 526 - (state.level * 26));
        state.spawnTimer = difficultyFactor;
      }

      for (let i = state.enemies.length - 1; i >= 0; i--) {
        const e = state.enemies[i];
        const dx = state.player.x - e.x;
        const dy = state.player.y - e.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        // Different speed and movement patterns per enemy type
        let speed = (60 + (state.level * 2)) * 0.6;
        let moveX = dx / dist;
        let moveY = dy / dist;
        
        switch(e.type) {
          case 'boss':
            speed = 30 * 0.6;
            // Boss fires in a circle pattern
            e.shootTimer = (e.shootTimer || 3) - dt;
            if (e.shootTimer <= 0) {
              e.shootTimer = 2;
              const bulletCount = 8;
              for (let i = 0; i < bulletCount; i++) {
                const angle = (i / bulletCount) * Math.PI * 2;
                state.bullets.push({
                  id: Math.random(),
                  x: e.x, y: e.y,
                  vx: Math.cos(angle) * 120,
                  vy: Math.sin(angle) * 120,
                  radius: 6,
                  color: '#ff4444',
                  hp: 1, maxHp: 1, pierce: -99
                });
              }
            }
            break;
          case 'fast':
            speed = (150 + (state.level * 3)) * 0.6;
            break;
          case 'tank':
            speed = 35 * 0.6;
            break;
          case 'zigzag':
            speed = 80 * 0.6;
            e.zigzagTimer = (e.zigzagTimer || 0) + dt;
            const zigzagOffset = Math.sin(e.zigzagTimer * 8) * 0.8;
            const perpX = -moveY;
            const perpY = moveX;
            moveX += perpX * zigzagOffset;
            moveY += perpY * zigzagOffset;
            break;
          case 'shooter':
            speed = 40 * 0.6;
            e.shootTimer = (e.shootTimer || 2) - dt;
            if (e.shootTimer <= 0 && dist < 400) {
              e.shootTimer = 2.5;
              // Spawn enemy bullet (using bullets array with different color)
              state.bullets.push({
                id: Math.random(),
                x: e.x, y: e.y,
                vx: (dx / dist) * 150,
                vy: (dy / dist) * 150,
                radius: 5,
                color: '#ff0000',
                hp: 1, maxHp: 1, pierce: -99 // Negative pierce = enemy bullet
              });
            }
            break;
        }
        
        // Process fire effect (10% total health damage over 3 seconds with contagion)
        if (e.fireEffect && e.fireEffect > 0) {
          e.fireEffect -= dt;
          const fireDamage = e.maxHp * 0.10 * dt / 3; // 10% over 3 seconds
          e.hp -= fireDamage;
          // Fire particles
          if (Math.random() < 0.3) {
            state.particles.push({
              x: e.x + (Math.random() - 0.5) * e.radius,
              y: e.y + (Math.random() - 0.5) * e.radius,
              vx: (Math.random() - 0.5) * 30,
              vy: -50 - Math.random() * 30,
              life: 0.5 + Math.random() * 0.3,
              color: Math.random() > 0.5 ? '#ff6600' : '#ffcc00',
              size: 3 + Math.random() * 3
            });
          }
          // Fire contagion - only original fire spreads
          if (e.isOriginalFire) {
            for (const other of state.enemies) {
              if (other === e || other.fireEffect) continue;
              const distToOther = Math.sqrt((other.x - e.x) ** 2 + (other.y - e.y) ** 2);
              if (distToOther < e.radius + other.radius + 20) {
                other.fireEffect = 3.0;
                other.isOriginalFire = false; // Secondary fire doesn't spread
              }
            }
          }
          if (e.hp <= 0) {
            createExplosion(e.x, e.y, '#ff6600', 15);
            state.enemies.splice(i, 1);
            state.combo++;
            state.comboTimer = 2.0;
            state.score += Math.floor(e.xpValue! * 10 * (1 + state.combo * 0.1));
            state.stats.enemiesKilled++;
            state.xpGems.push({
              id: Math.random(),
              x: e.x, y: e.y, vx:0, vy:0,
              radius: XP_GEM_SIZE,
              color: COLOR_XP,
              hp: 1, maxHp: 1, xpValue: e.xpValue
            });
            setUiState(s => ({ ...s, score: state.score, stats: { ...state.stats } }));
            continue;
          }
        }
        
        // Process ice effect (70% slow for 3 seconds with contagion)
        if (e.iceEffect && e.iceEffect > 0) {
          e.iceEffect -= dt;
          speed *= 0.3; // 70% slow = 30% of original speed
          // Ice contagion - only original ice spreads
          if (e.isOriginalIce) {
            for (const other of state.enemies) {
              if (other === e || other.iceEffect) continue;
              const distToOther = Math.sqrt((other.x - e.x) ** 2 + (other.y - e.y) ** 2);
              if (distToOther < e.radius + other.radius + 20) {
                other.iceEffect = 3.0;
                other.isOriginalIce = false; // Secondary ice doesn't spread
              }
            }
          }
        }
        
        // Process explosion effect (2s countdown, then 30% damage in 60x60 area)
        if (e.explosionEffect && e.explosionEffect > 0) {
          e.explosionEffect -= dt;
          if (e.explosionEffect <= 0) {
            createExplosion(e.x, e.y, '#ffffff', 25, 2);
            playSoundRef.current('explosion');
            const enemiesToKill: Entity[] = [];
            for (const other of state.enemies) {
              if (other === e) continue;
              const distToOther = Math.sqrt((other.x - e.x) ** 2 + (other.y - e.y) ** 2);
              if (distToOther < 30) {
                other.hp -= other.maxHp * 0.30;
                state.damageNumbers.push({
                  x: other.x + (Math.random() - 0.5) * 20,
                  y: other.y - other.radius,
                  value: Math.round(other.maxHp * 0.30 * 10),
                  life: 1.0,
                  isCrit: true
                });
                if (other.hp <= 0) {
                  enemiesToKill.push(other);
                }
              }
            }
            for (const deadEnemy of enemiesToKill) {
              const idx = state.enemies.indexOf(deadEnemy);
              if (idx !== -1) {
                createExplosion(deadEnemy.x, deadEnemy.y, deadEnemy.color, 12);
                state.enemies.splice(idx, 1);
                state.combo++;
                state.comboTimer = 2.0;
                state.score += Math.floor(deadEnemy.xpValue! * 10 * (1 + state.combo * 0.1));
                state.stats.enemiesKilled++;
                if (deadEnemy.type === 'boss') state.stats.bossesKilled++;
                state.xpGems.push({
                  id: Math.random(),
                  x: deadEnemy.x, y: deadEnemy.y, vx:0, vy:0,
                  radius: XP_GEM_SIZE,
                  color: COLOR_XP,
                  hp: 1, maxHp: 1, xpValue: deadEnemy.xpValue
                });
              }
            }
            if (enemiesToKill.length > 0) {
              setUiState(s => ({ ...s, score: state.score, stats: { ...state.stats } }));
            }
          }
        }
        
        // Process poison effect (5% hp/sec for 5 seconds + toxic cloud damages nearby 2% hp/sec)
        if (e.poisonEffect && e.poisonEffect > 0) {
          e.poisonEffect -= dt;
          const poisonDamage = e.maxHp * 0.05 * dt; // 5% per second
          e.hp -= poisonDamage;
          // Poison particles (green/purple)
          if (Math.random() < 0.4) {
            state.particles.push({
              x: e.x + (Math.random() - 0.5) * e.radius * 1.5,
              y: e.y + (Math.random() - 0.5) * e.radius * 1.5,
              vx: (Math.random() - 0.5) * 40,
              vy: -30 - Math.random() * 20,
              life: 0.6 + Math.random() * 0.4,
              color: Math.random() > 0.5 ? '#22c55e' : '#a855f7',
              size: 2 + Math.random() * 3
            });
          }
          // Toxic cloud damages nearby enemies
          const toxicKills: Entity[] = [];
          for (const other of state.enemies) {
            if (other === e) continue;
            const distToOther = Math.sqrt((other.x - e.x) ** 2 + (other.y - e.y) ** 2);
            if (distToOther < e.radius + other.radius + 30) {
              other.hp -= other.maxHp * 0.02 * dt;
              if (other.hp <= 0 && !toxicKills.includes(other)) {
                toxicKills.push(other);
              }
            }
          }
          for (const deadEnemy of toxicKills) {
            const idx = state.enemies.indexOf(deadEnemy);
            if (idx !== -1) {
              createExplosion(deadEnemy.x, deadEnemy.y, '#22c55e', 10);
              state.enemies.splice(idx, 1);
              state.combo++;
              state.comboTimer = 2.0;
              state.score += Math.floor(deadEnemy.xpValue! * 10 * (1 + state.combo * 0.1));
              state.stats.enemiesKilled++;
              if (deadEnemy.type === 'boss') state.stats.bossesKilled++;
              state.xpGems.push({
                id: Math.random(),
                x: deadEnemy.x, y: deadEnemy.y, vx:0, vy:0,
                radius: XP_GEM_SIZE,
                color: COLOR_XP,
                hp: 1, maxHp: 1, xpValue: deadEnemy.xpValue
              });
              setUiState(s => ({ ...s, score: state.score, stats: { ...state.stats } }));
            }
          }
          if (e.hp <= 0) {
            createExplosion(e.x, e.y, '#22c55e', 15);
            state.enemies.splice(i, 1);
            state.combo++;
            state.comboTimer = 2.0;
            state.score += Math.floor(e.xpValue! * 10 * (1 + state.combo * 0.1));
            state.stats.enemiesKilled++;
            state.xpGems.push({
              id: Math.random(),
              x: e.x, y: e.y, vx:0, vy:0,
              radius: XP_GEM_SIZE,
              color: COLOR_XP,
              hp: 1, maxHp: 1, xpValue: e.xpValue
            });
            setUiState(s => ({ ...s, score: state.score, stats: { ...state.stats } }));
            continue;
          }
        }
        
        e.x += moveX * speed * dt;
        e.y += moveY * speed * dt;

        if (dist < e.radius + state.player.radius) {
          const hasShield = state.activeEffects.some(ef => ef.type === 'shield');
          if (!hasShield) {
            const dmg = e.type === 'boss' ? 30 : 10;
            state.player.hp -= dmg;
            state.stats.damageTakenThisLevel += dmg;
            state.screenShake = e.type === 'boss' ? 15 : 8;
            state.combo = 0;
            playSoundRef.current('damage');
            if (state.player.hp <= 0) {
              state.player.hp = 0;
              state.isGameOver = true;
              state.screenShake = 25;
              playSoundRef.current('gameOver');
              setUiState(s => ({ ...s, isGameOver: true }));
            }
            setUiState(s => ({ ...s, hp: state.player.hp }));
          }
          createExplosion(state.player.x, state.player.y, hasShield ? '#3b82f6' : COLOR_PLAYER, 10);
          state.enemies.splice(i, 1);
          continue;
        }

        for (let j = state.bullets.length - 1; j >= 0; j--) {
          const b = state.bullets[j];
          // Skip enemy bullets (negative pierce) - they don't damage enemies
          if (b.pierce < 0) continue;
          
          const dbx = e.x - b.x;
          const dby = e.y - b.y;
          if (Math.sqrt(dbx*dbx + dby*dby) < e.radius + b.radius) {
            const weaponType = new URLSearchParams(window.location.search).get('weapon') || 'normal';
            let baseDamage = 2;
            if (weaponType === 'laser') baseDamage = 0.075;
            if (weaponType === 'shotgun') baseDamage = 0.5;

            const saved = localStorage.getItem('permanentUpgrades');
            const perms = saved ? JSON.parse(saved) : { baseDmg: 0, bulletFire: 0, bulletIce: 0, bulletExplosion: 0, bulletPoison: 0 };
            const finalDamage = baseDamage + (perms.baseDmg * 0.5) + (uiState.tempSkills.dmg * 1);
            const isCrit = Math.random() < (uiState.tempSkills.crit * 0.05);
            
            const actualDamage = isCrit ? finalDamage * 2 : finalDamage;
            e.hp -= actualDamage;
            b.pierce--;
            createExplosion(b.x, b.y, COLOR_BULLET, 3);
            
            // Apply fire/ice/explosion/poison effects from permanent upgrades (5% probability each)
            if (perms.bulletFire > 0 && Math.random() < 0.05) {
              e.fireEffect = 3.0;
              e.isOriginalFire = true;
              if (!e.originalSpeed) e.originalSpeed = 1;
            }
            if (perms.bulletIce > 0 && Math.random() < 0.05) {
              e.iceEffect = 3.0;
              e.isOriginalIce = true;
              if (!e.originalSpeed) e.originalSpeed = 1;
            }
            if (perms.bulletExplosion > 0 && Math.random() < 0.05) {
              e.explosionEffect = 2.0;
            }
            if (perms.bulletPoison > 0 && Math.random() < 0.05) {
              e.poisonEffect = 5.0;
            }
            
            // Damage number effect
            state.damageNumbers.push({
              x: e.x + (Math.random() - 0.5) * 20,
              y: e.y - e.radius,
              value: Math.round(actualDamage * 10),
              life: 1.0,
              isCrit
            });
            
            if (b.pierce <= 0) state.bullets.splice(j, 1);
            if (e.hp <= 0) {
              const wasBoss = e.type === 'boss';
              state.enemies.splice(i, 1);
              
              // Combo system
              state.combo++;
              state.comboTimer = 2.0;
              const comboMultiplier = 1 + (state.combo * 0.1);
              const baseScore = e.xpValue! * 10;
              state.score += Math.floor(baseScore * comboMultiplier);
              state.screenShake = wasBoss ? 12 : 3;
              
              state.stats.enemiesKilled++;
              if (wasBoss) state.stats.bossesKilled++;
              
              playSoundRef.current('explosion');
              // Create dramatic explosion based on enemy type
              const explosionIntensity = wasBoss ? 3 : (e.type === 'special' ? 1.5 : 1);
              createExplosion(e.x, e.y, e.color, wasBoss ? 30 : 12, explosionIntensity);
              
              state.xpGems.push({
                id: Math.random(),
                x: e.x, y: e.y, vx:0, vy:0,
                radius: XP_GEM_SIZE,
                color: COLOR_XP,
                hp: 1, maxHp: 1, xpValue: e.xpValue
              });
              
              // Achievement checks
              if (state.stats.enemiesKilled === 1) unlockAchievement('first_blood');
              if (wasBoss) unlockAchievement('boss_slayer');
              if (state.score >= 1000) unlockAchievement('score_1k');
              if (state.score >= 10000) unlockAchievement('score_10k');
              
              setUiState(s => ({ 
                ...s, 
                score: state.score,
                stats: { ...state.stats }
              }));
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
          playSoundRef.current('gem');
          if (state.xp >= state.xpToNextLevel) {
            // Check untouchable achievement before level up
            if (state.stats.damageTakenThisLevel === 0) {
              unlockAchievement('no_damage');
            }
            state.stats.damageTakenThisLevel = 0; // Reset for next level
            
            state.level++;
            state.xp -= state.xpToNextLevel;
            state.xpToNextLevel = Math.floor(state.xpToNextLevel * 1.5);
            state.isPaused = true;
            state.levelUpFlash = 1.0;
            state.screenShake = 10;
            playSoundRef.current('levelUp');
            stopMusicRef.current();
            setTimeout(() => playSoundRef.current('menuOpen'), 400);
            
            // Level achievements
            if (state.level >= 5) unlockAchievement('survivor_5');
            if (state.level >= 10) unlockAchievement('survivor_10');
            
            setUiState(s => ({
              ...s,
              level: state.level,
              xp: state.xp,
              xpToNextLevel: state.xpToNextLevel,
              showTempSkills: true,
              isPaused: true,
              coins: state.coins,
              skillPoints: s.skillPoints + 1,
              upgradeLevels: { ...state.upgradeLevels },
              stats: { ...state.stats, damageTakenThisLevel: 0 }
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

      // Power-up spawn logic
      state.powerupSpawnTimer += dt * 1000;
      if (state.powerupSpawnTimer >= 15000 && state.powerups.length < 3) {
        state.powerupSpawnTimer = 0;
        const types: Array<'shield' | 'speed' | 'rapidFire' | 'magnet' | 'bomb'> = ['shield', 'speed', 'rapidFire', 'magnet', 'bomb'];
        const colors: Record<string, string> = { shield: '#3b82f6', speed: '#22c55e', rapidFire: '#f59e0b', magnet: '#a855f7', bomb: '#ef4444' };
        const type = types[Math.floor(Math.random() * types.length)];
        state.powerups.push({
          x: 100 + Math.random() * (CANVAS_WIDTH - 200),
          y: 100 + Math.random() * (CANVAS_HEIGHT - 200),
          radius: 15,
          type,
          color: colors[type],
          duration: 8000,
          id: state.powerupIdCounter++
        });
      }

      // Power-up collision
      for (let i = state.powerups.length - 1; i >= 0; i--) {
        const pu = state.powerups[i];
        const dx = state.player.x - pu.x;
        const dy = state.player.y - pu.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < state.player.radius + pu.radius) {
          state.powerups.splice(i, 1);
          playSoundRef.current('gem');
          state.stats.powerupsCollected++;
          
          // Achievement check
          if (state.stats.powerupsCollected >= 5) unlockAchievement('powerup_5');
          
          if (pu.type === 'bomb') {
            // Kill all enemies on screen
            state.enemies.forEach(e => {
              state.score += e.type === 'boss' ? 500 : (e.type === 'special' ? 100 : 50);
              for (let j = 0; j < 8; j++) {
                state.particles.push({
                  x: e.x, y: e.y,
                  vx: (Math.random() - 0.5) * 300,
                  vy: (Math.random() - 0.5) * 300,
                  life: 0.5,
                  color: '#ef4444',
                  size: 4
                });
              }
            });
            state.enemies = [];
            playSoundRef.current('explosion');
          } else {
            // Add timed effect
            const existingIdx = state.activeEffects.findIndex(e => e.type === pu.type);
            if (existingIdx >= 0) {
              state.activeEffects[existingIdx].endTime = Date.now() + pu.duration;
            } else {
              state.activeEffects.push({ type: pu.type as any, endTime: Date.now() + pu.duration });
            }
          }
        }
      }

      // Update active effects
      const now = Date.now();
      state.activeEffects = state.activeEffects.filter(e => e.endTime > now);
      
      // Apply magnet effect
      const hasMagnet = state.activeEffects.some(e => e.type === 'magnet');
      if (hasMagnet) {
        state.xpGems.forEach(g => {
          const dx = state.player.x - g.x;
          const dy = state.player.y - g.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist > 0) {
            g.x += (dx / dist) * 500 * dt;
            g.y += (dy / dist) * 500 * dt;
          }
        });
      }
      
      // Update visual effects
      if (state.screenShake > 0) state.screenShake *= 0.9;
      if (state.screenShake < 0.5) state.screenShake = 0;
      
      if (state.comboTimer > 0) {
        state.comboTimer -= dt;
        if (state.comboTimer <= 0) state.combo = 0;
      }
      
      if (state.levelUpFlash > 0) state.levelUpFlash -= dt * 2;
      
      // Update damage numbers
      for (let i = state.damageNumbers.length - 1; i >= 0; i--) {
        state.damageNumbers[i].life -= dt;
        state.damageNumbers[i].y -= 40 * dt;
        if (state.damageNumbers[i].life <= 0) state.damageNumbers.splice(i, 1);
      }
      
      // Update bullet trails
      for (let i = state.bulletTrails.length - 1; i >= 0; i--) {
        state.bulletTrails[i].life -= dt * 3;
        if (state.bulletTrails[i].life <= 0) state.bulletTrails.splice(i, 1);
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
      
      // Screen shake effect
      ctx.save();
      if (state.screenShake > 0) {
        const shakeX = (Math.random() - 0.5) * state.screenShake * 2;
        const shakeY = (Math.random() - 0.5) * state.screenShake * 2;
        ctx.translate(shakeX, shakeY);
      }
      
      // Draw neon grid background
      ctx.fillStyle = '#050508';
      ctx.fillRect(-10, -10, CANVAS_WIDTH + 20, CANVAS_HEIGHT + 20);
      
      const gridSize = 50;
      const time = Date.now() * 0.001;
      
      // Animated grid with neon glow
      for(let x = 0; x <= CANVAS_WIDTH; x += gridSize) {
        const intensity = 0.08 + 0.02 * Math.sin(time + x * 0.1);
        ctx.strokeStyle = `rgba(59, 130, 246, ${intensity})`;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_HEIGHT); ctx.stroke();
      }
      for(let y = 0; y <= CANVAS_HEIGHT; y += gridSize) {
        const intensity = 0.08 + 0.02 * Math.sin(time + y * 0.1);
        ctx.strokeStyle = `rgba(139, 92, 246, ${intensity})`;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_WIDTH, y); ctx.stroke();
      }
      
      // Vignette effect
      const vignette = ctx.createRadialGradient(CANVAS_WIDTH/2, CANVAS_HEIGHT/2, 100, CANVAS_WIDTH/2, CANVAS_HEIGHT/2, CANVAS_WIDTH * 0.7);
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, 'rgba(0,0,0,0.4)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      state.xpGems.forEach(g => {
        ctx.fillStyle = g.color; ctx.beginPath(); ctx.arc(g.x, g.y, g.radius, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 5; ctx.shadowColor = g.color; ctx.fill(); ctx.shadowBlur = 0;
      });

      // Draw power-ups
      state.powerups.forEach(pu => {
        ctx.fillStyle = pu.color;
        ctx.beginPath();
        ctx.arc(pu.x, pu.y, pu.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 15;
        ctx.shadowColor = pu.color;
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Draw icon based on type
        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const icons: Record<string, string> = { shield: 'S', speed: 'V', rapidFire: 'R', magnet: 'M', bomb: 'B' };
        ctx.fillText(icons[pu.type] || '?', pu.x, pu.y);
      });

      // Draw bullet trails (muzzle flash) BEFORE bullets/player
      state.bulletTrails.forEach(t => {
        ctx.globalAlpha = t.life * 0.4;
        ctx.fillStyle = t.color;
        ctx.beginPath();
        ctx.arc(t.x, t.y, 6 * t.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      });

      state.bullets.forEach(b => {
        if (b.isLaser) {
          const angle = Math.atan2(b.vy, b.vx);
          const length = 25;
          ctx.strokeStyle = b.color;
          ctx.lineWidth = 3;
          ctx.shadowColor = b.color;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.moveTo(b.x - Math.cos(angle) * length / 2, b.y - Math.sin(angle) * length / 2);
          ctx.lineTo(b.x + Math.cos(angle) * length / 2, b.y + Math.sin(angle) * length / 2);
          ctx.stroke();
          ctx.shadowBlur = 0;
        } else {
          ctx.fillStyle = b.color; ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2); ctx.fill();
        }
      });

      state.enemies.forEach(e => {
        // Draw fire aura effect
        if (e.fireEffect && e.fireEffect > 0) {
          ctx.globalAlpha = 0.4;
          ctx.strokeStyle = '#ff6600';
          ctx.lineWidth = 3;
          ctx.shadowColor = '#ff6600';
          ctx.shadowBlur = 15;
          ctx.beginPath();
          ctx.arc(e.x, e.y, e.radius + 5 + Math.sin(Date.now() / 100) * 2, 0, Math.PI * 2);
          ctx.stroke();
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1;
        }
        
        // Draw ice aura effect
        if (e.iceEffect && e.iceEffect > 0) {
          ctx.globalAlpha = 0.5;
          ctx.strokeStyle = '#00d4ff';
          ctx.lineWidth = 3;
          ctx.shadowColor = '#00d4ff';
          ctx.shadowBlur = 15;
          ctx.beginPath();
          ctx.arc(e.x, e.y, e.radius + 4, 0, Math.PI * 2);
          ctx.stroke();
          // Ice crystals
          for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2 + Date.now() / 1000;
            ctx.fillStyle = '#88eeff';
            ctx.beginPath();
            ctx.arc(
              e.x + Math.cos(angle) * (e.radius + 8),
              e.y + Math.sin(angle) * (e.radius + 8),
              2, 0, Math.PI * 2
            );
            ctx.fill();
          }
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1;
        }
        
        // Draw explosion aura effect (white pulsing)
        if (e.explosionEffect && e.explosionEffect > 0) {
          ctx.globalAlpha = 0.6;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 4;
          ctx.shadowColor = '#ffffff';
          ctx.shadowBlur = 20;
          const pulseRadius = e.radius + 6 + Math.sin(Date.now() / 80) * 4;
          ctx.beginPath();
          ctx.arc(e.x, e.y, pulseRadius, 0, Math.PI * 2);
          ctx.stroke();
          // Inner glow
          ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.beginPath();
          ctx.arc(e.x, e.y, e.radius + 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1;
        }
        
        // Draw poison aura effect (green/purple)
        if (e.poisonEffect && e.poisonEffect > 0) {
          ctx.globalAlpha = 0.5;
          ctx.strokeStyle = '#22c55e';
          ctx.lineWidth = 3;
          ctx.shadowColor = '#22c55e';
          ctx.shadowBlur = 15;
          ctx.beginPath();
          ctx.arc(e.x, e.y, e.radius + 5, 0, Math.PI * 2);
          ctx.stroke();
          // Poison droplets
          for (let i = 0; i < 3; i++) {
            const angle = (i / 3) * Math.PI * 2 + Date.now() / 800;
            ctx.fillStyle = i % 2 === 0 ? '#22c55e' : '#a855f7';
            ctx.beginPath();
            ctx.arc(
              e.x + Math.cos(angle) * (e.radius + 10),
              e.y + Math.sin(angle) * (e.radius + 10),
              3, 0, Math.PI * 2
            );
            ctx.fill();
          }
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1;
        }
        
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

      // Draw shield effect if active
      const hasShieldEffect = state.activeEffects.some(e => e.type === 'shield');
      if (hasShieldEffect) {
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(state.player.x, state.player.y, state.player.radius + 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowColor = '#3b82f6';
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      state.particles.forEach(p => {
        ctx.fillStyle = p.color; ctx.globalAlpha = p.life; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
      });
      
      // Draw damage numbers
      state.damageNumbers.forEach(dn => {
        ctx.globalAlpha = dn.life;
        ctx.font = dn.isCrit ? 'bold 16px Arial' : '12px Arial';
        ctx.fillStyle = dn.isCrit ? '#fbbf24' : '#fff';
        ctx.textAlign = 'center';
        ctx.shadowColor = dn.isCrit ? '#fbbf24' : '#000';
        ctx.shadowBlur = 4;
        ctx.fillText(dn.value.toString(), dn.x, dn.y);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      });
      
      // Draw combo indicator
      if (state.combo > 1) {
        ctx.globalAlpha = Math.min(1, state.comboTimer);
        ctx.font = 'bold 18px Arial';
        ctx.fillStyle = state.combo >= 10 ? '#ef4444' : state.combo >= 5 ? '#f59e0b' : '#22c55e';
        ctx.textAlign = 'center';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 8;
        ctx.fillText(`${state.combo}x COMBO!`, CANVAS_WIDTH / 2, 30);
        ctx.font = '11px Arial';
        ctx.fillStyle = '#fff';
        ctx.fillText(`+${Math.floor((state.combo - 1) * 10)}%`, CANVAS_WIDTH / 2, 45);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }
      
      // Level up flash effect
      if (state.levelUpFlash > 0) {
        ctx.globalAlpha = state.levelUpFlash * 0.3;
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.globalAlpha = 1;
      }
      
      ctx.restore();
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

  useEffect(() => {
    const startGameMusic = () => {
      startMusicRef.current();
    };
    const timer = setTimeout(startGameMusic, 500);
    return () => {
      clearTimeout(timer);
      stopMusicRef.current();
    };
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
    playSoundRef.current(isPaused ? 'pause' : 'unpause');
    if (isPaused) {
      stopMusicRef.current();
    } else {
      startMusicRef.current();
    }
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

  const handleJoystickDragStart = (joystick: 'move' | 'shoot') => {
    if (!editingJoysticks) return;
    setDraggingJoystick(joystick);
    gameState.current.isPaused = true;
  };

  const handleJoystickDrag = (e: React.TouchEvent | React.MouseEvent) => {
    if (!draggingJoystick || !editingJoysticks) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const mainEl = (e.currentTarget as HTMLElement).closest('main');
    if (!mainEl) return;
    const rect = mainEl.getBoundingClientRect();
    
    if (draggingJoystick === 'move') {
      const x = Math.max(10, Math.min(clientX - rect.left, rect.width / 2 - 10));
      const y = Math.max(10, Math.min(rect.height - (clientY - rect.top), rect.height - 80));
      setJoystickPositions((prev: typeof joystickPositions) => ({ ...prev, move: { x, y } }));
    } else {
      const x = Math.max(10, Math.min(rect.right - clientX, rect.width / 2 - 10));
      const y = Math.max(10, Math.min(rect.height - (clientY - rect.top), rect.height - 80));
      setJoystickPositions((prev: typeof joystickPositions) => ({ ...prev, shoot: { x, y } }));
    }
  };

  const handleJoystickDragEnd = () => {
    if (draggingJoystick) {
      localStorage.setItem('joystickPositions', JSON.stringify(joystickPositions));
      setDraggingJoystick(null);
      gameState.current.isPaused = false;
    }
  };

  const toggleEditJoysticks = () => {
    const newState = !editingJoysticks;
    setEditingJoysticks(newState);
    if (newState) {
      gameState.current.isPaused = true;
      setUiState(s => ({ ...s, isPaused: true }));
    } else {
      gameState.current.isPaused = false;
      setUiState(s => ({ ...s, isPaused: false }));
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
          <button onClick={toggleAudio} className="p-1 md:p-2 hover:bg-white/10 rounded-lg transition-colors border border-white/10">
            {audioEnabled ? <Volume2 className="w-4 h-4 md:w-6 md:h-6" /> : <VolumeX className="w-4 h-4 md:w-6 md:h-6 text-gray-500" />}
          </button>
          <button onClick={handlePauseToggle} className="p-1 md:p-2 hover:bg-white/10 rounded-lg transition-colors border border-white/10">
            <Pause className="w-4 h-4 md:w-6 md:h-6" />
          </button>
          <button onClick={toggleEditJoysticks} className={`p-1 md:p-2 rounded-lg transition-colors border ${editingJoysticks ? 'bg-green-600 border-green-400' : 'hover:bg-white/10 border-white/10'}`}>
            <Move className="w-4 h-4 md:w-6 md:h-6" />
          </button>
        </div>
      </header>

      <main 
        className="flex-1 relative flex items-center justify-center overflow-hidden"
        onTouchMove={handleJoystickDrag}
        onMouseMove={handleJoystickDrag}
        onTouchEnd={handleJoystickDragEnd}
        onMouseUp={handleJoystickDragEnd}
        onMouseLeave={handleJoystickDragEnd}
      >
        <canvas 
          ref={canvasRef} 
          width={CANVAS_WIDTH} 
          height={CANVAS_HEIGHT} 
          className="max-w-full max-h-full border-2 border-white/20 shadow-[0_0_50px_rgba(0,0,0,0.5)]" 
          style={{ 
            width: canvasDimensions.width, 
            height: canvasDimensions.height 
          }}
        />
        
        {editingJoysticks && (
          <div className="absolute inset-0 bg-black/50 z-20 flex items-center justify-center pointer-events-none">
            <div className="text-center p-4 bg-gray-900/90 rounded-xl border border-green-500 pointer-events-auto">
              <p className="text-sm text-green-400 mb-2">MODO EDICION</p>
              <p className="text-[10px] text-gray-400">Arrastra los joysticks a donde quieras</p>
              <p className="text-[8px] text-yellow-400 mt-1">Los joysticks ahora son mas grandes para facilitar el posicionamiento</p>
              <button onClick={toggleEditJoysticks} className="mt-4 px-4 py-2 bg-green-600 hover:bg-green-500 rounded text-xs">LISTO</button>
            </div>
          </div>
        )}
        
        {editingJoysticks ? (
          <>
            <div 
              className="absolute transform scale-100 md:scale-125 origin-bottom-left z-30 cursor-move ring-4 ring-green-500 ring-opacity-80 rounded-full animate-pulse"
              style={{ left: joystickPositions.move.x, bottom: joystickPositions.move.y }}
              onTouchStart={() => handleJoystickDragStart('move')}
              onMouseDown={() => handleJoystickDragStart('move')}
            > 
              <div className="pointer-events-none">
                <Joystick size={150} onMove={() => {}} label="MOVER" />
              </div>
            </div>
            <div 
              className="absolute transform scale-100 md:scale-125 origin-bottom-right z-30 cursor-move ring-4 ring-green-500 ring-opacity-80 rounded-full animate-pulse"
              style={{ right: joystickPositions.shoot.x, bottom: joystickPositions.shoot.y }}
              onTouchStart={() => handleJoystickDragStart('shoot')}
              onMouseDown={() => handleJoystickDragStart('shoot')}
            > 
              <div className="pointer-events-none">
                <Joystick size={150} onMove={() => {}} label="DISPARAR" />
              </div>
            </div>
          </>
        ) : (
          <>
            <div 
              className="absolute transform scale-[0.6] md:scale-100 origin-bottom-left z-30"
              style={{ left: joystickPositions.move.x, bottom: joystickPositions.move.y }}
            > 
              <Joystick size={120} onMove={handleMoveJoystick} label="MOVER" />
            </div>
            <div 
              className="absolute transform scale-[0.6] md:scale-100 origin-bottom-right z-30"
              style={{ right: joystickPositions.shoot.x, bottom: joystickPositions.shoot.y }}
            > 
              <Joystick size={120} onMove={handleShootJoystick} label="DISPARAR" />
            </div>
          </>
        )}

        <AnimatePresence>
          {uiState.showTempSkills && (
            <motion.div key="temp-skills" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-gray-900 border-4 border-blue-500 p-6 rounded-xl max-w-md w-full shadow-[0_0_30px_rgba(59,130,246,0.5)]">
                <h2 className="text-2xl text-blue-400 mb-2 text-center">¡SUBIDA DE NIVEL!</h2>
                <p className="text-xs text-gray-400 mb-6 text-center italic">Elige tu mejora de batalla</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'dmg', label: 'ATAQUE+', desc: '+1 Daño' },
                    { id: 'crit', label: 'CRITICO', desc: '+5% Prob.' },
                    { id: 'speed', label: 'AGILIDAD', desc: '+10% Vel.' },
                    { id: 'bulletSpeed', label: 'VEL. BALA', desc: '+15% Vel.' },
                    { id: 'bulletLife', label: 'ALCANCE', desc: '+20% Rango' },
                    { id: 'bulletSize', label: 'CALIBRE', desc: '+15% Tamaño', maxLevel: 5 },
                    { id: 'fireRate', label: 'CADENCIA', desc: '+15% Vel. Disparo' }
                  ].filter(skill => {
                    if (skill.maxLevel && uiState.tempSkills[skill.id] >= skill.maxLevel) return false;
                    return true;
                  }).map(skill => (
                    <button key={skill.id} onClick={() => {
                      playSoundRef.current('menuSelect');
                      playSoundRef.current('menuClose');
                      const newLevel = uiState.tempSkills[skill.id] + 1;
                      setUiState(s => ({
                        ...s, 
                        showTempSkills: false, isPaused: false, 
                        tempSkills: { ...s.tempSkills, [skill.id]: newLevel }
                      }));
                      // Apply effects
                      const state = gameState.current;
                      if (skill.id === 'bulletSpeed') state.player.bulletSpeed *= 1.15;
                      if (skill.id === 'bulletLife') state.player.bulletLife *= 1.2;
                      if (skill.id === 'bulletSize') state.player.bulletSize *= 1.15;
                      if (skill.id === 'fireRate') state.player.fireRate *= 0.85;
                      state.isPaused = false;
                      startMusicRef.current();
                    }} className="p-3 bg-gray-800 hover:bg-gray-700 border-2 border-white/10 hover:border-blue-400 rounded-lg flex flex-col items-center gap-1 transition-all">
                      <div className="text-xs font-bold">{skill.label}</div>
                      <div className="text-[9px] text-gray-400">{skill.desc}</div>
                      {skill.maxLevel && <div className="text-[8px] text-blue-400">Nvl {uiState.tempSkills[skill.id]}/{skill.maxLevel}</div>}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
          {uiState.isPaused && !uiState.showTempSkills && !uiState.isGameOver && (
            <motion.div key="pause-menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="text-center p-8 bg-gray-900 border-2 border-white/20 rounded-2xl">
                <h2 className="text-4xl mb-8">PAUSA</h2>
                <button onClick={handlePauseToggle} className="px-8 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm border-b-4 border-blue-800 active:border-b-0 active:translate-y-1 transition-all">REANUDAR</button>
                <div className="mt-8 flex justify-center gap-4">
                  <button onClick={() => setLocation('/')} className="p-4 px-8 bg-gray-800 rounded-lg border border-white/10 flex flex-col items-center gap-2">
                    <X className="w-6 h-6" />
                    <span className="text-[10px]">SALIR</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
          {uiState.isGameOver && (
            <motion.div key="game-over" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <GameOverMenu score={uiState.score} level={uiState.level} revivesLeft={uiState.revivesLeft} coins={uiState.coins} stats={uiState.stats} onRevive={handleRevive} onRestart={() => window.location.reload()} onExit={() => setLocation('/')} />
            </motion.div>
          )}
          {achievementNotification && (
            <motion.div 
              key={`achievement-${achievementNotification.id}`}
              initial={{ opacity: 0, y: -50 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -50 }} 
              className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-gradient-to-r from-yellow-900/90 via-yellow-800/90 to-yellow-900/90 border-2 border-yellow-500 rounded-xl px-6 py-3 flex items-center gap-4 shadow-[0_0_30px_rgba(234,179,8,0.5)]"
            >
              <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center text-black font-bold text-sm shadow-[0_0_10px_#eab308]">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <div className="text-yellow-400 text-xs uppercase tracking-wider">Logro Desbloqueado</div>
                <div className="text-white font-bold">{achievementNotification.name}</div>
                <div className="text-gray-400 text-[10px]">{achievementNotification.description}</div>
              </div>
            </motion.div>
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

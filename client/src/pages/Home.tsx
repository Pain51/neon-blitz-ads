import React from 'react';
import { useLocation } from 'wouter';
import { useScores } from '@/hooks/use-scores';
import { GameButton } from '@/components/ui/GameButton';
import { motion } from 'framer-motion';
import { Trophy, Play, Skull, Crosshair, Star, X } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';

export default function Home() {
  const [, setLocation] = useLocation();
  const { data: scores, isLoading } = useScores();

  const [difficulty, setDifficulty] = React.useState<'easy' | 'medium' | 'hard' | 'extreme'>('medium');
  const [weapon, setWeapon] = React.useState<'normal' | 'laser' | 'shotgun'>('normal');
  const [selectedSkin, setSelectedSkin] = React.useState<'pink' | 'cyan' | 'yellow' | 'green'>('pink');
  const [showPermanentUpgrades, setShowPermanentUpgrades] = React.useState(false);
  const [showWeaponSelection, setShowWeaponSelection] = React.useState(false);
  const [showAchievements, setShowAchievements] = React.useState(false);

  const ALL_ACHIEVEMENTS = [
    { id: 'first_blood', name: 'First Blood', description: 'Derrota a tu primer enemigo', icon: '1' },
    { id: 'survivor_5', name: 'Survivor', description: 'Alcanza el nivel 5', icon: '5' },
    { id: 'survivor_10', name: 'Elite Survivor', description: 'Alcanza el nivel 10', icon: '10' },
    { id: 'boss_slayer', name: 'Boss Slayer', description: 'Derrota a un jefe', icon: 'B' },
    { id: 'score_1k', name: 'Point Hunter', description: 'Consigue 1,000 puntos', icon: '1K' },
    { id: 'score_10k', name: 'Score Master', description: 'Consigue 10,000 puntos', icon: '10K' },
    { id: 'powerup_5', name: 'Power Collector', description: 'Recoge 5 power-ups en una partida', icon: 'P' },
    { id: 'no_damage', name: 'Untouchable', description: 'Completa un nivel sin recibir daño', icon: 'U' },
  ];

  const [unlockedAchievements, setUnlockedAchievements] = React.useState<string[]>(() => {
    const saved = localStorage.getItem('achievements');
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    // Convert object map {id: true} to array of ids
    return Object.keys(parsed).filter(key => parsed[key]);
  });

  const SKINS = {
    pink: { name: 'Pink Ace', color: '#ec4899', shape: 'triangle' },
    cyan: { name: 'Cyan Bolt', color: '#06b6d4', shape: 'diamond' },
    yellow: { name: 'Gold Rush', color: '#eab308', shape: 'circle' },
    green: { name: 'Neon Leaf', color: '#22c55e', shape: 'triangle' },
  };

  const startMission = () => {
    setLocation(`/game?difficulty=${difficulty}&weapon=${weapon}&skin=${selectedSkin}`);
  };

  const [goldCoins, setGoldCoins] = React.useState(() => {
    const saved = localStorage.getItem('goldCoins');
    return saved ? parseInt(saved) : 0;
  });
  const [permUpgrades, setPermUpgrades] = React.useState(() => {
    const saved = localStorage.getItem('permanentUpgrades');
    return saved ? JSON.parse(saved) : {
      baseHp: 0,
      baseSpeed: 0,
      baseDmg: 0,
      bulletFire: 0,
      bulletIce: 0
    };
  });
  const [upgradeTab, setUpgradeTab] = React.useState<'stats' | 'effects'>('stats');

  React.useEffect(() => {
    localStorage.setItem('permanentUpgrades', JSON.stringify(permUpgrades));
    localStorage.setItem('goldCoins', goldCoins.toString());
  }, [permUpgrades, goldCoins]);

  const buyUpgrade = (key: string, cost: number, maxLevel?: number) => {
    const currentLevel = (permUpgrades as any)[key] || 0;
    if (maxLevel && currentLevel >= maxLevel) return;
    if (goldCoins >= cost) {
      setGoldCoins(c => c - cost);
      setPermUpgrades((u: any) => ({ ...u, [key]: (u[key] || 0) + 1 }));
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Weapon Selection Modal */}
      <AnimatePresence>
        {showWeaponSelection && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md bg-zinc-900 border-2 border-primary rounded-xl p-6"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-arcade text-white">SELECCIONAR ARMA</h2>
                <button onClick={() => setShowWeaponSelection(false)} className="text-white hover:text-primary">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="grid gap-4">
                {[
                  { id: 'normal', label: 'Clásica', desc: 'Equilibrada 2.0 DMG' },
                  { id: 'laser', label: 'Láser', desc: 'Alta Frecuencia 0.3 DMG' },
                  { id: 'shotgun', label: 'Escopeta', desc: '5 Balas Dispersas 0.5 DMG' }
                ].map(w => (
                  <button
                    key={w.id}
                    onClick={() => {
                      setWeapon(w.id as any);
                      setShowWeaponSelection(false);
                    }}
                    className={`flex items-center justify-between p-4 rounded-lg border transition-all ${weapon === w.id ? 'bg-primary border-primary text-white scale-[1.02]' : 'bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10'}`}
                  >
                    <div className="flex flex-col items-start text-left">
                      <span className="font-bold text-lg">{w.label}</span>
                      <span className="text-xs opacity-70">{w.desc}</span>
                    </div>
                    {weapon === w.id && <Star className="w-5 h-5 fill-current" />}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Achievements Modal */}
      <AnimatePresence>
        {showAchievements && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md bg-zinc-900 border-2 border-yellow-500 rounded-xl p-6 max-h-[80vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-arcade text-yellow-500">LOGROS</h2>
                <button onClick={() => setShowAchievements(false)} className="text-white hover:text-primary">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="mb-4 text-center">
                <span className="text-yellow-500 font-arcade">{unlockedAchievements.length} / {ALL_ACHIEVEMENTS.length}</span>
              </div>
              <div className="grid gap-3">
                {ALL_ACHIEVEMENTS.map(ach => {
                  const isUnlocked = unlockedAchievements.includes(ach.id);
                  return (
                    <div
                      key={ach.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${isUnlocked ? 'bg-yellow-900/30 border-yellow-500/50' : 'bg-white/5 border-white/10 opacity-50'}`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-arcade text-sm ${isUnlocked ? 'bg-yellow-500 text-black' : 'bg-gray-700 text-gray-500'}`}>
                        {isUnlocked ? <Trophy className="w-5 h-5" /> : '?'}
                      </div>
                      <div className="flex-1">
                        <div className={`font-bold text-sm ${isUnlocked ? 'text-white' : 'text-gray-500'}`}>{ach.name}</div>
                        <div className="text-xs text-gray-400">{ach.description}</div>
                      </div>
                      {isUnlocked && <Star className="w-4 h-4 text-yellow-500" />}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Permanent Upgrades Modal */}
      <AnimatePresence>
        {showPermanentUpgrades && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md bg-zinc-900 border-2 border-yellow-500 rounded-xl p-6"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-arcade text-yellow-500">MEJORAS</h2>
                <button onClick={() => setShowPermanentUpgrades(false)} className="text-white hover:text-primary">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="mb-4 text-center">
                <span className="text-yellow-500 font-arcade text-sm">MONEDAS: {goldCoins}</span>
              </div>
              
              {/* Tabs */}
              <div className="flex gap-2 mb-4">
                <button 
                  onClick={() => setUpgradeTab('stats')}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${upgradeTab === 'stats' ? 'bg-yellow-500 text-black' : 'bg-white/10 text-white'}`}
                >
                  ESTADISTICAS
                </button>
                <button 
                  onClick={() => setUpgradeTab('effects')}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${upgradeTab === 'effects' ? 'bg-yellow-500 text-black' : 'bg-white/10 text-white'}`}
                >
                  EFECTOS
                </button>
              </div>

              {upgradeTab === 'stats' ? (
                <div className="grid gap-3">
                  {[
                    { id: 'baseHp', label: 'Vida Base', cost: 100, desc: '+20 HP' },
                    { id: 'baseSpeed', label: 'Velocidad', cost: 150, desc: '+20 Vel' },
                    { id: 'baseDmg', label: 'Daño Base', cost: 200, desc: '+0.5 DMG' },
                  ].map(upg => {
                    const level = (permUpgrades as any)[upg.id] || 0;
                    const currentCost = upg.cost * (level + 1);
                    return (
                      <button
                        key={upg.id}
                        onClick={() => buyUpgrade(upg.id, currentCost)}
                        disabled={goldCoins < currentCost}
                        className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 disabled:opacity-50"
                      >
                        <div className="flex flex-col items-start">
                          <span className="font-bold text-sm">{upg.label}</span>
                          <span className="text-[10px] text-gray-400">{upg.desc}</span>
                          <span className="text-xs text-yellow-500">Costo: {currentCost}</span>
                        </div>
                        <span className="font-arcade text-xs">NVL {level}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="grid gap-3">
                  {[
                    { id: 'bulletFire', label: 'FUEGO', cost: 500, desc: 'Quema enemigos (20% DMG/3s)', color: 'text-orange-500', maxLevel: 1 },
                    { id: 'bulletIce', label: 'HIELO', cost: 500, desc: 'Ralentiza enemigos (60%/3s)', color: 'text-cyan-400', maxLevel: 1 },
                  ].map(upg => {
                    const level = (permUpgrades as any)[upg.id] || 0;
                    const currentCost = upg.cost;
                    const isMaxed = level >= upg.maxLevel;
                    return (
                      <button
                        key={upg.id}
                        onClick={() => !isMaxed && buyUpgrade(upg.id, currentCost, upg.maxLevel)}
                        disabled={goldCoins < currentCost || isMaxed}
                        className={`flex items-center justify-between p-4 border rounded-lg transition-all ${isMaxed ? 'bg-green-900/30 border-green-500/50' : 'bg-white/5 border-white/10 hover:bg-white/10'} disabled:opacity-50`}
                      >
                        <div className="flex flex-col items-start">
                          <span className={`font-bold ${upg.color}`}>{upg.label}</span>
                          <span className="text-[10px] text-gray-400">{upg.desc}</span>
                          {!isMaxed && <span className="text-xs text-yellow-500">Costo: {currentCost}</span>}
                        </div>
                        <span className={`font-arcade text-xs ${isMaxed ? 'text-green-400' : ''}`}>
                          {isMaxed ? 'ACTIVO' : 'COMPRAR'}
                        </span>
                      </button>
                    );
                  })}
                  <p className="text-[10px] text-gray-500 text-center mt-2">Los efectos aplican a todas tus balas</p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Background Ambience */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-secondary/20 rounded-full blur-[80px]" />
      </div>

      <motion.div 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center z-10 mb-12"
      >
        <h1 className="font-arcade text-4xl md:text-6xl lg:text-7xl text-white mb-4 tracking-tighter text-shadow-neon">
          NEON <span className="text-primary">BLITZ</span>
        </h1>
        <p className="text-muted-foreground font-sans text-lg md:text-xl max-w-lg mx-auto">
          Sobrevive a las oleadas. Mejora tu arsenal. Conviértete en leyenda.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-8 w-full max-w-4xl z-10">
        
        {/* Menu Actions */}
        <motion.div 
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col gap-4 items-center justify-center bg-zinc-900/50 backdrop-blur-sm p-8 rounded-2xl border border-white/5 shadow-2xl"
        >
          <button 
            onClick={() => setShowWeaponSelection(true)}
            className="w-full p-4 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-between hover:bg-primary/20 transition-all group"
          >
            <div className="flex items-center gap-3">
              <Crosshair className="w-6 h-6 text-primary group-hover:rotate-90 transition-transform" />
              <div className="flex flex-col items-start">
                <span className="text-[10px] font-arcade text-primary">ARMA ACTUAL</span>
                <span className="text-sm font-bold text-white uppercase">{weapon === 'normal' ? 'Clásica' : weapon}</span>
              </div>
            </div>
            <Star className="w-4 h-4 text-primary animate-pulse" />
          </button>

          {/* Skin Selection */}
          <div className="w-full space-y-2 mt-2">
            <span className="text-[10px] font-arcade text-muted-foreground ml-1">SELECCIONAR PERSONAJE</span>
            <div className="flex gap-2 w-full">
              {Object.entries(SKINS).map(([id, skin]) => (
                <button
                  key={id}
                  onClick={() => setSelectedSkin(id as any)}
                  className={`flex-1 aspect-square rounded-lg border-2 transition-all flex items-center justify-center p-2 ${selectedSkin === id ? 'bg-white/10 border-primary scale-105' : 'bg-black/40 border-white/5 opacity-40 hover:opacity-100'}`}
                >
                  <div 
                    className="w-full h-full" 
                    style={{ 
                      backgroundColor: skin.color,
                      clipPath: skin.shape === 'triangle' 
                        ? 'polygon(50% 0%, 0% 100%, 100% 100%)' 
                        : skin.shape === 'diamond'
                          ? 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)'
                          : 'none',
                      borderRadius: skin.shape === 'circle' ? '50%' : '2px'
                    }}
                  />
                </button>
              ))}
            </div>
          </div>

          <GameButton 
            size="lg" 
            className="w-full h-20 text-xl flex items-center justify-center gap-4 group"
            onClick={startMission}
          >
            <Play className="w-8 h-8 group-hover:animate-pulse" />
            INICIAR MISIÓN
          </GameButton>

          <div className="grid grid-cols-2 gap-3 w-full">
            <button 
              onClick={() => setShowPermanentUpgrades(true)}
              className="p-3 bg-black/40 rounded-lg border border-white/10 flex items-center gap-3 hover:bg-white/10 transition-colors"
              data-testid="button-upgrades"
            >
              <Star className="w-6 h-6 text-yellow-500 shrink-0" />
              <div className="flex flex-col items-start text-left min-w-0">
                <span className="text-xs font-bold text-white truncate">Mejoras</span>
                <span className="text-[10px] text-yellow-500">Permanentes</span>
              </div>
            </button>
            <button 
              onClick={() => setShowAchievements(true)}
              className="p-3 bg-black/40 rounded-lg border border-white/10 flex items-center gap-3 hover:bg-white/10 transition-colors"
              data-testid="button-achievements"
            >
              <Trophy className="w-6 h-6 text-yellow-500 shrink-0" />
              <div className="flex flex-col items-start text-left min-w-0">
                <span className="text-xs font-bold text-white truncate">Logros</span>
                <span className="text-[10px] text-yellow-500">{unlockedAchievements.length}/{ALL_ACHIEVEMENTS.length}</span>
              </div>
            </button>
          </div>

          <div className="w-full p-3 bg-black/40 rounded-lg border border-white/10">
            <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-2">Dificultad</span>
            <div className="grid grid-cols-4 gap-2">
              {[
                {id: 'easy', label: 'Fácil'},
                {id: 'medium', label: 'Normal'},
                {id: 'hard', label: 'Difícil'},
                {id: 'extreme', label: 'Extremo'}
              ].map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDifficulty(d.id as any)}
                  className={`text-[9px] md:text-[10px] px-2 py-2 rounded font-bold border transition-all truncate ${difficulty === d.id ? (d.id === 'extreme' ? 'bg-red-600 border-red-500 text-white' : 'bg-primary border-primary text-white') : 'border-white/10 text-muted-foreground hover:bg-white/5'}`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Leaderboard */}
        <motion.div 
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-zinc-900/50 backdrop-blur-sm p-6 rounded-2xl border border-white/5 shadow-2xl flex flex-col h-[400px]"
        >
          <div className="flex items-center gap-2 mb-6 border-b border-white/10 pb-4">
            <Trophy className="text-yellow-500 w-6 h-6" />
            <h2 className="font-arcade text-xl text-white">TOP AGENTES</h2>
          </div>

          <div className="overflow-y-auto flex-1 pr-2 space-y-2 custom-scrollbar">
            {isLoading ? (
              <div className="text-center text-muted-foreground py-10">Cargando datos...</div>
            ) : scores?.length === 0 ? (
              <div className="text-center text-muted-foreground py-10">Sin registros. ¡Sé el primero!</div>
            ) : (
              scores?.sort((a, b) => b.score - a.score).map((score, idx) => (
                <div 
                  key={score.id}
                  className="flex items-center justify-between p-3 bg-black/40 rounded border border-white/5 hover:border-primary/50 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <span className={`
                      font-arcade text-sm w-8 h-8 flex items-center justify-center rounded
                      ${idx === 0 ? 'bg-yellow-500/20 text-yellow-500' : 
                        idx === 1 ? 'bg-gray-400/20 text-gray-400' : 
                        idx === 2 ? 'bg-amber-700/20 text-amber-700' : 'text-zinc-600'}
                    `}>
                      {idx + 1}
                    </span>
                    <span className="font-mono font-bold text-white group-hover:text-primary transition-colors">
                      {score.username}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-secondary">{score.score.toLocaleString()}</div>
                    <div className="text-[10px] text-muted-foreground uppercase">Nivel {score.level}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
      
      <div className="absolute bottom-4 text-center text-muted-foreground text-xs font-mono opacity-50">
        WASD / Flechas para Mover • Optimizado para Móvil • v1.0.0
      </div>
    </div>
  );
}

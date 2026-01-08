import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { GameButton } from '../ui/GameButton';
import { useCreateScore } from '@/hooks/use-scores';
import { Loader2, Trophy } from 'lucide-react';

interface GameStats {
  enemiesKilled: number;
  bossesKilled: number;
  powerupsCollected: number;
  damageTakenThisLevel: number;
}

interface GameOverMenuProps {
  score: number;
  level: number;
  revivesLeft: number;
  coins: number;
  stats?: GameStats;
  onRevive: () => void;
  onRestart: () => void;
  onExit: () => void;
}

export const GameOverMenu: React.FC<GameOverMenuProps> = ({ 
  score, 
  level, 
  revivesLeft,
  coins,
  stats,
  onRevive, 
  onRestart,
  onExit
}) => {
  const [username, setUsername] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const { mutate, isPending } = useCreateScore();

  const handleSubmitScore = () => {
    if (!username.trim()) return;
    mutate(
      { username, score, level }, 
      { onSuccess: () => setSubmitted(true) }
    );
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-2 overflow-y-auto">
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-sm text-center my-auto"
      >
        <h2 className="text-2xl font-arcade text-destructive mb-2">GAME OVER</h2>
        <div className="bg-zinc-900/80 border border-white/10 rounded-xl p-4 mb-4">
          <div className="flex justify-between items-center mb-3">
            <div className="text-left">
              <p className="text-muted-foreground uppercase text-[10px] font-bold">Puntaje</p>
              <p className="text-2xl font-mono font-bold text-white">{score.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground uppercase text-[10px] font-bold">Nivel</p>
              <p className="text-2xl font-mono text-secondary">{level}</p>
            </div>
          </div>

          {stats && (
            <div className="grid grid-cols-4 gap-1 mb-3 text-xs">
              <div className="bg-black/50 rounded p-1">
                <p className="text-gray-500 uppercase text-[8px]">Enemigos</p>
                <p className="text-white font-mono text-sm">{stats.enemiesKilled}</p>
              </div>
              <div className="bg-black/50 rounded p-1">
                <p className="text-gray-500 uppercase text-[8px]">Jefes</p>
                <p className="text-white font-mono text-sm">{stats.bossesKilled}</p>
              </div>
              <div className="bg-black/50 rounded p-1">
                <p className="text-gray-500 uppercase text-[8px]">Power-ups</p>
                <p className="text-white font-mono text-sm">{stats.powerupsCollected}</p>
              </div>
              <div className="bg-black/50 rounded p-1">
                <p className="text-gray-500 uppercase text-[8px]">Monedas</p>
                <p className="text-yellow-500 font-mono text-sm">{coins}</p>
              </div>
            </div>
          )}

          {!submitted ? (
            <div className="flex gap-2">
              <input 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="INICIALES"
                maxLength={3}
                className="flex-1 bg-black border border-white/20 rounded px-2 py-1.5 text-center uppercase font-mono text-white text-sm placeholder:text-zinc-700 focus:border-primary focus:outline-none"
              />
              <button 
                onClick={handleSubmitScore}
                disabled={isPending || !username}
                className="bg-primary text-primary-foreground px-3 py-1.5 rounded font-bold text-sm disabled:opacity-50"
              >
                {isPending ? <Loader2 className="animate-spin w-4 h-4" /> : 'OK'}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 text-green-400 font-bold bg-green-900/20 py-1.5 rounded text-sm">
              <Trophy className="w-4 h-4" /> Guardado
            </div>
          )}
        </div>

        <div className="space-y-2">
          {revivesLeft > 0 && (
            <GameButton 
              variant="secondary" 
              className="w-full"
              onClick={onRevive}
            >
              Revivir ({revivesLeft})
            </GameButton>
          )}
          
          <GameButton 
            variant="primary" 
            className="w-full"
            onClick={onRestart}
          >
            Reiniciar
          </GameButton>
          
          <GameButton 
            variant="secondary" 
            className="w-full"
            onClick={onExit}
          >
            Salir
          </GameButton>
        </div>
      </motion.div>
    </div>
  );
};

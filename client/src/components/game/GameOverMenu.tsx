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
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-sm text-center"
      >
        <h2 className="text-4xl font-arcade text-destructive mb-2 text-shadow-neon">FIN DEL JUEGO</h2>
        <div className="bg-zinc-900/80 border border-white/10 rounded-xl p-6 mb-6">
          <div className="mb-4">
            <p className="text-muted-foreground uppercase text-xs font-bold tracking-widest mb-1">Puntaje Final</p>
            <p className="text-4xl font-mono font-bold text-white">{score.toLocaleString()}</p>
          </div>
          
          <div className="mb-6">
            <p className="text-muted-foreground uppercase text-xs font-bold tracking-widest mb-1">Nivel Alcanzado</p>
            <p className="text-xl font-mono text-secondary">{level}</p>
          </div>

          {stats && (
            <div className="grid grid-cols-2 gap-2 mb-6 text-xs">
              <div className="bg-black/50 rounded p-2">
                <p className="text-gray-500 uppercase text-[10px]">Enemigos</p>
                <p className="text-white font-mono">{stats.enemiesKilled}</p>
              </div>
              <div className="bg-black/50 rounded p-2">
                <p className="text-gray-500 uppercase text-[10px]">Jefes</p>
                <p className="text-white font-mono">{stats.bossesKilled}</p>
              </div>
              <div className="bg-black/50 rounded p-2">
                <p className="text-gray-500 uppercase text-[10px]">Power-ups</p>
                <p className="text-white font-mono">{stats.powerupsCollected}</p>
              </div>
              <div className="bg-black/50 rounded p-2">
                <p className="text-gray-500 uppercase text-[10px]">Monedas</p>
                <p className="text-yellow-500 font-mono">{coins}</p>
              </div>
            </div>
          )}

          {!submitted ? (
            <div className="flex gap-2">
              <input 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="TUS INICIALES"
                maxLength={3}
                className="flex-1 bg-black border border-white/20 rounded px-3 py-2 text-center uppercase font-mono text-white placeholder:text-zinc-700 focus:border-primary focus:outline-none"
              />
              <button 
                onClick={handleSubmitScore}
                disabled={isPending || !username}
                className="bg-primary text-primary-foreground px-3 py-2 rounded font-bold disabled:opacity-50"
              >
                {isPending ? <Loader2 className="animate-spin w-5 h-5" /> : 'GUARDAR'}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 text-green-400 font-bold bg-green-900/20 py-2 rounded">
              <Trophy className="w-4 h-4" /> ¡Puntaje Guardado!
            </div>
          )}
        </div>

        <div className="space-y-3">
          {revivesLeft > 0 && (
            <GameButton 
              variant="secondary" 
              className="w-full"
              onClick={onRevive}
            >
              Revivir ({revivesLeft} restantes)
            </GameButton>
          )}
          
          <GameButton 
            variant="primary" 
            className="w-full"
            onClick={onRestart}
          >
            Reiniciar Misión
          </GameButton>
          
          <GameButton 
            variant="secondary" 
            className="w-full"
            onClick={onExit}
          >
            Salir al Menú
          </GameButton>
        </div>
      </motion.div>
    </div>
  );
};

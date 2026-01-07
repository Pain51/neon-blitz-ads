import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { GameButton } from '../ui/GameButton';
import { useCreateScore } from '@/hooks/use-scores';
import { Loader2, Trophy } from 'lucide-react';

interface GameOverMenuProps {
  score: number;
  level: number;
  revivesLeft: number;
  onRevive: () => void;
  onRestart: () => void;
}

export const GameOverMenu: React.FC<GameOverMenuProps> = ({ 
  score, 
  level, 
  revivesLeft, 
  onRevive, 
  onRestart 
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
        <h2 className="text-4xl font-arcade text-destructive mb-2 text-shadow-neon">GAME OVER</h2>
        <div className="bg-zinc-900/80 border border-white/10 rounded-xl p-6 mb-6">
          <div className="mb-4">
            <p className="text-muted-foreground uppercase text-xs font-bold tracking-widest mb-1">Final Score</p>
            <p className="text-4xl font-mono font-bold text-white">{score.toLocaleString()}</p>
          </div>
          
          <div className="mb-6">
            <p className="text-muted-foreground uppercase text-xs font-bold tracking-widest mb-1">Level Reached</p>
            <p className="text-xl font-mono text-secondary">{level}</p>
          </div>

          {!submitted ? (
            <div className="flex gap-2">
              <input 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ENTER INITIALS"
                maxLength={3}
                className="flex-1 bg-black border border-white/20 rounded px-3 py-2 text-center uppercase font-mono text-white placeholder:text-zinc-700 focus:border-primary focus:outline-none"
              />
              <button 
                onClick={handleSubmitScore}
                disabled={isPending || !username}
                className="bg-primary text-primary-foreground px-3 py-2 rounded font-bold disabled:opacity-50"
              >
                {isPending ? <Loader2 className="animate-spin w-5 h-5" /> : 'SAVE'}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 text-green-400 font-bold bg-green-900/20 py-2 rounded">
              <Trophy className="w-4 h-4" /> Score Saved!
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
              Revive ({revivesLeft} Left)
            </GameButton>
          )}
          
          <GameButton 
            variant="primary" 
            className="w-full"
            onClick={onRestart}
          >
            Restart Mission
          </GameButton>
        </div>
      </motion.div>
    </div>
  );
};

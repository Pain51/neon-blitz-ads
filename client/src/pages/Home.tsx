import React from 'react';
import { useLocation } from 'wouter';
import { useScores } from '@/hooks/use-scores';
import { GameButton } from '@/components/ui/GameButton';
import { motion } from 'framer-motion';
import { Trophy, Play, Skull, Crosshair } from 'lucide-react';

export default function Home() {
  const [, setLocation] = useLocation();
  const { data: scores, isLoading } = useScores();

  const [difficulty, setDifficulty] = React.useState<'easy' | 'medium' | 'hard' | 'extreme'>('medium');

  const startMission = () => {
    setLocation(`/game?difficulty=${difficulty}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
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
          Survive the endless waves. Upgrade your arsenal. Become a legend.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-8 w-full max-w-4xl z-10">
        
        {/* Menu Actions */}
        <motion.div 
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col gap-6 items-center justify-center bg-zinc-900/50 backdrop-blur-sm p-8 rounded-2xl border border-white/5 shadow-2xl"
        >
          <GameButton 
            size="lg" 
            className="w-full h-20 text-xl flex items-center justify-center gap-4 group"
            onClick={startMission}
          >
            <Play className="w-8 h-8 group-hover:animate-pulse" />
            START MISSION
          </GameButton>

          <div className="grid grid-cols-2 gap-4 w-full">
            <button 
              onClick={() => {/* TODO: Permanent Upgrades Menu */}}
              className="p-4 bg-black/40 rounded border border-white/5 flex flex-col items-center text-center hover:bg-white/10 transition-colors"
            >
              <Star className="w-8 h-8 text-yellow-500 mb-2" />
              <span className="text-xs text-muted-foreground uppercase font-bold">Upgrades</span>
              <span className="text-sm font-bold text-yellow-500">PERMANENT</span>
            </button>
            <div className="p-4 bg-black/40 rounded border border-white/5 flex flex-col items-center text-center">
              <div className="flex flex-wrap gap-1 justify-center mt-1">
                {['easy', 'medium', 'hard', 'extreme'].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d as any)}
                    className={`text-[10px] px-2 py-1 rounded font-arcade border ${difficulty === d ? 'bg-primary border-primary text-white' : 'border-white/10 text-muted-foreground'}`}
                  >
                    {d[0]}
                  </button>
                ))}
              </div>
              <span className="text-xs text-muted-foreground uppercase font-bold mt-2">Difficulty</span>
              <span className={`text-sm font-bold ${difficulty === 'extreme' ? 'text-destructive' : 'text-primary'}`}>
                {difficulty.toUpperCase()}
              </span>
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
            <h2 className="font-arcade text-xl text-white">TOP AGENTS</h2>
          </div>

          <div className="overflow-y-auto flex-1 pr-2 space-y-2 custom-scrollbar">
            {isLoading ? (
              <div className="text-center text-muted-foreground py-10">Loading data...</div>
            ) : scores?.length === 0 ? (
              <div className="text-center text-muted-foreground py-10">No records yet. Be the first!</div>
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
                    <div className="text-[10px] text-muted-foreground uppercase">Level {score.level}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
      
      <div className="absolute bottom-4 text-center text-muted-foreground text-xs font-mono opacity-50">
        WASD / Arrows to Move • Mobile Optimized • v1.0.0
      </div>
    </div>
  );
}

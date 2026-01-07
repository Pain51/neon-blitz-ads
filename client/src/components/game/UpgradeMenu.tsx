import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Move, ChevronsUp, Shield, Crosshair, HeartPulse, Coins } from 'lucide-react';

interface UpgradeOption {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}

interface UpgradeMenuProps {
  onSelect: (optionId: string) => void;
  coins: number;
  upgradeLevels: Record<string, number>;
}

const UPGRADES: UpgradeOption[] = [
  { id: 'fireRate', label: 'Rapid Fire', icon: <Zap />, description: 'Increase shooting speed by 15%' },
  { id: 'moveSpeed', label: 'Agility', icon: <Move />, description: 'Increase movement speed by 10%' },
  { id: 'bulletSpeed', label: 'Velocity', icon: <ChevronsUp />, description: 'Projectiles travel 20% faster' },
  { id: 'bulletSize', label: 'Massive', icon: <Crosshair />, description: 'Bullets are 20% larger' },
  { id: 'pierce', label: 'Piercing', icon: <Shield />, description: 'Bullets pass through +1 enemy' },
  { id: 'regen', label: 'Recovery', icon: <HeartPulse />, description: 'Increase passive regeneration' },
];

export const UpgradeMenu: React.FC<UpgradeMenuProps> = ({ onSelect, coins, upgradeLevels }) => {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md bg-zinc-900 border-2 border-accent shadow-[0_0_30px_rgba(255,215,0,0.2)] rounded-xl p-6"
      >
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-2xl font-arcade text-accent text-neon-yellow">
            LEVEL UP!
          </h2>
          <div className="flex items-center gap-2 bg-yellow-500/20 px-3 py-1 rounded-full border border-yellow-500/50">
            <Coins className="w-4 h-4 text-yellow-500" />
            <span className="font-arcade text-sm text-yellow-500">{Math.floor(coins)}</span>
          </div>
        </div>
        <p className="text-center text-muted-foreground mb-6 font-sans">
          Choose an upgrade to continue
        </p>

        <div className="grid gap-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          {UPGRADES.map((upgrade) => (
            <motion.button
              key={upgrade.id}
              whileHover={{ scale: 1.02, x: 5 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(upgrade.id)}
              className="group flex items-center gap-4 p-4 rounded-lg bg-zinc-800/50 border border-white/10 hover:border-accent hover:bg-accent/10 transition-all text-left relative overflow-hidden"
            >
              <div className="p-3 rounded-md bg-zinc-900 group-hover:bg-accent group-hover:text-black transition-colors text-accent">
                {upgrade.icon}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-lg font-sans text-foreground group-hover:text-accent transition-colors">
                    {upgrade.label}
                  </h3>
                  <span className="font-arcade text-[10px] text-accent/60 group-hover:text-accent">
                    LVL {upgradeLevels[upgrade.id] || 0}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{upgrade.description}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

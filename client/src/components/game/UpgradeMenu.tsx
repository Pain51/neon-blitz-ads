import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameButton } from '../ui/GameButton';
import { Zap, Move, ChevronsUp, Shield, Crosshair } from 'lucide-react';

interface UpgradeOption {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}

interface UpgradeMenuProps {
  onSelect: (optionId: string) => void;
}

const UPGRADES: UpgradeOption[] = [
  { id: 'fireRate', label: 'Rapid Fire', icon: <Zap />, description: 'Increase shooting speed by 15%' },
  { id: 'moveSpeed', label: 'Agility', icon: <Move />, description: 'Increase movement speed by 10%' },
  { id: 'bulletSpeed', label: 'Velocity', icon: <ChevronsUp />, description: 'Projectiles travel 20% faster' },
  { id: 'bulletSize', label: 'Massive', icon: <Crosshair />, description: 'Bullets are 20% larger' },
  { id: 'pierce', label: 'Piercing', icon: <Shield />, description: 'Bullets pass through +1 enemy' },
];

export const UpgradeMenu: React.FC<UpgradeMenuProps> = ({ onSelect }) => {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md bg-zinc-900 border-2 border-accent shadow-[0_0_30px_rgba(255,215,0,0.2)] rounded-xl p-6"
      >
        <h2 className="text-2xl font-arcade text-accent text-center mb-2 text-neon-yellow">
          LEVEL UP!
        </h2>
        <p className="text-center text-muted-foreground mb-6 font-sans">
          Choose an upgrade to continue
        </p>

        <div className="grid gap-3">
          {UPGRADES.map((upgrade) => (
            <motion.button
              key={upgrade.id}
              whileHover={{ scale: 1.02, x: 5 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(upgrade.id)}
              className="group flex items-center gap-4 p-4 rounded-lg bg-zinc-800/50 border border-white/10 hover:border-accent hover:bg-accent/10 transition-all text-left"
            >
              <div className="p-3 rounded-md bg-zinc-900 group-hover:bg-accent group-hover:text-black transition-colors text-accent">
                {upgrade.icon}
              </div>
              <div>
                <h3 className="font-bold text-lg font-sans text-foreground group-hover:text-accent transition-colors">
                  {upgrade.label}
                </h3>
                <p className="text-sm text-muted-foreground">{upgrade.description}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

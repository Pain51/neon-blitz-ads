import React, { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface DPadProps {
  onDirectionChange: (dx: number, dy: number) => void;
}

export const DPad: React.FC<DPadProps> = ({ onDirectionChange }) => {
  const [activeDirection, setActiveDirection] = useState({ x: 0, y: 0 });

  const handleTouchStart = (x: number, y: number) => (e: React.TouchEvent) => {
    e.preventDefault();
    const newDir = { x, y };
    setActiveDirection(newDir);
    onDirectionChange(x, y);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    setActiveDirection({ x: 0, y: 0 });
    onDirectionChange(0, 0);
  };

  // Prevent default context menu on long press
  const preventContext = (e: React.SyntheticEvent) => e.preventDefault();

  const btnClass = (x: number, y: number) => `
    w-16 h-16 flex items-center justify-center 
    bg-muted/80 backdrop-blur-sm border-2 border-primary/30 rounded-lg
    active:bg-primary/40 active:border-primary transition-colors
    ${activeDirection.x === x && activeDirection.y === y ? 'bg-primary/40 border-primary' : ''}
  `;

  return (
    <div className="grid grid-cols-3 gap-2 select-none touch-none" onContextMenu={preventContext}>
      <div />
      <div 
        className={btnClass(0, -1)}
        onTouchStart={handleTouchStart(0, -1)}
        onTouchEnd={handleTouchEnd}
      >
        <ChevronUp className="w-8 h-8 text-primary" />
      </div>
      <div />

      <div 
        className={btnClass(-1, 0)}
        onTouchStart={handleTouchStart(-1, 0)}
        onTouchEnd={handleTouchEnd}
      >
        <ChevronLeft className="w-8 h-8 text-primary" />
      </div>
      <div className="w-16 h-16 flex items-center justify-center bg-black/50 rounded-full border border-white/10">
        <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
      </div>
      <div 
        className={btnClass(1, 0)}
        onTouchStart={handleTouchStart(1, 0)}
        onTouchEnd={handleTouchEnd}
      >
        <ChevronRight className="w-8 h-8 text-primary" />
      </div>

      <div />
      <div 
        className={btnClass(0, 1)}
        onTouchStart={handleTouchStart(0, 1)}
        onTouchEnd={handleTouchEnd}
      >
        <ChevronDown className="w-8 h-8 text-primary" />
      </div>
      <div />
    </div>
  );
};

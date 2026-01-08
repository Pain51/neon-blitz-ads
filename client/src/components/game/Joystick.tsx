import React, { useState } from 'react';

interface JoystickProps {
  onMove: (dx: number, dy: number) => void;
  onDirectionChange?: (dx: number, dy: number) => void;
  size?: number;
  label?: string;
}

export const Joystick: React.FC<JoystickProps> = ({ onMove, onDirectionChange, size = 120, label }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const knobSize = size / 3;
  const radius = size / 2;

  const handleMove = (clientX: number, clientY: number, target: HTMLElement) => {
    const rect = target.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    let dx = clientX - centerX;
    let dy = clientY - centerY;
    
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxRadius = rect.width / 2;
    if (distance > maxRadius) {
      dx = (dx / distance) * maxRadius;
      dy = (dy / distance) * maxRadius;
    }

    const normalizedX = dx / maxRadius;
    const normalizedY = dy / maxRadius;

    setPosition({ x: dx, y: dy });
    onMove(normalizedX, normalizedY);
    if (onDirectionChange) onDirectionChange(normalizedX, normalizedY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    
    // Find the touch associated with this specific joystick by checking all active touches
    const rect = e.currentTarget.getBoundingClientRect();
    const touch = Array.from(e.touches).find(t => {
      // Allow some padding around the joystick for movement
      const padding = 50;
      return (
        t.clientX >= rect.left - padding &&
        t.clientX <= rect.right + padding &&
        t.clientY >= rect.top - padding &&
        t.clientY <= rect.bottom + padding
      );
    }) || e.touches[0];
    
    handleMove(touch.clientX, touch.clientY, e.currentTarget as HTMLElement);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    handleMove(e.touches[0].clientX, e.touches[0].clientY, e.currentTarget as HTMLElement);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setPosition({ x: 0, y: 0 });
    onMove(0, 0);
    if (onDirectionChange) onDirectionChange(0, 0);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {label && <span className="text-[10px] text-white/50 font-press-start uppercase">{label}</span>}
      <div 
        className="relative rounded-full bg-muted/30 backdrop-blur-sm border-2 border-primary/20 touch-none select-none"
        style={{ width: size, height: size }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div 
          className="absolute rounded-full bg-primary shadow-lg shadow-primary/40 transition-transform duration-75"
          style={{ 
            width: knobSize, 
            height: knobSize,
            left: radius - knobSize / 2 + position.x,
            top: radius - knobSize / 2 + position.y
          }}
        />
      </div>
    </div>
  );
};

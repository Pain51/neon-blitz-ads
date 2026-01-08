import React, { useState } from 'react';

interface JoystickProps {
  onDirectionChange: (dx: number, dy: number) => void;
}

export const Joystick: React.FC<JoystickProps> = ({ onDirectionChange }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const size = 120;
  const knobSize = 40;
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
    onDirectionChange(normalizedX, normalizedY);
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
    onDirectionChange(0, 0);
  };

  return (
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
  );
};

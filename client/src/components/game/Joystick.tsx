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
    const centerX = rect.left + radius;
    const centerY = rect.top + radius;
    
    let dx = clientX - centerX;
    let dy = clientY - centerY;
    
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > radius) {
      dx = (dx / distance) * radius;
      dy = (dy / distance) * radius;
    }

    const normalizedX = dx / radius;
    const normalizedY = dy / radius;

    setPosition({ x: dx, y: dy });
    onDirectionChange(normalizedX, normalizedY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    handleMove(e.touches[0].clientX, e.touches[0].clientY, e.currentTarget as HTMLElement);
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

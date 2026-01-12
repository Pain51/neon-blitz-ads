import React, { useState, useRef, useCallback, useEffect } from 'react';

interface FloatingJoystickProps {
  onMove: (dx: number, dy: number) => void;
  side: 'left' | 'right';
  baseSize?: number;
  knobSize?: number;
}

export const FloatingJoystick: React.FC<FloatingJoystickProps> = ({ 
  onMove, 
  side,
  baseSize = 100,
  knobSize = 40
}) => {
  const [isActive, setIsActive] = useState(false);
  const [basePosition, setBasePosition] = useState({ x: 0, y: 0 });
  const [knobPosition, setKnobPosition] = useState({ x: 0, y: 0 });
  const touchIdRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMouseDownRef = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      
      if (touch.clientX >= rect.left && touch.clientX <= rect.right &&
          touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
        
        if (touchIdRef.current === null) {
          const x = touch.clientX - rect.left;
          const y = touch.clientY - rect.top;

          touchIdRef.current = touch.identifier;
          setBasePosition({ x, y });
          setKnobPosition({ x: 0, y: 0 });
          setIsActive(true);
          break;
        }
      }
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchIdRef.current === null) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier !== touchIdRef.current) continue;

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      let dx = touch.clientX - rect.left - basePosition.x;
      let dy = touch.clientY - rect.top - basePosition.y;

      const maxRadius = baseSize / 2;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > maxRadius) {
        dx = (dx / distance) * maxRadius;
        dy = (dy / distance) * maxRadius;
      }

      setKnobPosition({ x: dx, y: dy });

      const normalizedX = dx / maxRadius;
      const normalizedY = dy / maxRadius;
      onMove(normalizedX, normalizedY);
      break;
    }
  }, [basePosition, baseSize, onMove]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === touchIdRef.current) {
        touchIdRef.current = null;
        setIsActive(false);
        setKnobPosition({ x: 0, y: 0 });
        onMove(0, 0);
        break;
      }
    }
  }, [onMove]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    isMouseDownRef.current = true;
    setBasePosition({ x, y });
    setKnobPosition({ x: 0, y: 0 });
    setIsActive(true);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isMouseDownRef.current) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    let dx = e.clientX - rect.left - basePosition.x;
    let dy = e.clientY - rect.top - basePosition.y;

    const maxRadius = baseSize / 2;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > maxRadius) {
      dx = (dx / distance) * maxRadius;
      dy = (dy / distance) * maxRadius;
    }

    setKnobPosition({ x: dx, y: dy });

    const normalizedX = dx / maxRadius;
    const normalizedY = dy / maxRadius;
    onMove(normalizedX, normalizedY);
  }, [basePosition, baseSize, onMove]);

  const handleMouseUp = useCallback(() => {
    if (!isMouseDownRef.current) return;
    isMouseDownRef.current = false;
    setIsActive(false);
    setKnobPosition({ x: 0, y: 0 });
    onMove(0, 0);
  }, [onMove]);

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isMouseDownRef.current) {
        isMouseDownRef.current = false;
        setIsActive(false);
        setKnobPosition({ x: 0, y: 0 });
        onMove(0, 0);
      }
    };
    
    const handleGlobalTouchEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchIdRef.current) {
          touchIdRef.current = null;
          setIsActive(false);
          setKnobPosition({ x: 0, y: 0 });
          onMove(0, 0);
          break;
        }
      }
    };
    
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('touchend', handleGlobalTouchEnd);
    window.addEventListener('touchcancel', handleGlobalTouchEnd);
    
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('touchend', handleGlobalTouchEnd);
      window.removeEventListener('touchcancel', handleGlobalTouchEnd);
    };
  }, [onMove]);

  return (
    <div
      ref={containerRef}
      className={`absolute bottom-0 ${side === 'left' ? 'left-0' : 'right-0'} w-1/2 h-[60%] touch-none z-30`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {isActive && (
        <>
          <div
            className="absolute rounded-full border-2 border-primary/40 bg-black/20 backdrop-blur-sm"
            style={{
              width: baseSize,
              height: baseSize,
              left: basePosition.x - baseSize / 2,
              top: basePosition.y - baseSize / 2,
            }}
          />
          <div
            className="absolute rounded-full bg-primary/80 shadow-lg shadow-primary/50"
            style={{
              width: knobSize,
              height: knobSize,
              left: basePosition.x + knobPosition.x - knobSize / 2,
              top: basePosition.y + knobPosition.y - knobSize / 2,
            }}
          />
        </>
      )}
      <div className={`absolute bottom-4 ${side === 'left' ? 'left-4' : 'right-4'} text-[8px] text-white/30 uppercase pointer-events-none`}>
        {side === 'left' ? 'MOVER' : 'DISPARAR'}
      </div>
    </div>
  );
};

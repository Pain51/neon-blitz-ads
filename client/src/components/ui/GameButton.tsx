import React from 'react';
import { cn } from '@/lib/utils';

interface GameButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const GameButton = React.forwardRef<HTMLButtonElement, GameButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    
    const variants = {
      primary: 'bg-primary text-primary-foreground border-primary shadow-[0_0_15px_rgba(255,0,128,0.4)] hover:shadow-[0_0_25px_rgba(255,0,128,0.6)]',
      secondary: 'bg-secondary text-secondary-foreground border-secondary shadow-[0_0_15px_rgba(0,255,255,0.4)] hover:shadow-[0_0_25px_rgba(0,255,255,0.6)]',
      danger: 'bg-destructive text-destructive-foreground border-destructive shadow-[0_0_15px_rgba(255,50,50,0.4)] hover:shadow-[0_0_25px_rgba(255,50,50,0.6)]',
    };

    const sizes = {
      sm: 'px-3 py-1 text-xs',
      md: 'px-6 py-3 text-sm',
      lg: 'px-8 py-4 text-base',
    };

    return (
      <button
        ref={ref}
        className={cn(
          "font-arcade uppercase tracking-wider transition-all duration-200 border-2 active:translate-y-1 disabled:opacity-50 disabled:pointer-events-none rounded-none clip-path-polygon",
          variants[variant],
          sizes[size],
          className
        )}
        style={{
          clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)'
        }}
        {...props}
      >
        {children}
      </button>
    );
  }
);
GameButton.displayName = 'GameButton';

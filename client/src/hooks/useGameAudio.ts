import { useRef, useCallback, useEffect } from 'react';

type SoundType = 'shoot' | 'hit' | 'explosion' | 'gem' | 'levelUp' | 'coin' | 'damage' | 'gameOver';

export function useGameAudio() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const enabledRef = useRef(true);
  const userInteractedRef = useRef(false);

  useEffect(() => {
    const handleInteraction = () => {
      userInteractedRef.current = true;
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume();
      }
    };
    
    window.addEventListener('touchstart', handleInteraction, { once: true });
    window.addEventListener('click', handleInteraction, { once: true });
    window.addEventListener('keydown', handleInteraction, { once: true });
    
    return () => {
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const getContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (userInteractedRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  const playSound = useCallback((type: SoundType) => {
    if (!enabledRef.current) return;

    try {
      const ctx = getContext();
      const now = ctx.currentTime;

      switch (type) {
        case 'shoot': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'square';
          osc.frequency.setValueAtTime(600, now);
          osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
          osc.start(now);
          osc.stop(now + 0.1);
          break;
        }

        case 'hit': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(300, now);
          osc.frequency.exponentialRampToValueAtTime(100, now + 0.08);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
          osc.start(now);
          osc.stop(now + 0.08);
          break;
        }

        case 'explosion': {
          const bufferSize = ctx.sampleRate * 0.2;
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
          }
          const noise = ctx.createBufferSource();
          const filter = ctx.createBiquadFilter();
          const gain = ctx.createGain();
          noise.buffer = buffer;
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(1000, now);
          filter.frequency.exponentialRampToValueAtTime(100, now + 0.2);
          noise.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          gain.gain.setValueAtTime(0.3, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
          noise.start(now);
          break;
        }

        case 'gem': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(800, now);
          osc.frequency.setValueAtTime(1000, now + 0.05);
          osc.frequency.setValueAtTime(1200, now + 0.1);
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
          osc.start(now);
          osc.stop(now + 0.15);
          break;
        }

        case 'coin': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(987, now);
          osc.frequency.setValueAtTime(1318, now + 0.08);
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
          osc.start(now);
          osc.stop(now + 0.15);
          break;
        }

        case 'levelUp': {
          const notes = [523, 659, 784, 1047];
          notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.1);
            gain.gain.setValueAtTime(0, now + i * 0.1);
            gain.gain.linearRampToValueAtTime(0.15, now + i * 0.1 + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.2);
            osc.start(now + i * 0.1);
            osc.stop(now + i * 0.1 + 0.25);
          });
          break;
        }

        case 'damage': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'square';
          osc.frequency.setValueAtTime(150, now);
          osc.frequency.exponentialRampToValueAtTime(50, now + 0.15);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
          osc.start(now);
          osc.stop(now + 0.15);
          break;
        }

        case 'gameOver': {
          const notes = [392, 349, 330, 262];
          notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now + i * 0.25);
            gain.gain.setValueAtTime(0, now + i * 0.25);
            gain.gain.linearRampToValueAtTime(0.15, now + i * 0.25 + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.25 + 0.3);
            osc.start(now + i * 0.25);
            osc.stop(now + i * 0.25 + 0.35);
          });
          break;
        }
      }
    } catch (e) {
      console.warn('Audio playback failed:', e);
    }
  }, [getContext]);

  const setEnabled = useCallback((enabled: boolean) => {
    enabledRef.current = enabled;
  }, []);

  return { playSound, setEnabled };
}

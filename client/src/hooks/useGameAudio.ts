import { useRef, useCallback, useEffect } from 'react';

type SoundType = 
  | 'shootNormal' | 'shootLaser' | 'shootShotgun'
  | 'hit' | 'explosion' | 'gem' | 'levelUp' | 'coin' | 'damage' | 'gameOver'
  | 'menuOpen' | 'menuClose' | 'menuSelect' | 'buttonClick' | 'pause' | 'unpause';

export function useGameAudio() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const enabledRef = useRef(true);
  const userInteractedRef = useRef(false);
  const musicGainRef = useRef<GainNode | null>(null);
  const musicNodesRef = useRef<OscillatorNode[]>([]);
  const musicIntervalRef = useRef<number | null>(null);
  const isMusicPlayingRef = useRef(false);

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
      stopMusic();
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

  const startMusic = useCallback(() => {
    if (isMusicPlayingRef.current || !enabledRef.current) return;
    
    try {
      const ctx = getContext();
      isMusicPlayingRef.current = true;
      
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.08, ctx.currentTime);
      masterGain.connect(ctx.destination);
      musicGainRef.current = masterGain;
      
      const bassNotes = [55, 65.41, 73.42, 82.41];
      const melodyNotes = [
        [220, 277.18, 329.63, 440],
        [246.94, 311.13, 369.99, 493.88],
        [261.63, 329.63, 392, 523.25],
        [293.66, 369.99, 440, 587.33]
      ];
      
      let currentPattern = 0;
      let beatIndex = 0;
      
      const playBeat = () => {
        if (!isMusicPlayingRef.current || !enabledRef.current) return;
        
        const now = ctx.currentTime;
        
        const bassOsc = ctx.createOscillator();
        const bassGain = ctx.createGain();
        const bassFilter = ctx.createBiquadFilter();
        bassOsc.type = 'sawtooth';
        bassOsc.frequency.setValueAtTime(bassNotes[currentPattern], now);
        bassFilter.type = 'lowpass';
        bassFilter.frequency.setValueAtTime(200, now);
        bassOsc.connect(bassFilter);
        bassFilter.connect(bassGain);
        bassGain.connect(masterGain);
        bassGain.gain.setValueAtTime(0.3, now);
        bassGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        bassOsc.start(now);
        bassOsc.stop(now + 0.25);
        
        if (beatIndex % 2 === 0) {
          const arpNotes = melodyNotes[currentPattern];
          arpNotes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, now + i * 0.05);
            osc.connect(gain);
            gain.connect(masterGain);
            gain.gain.setValueAtTime(0, now + i * 0.05);
            gain.gain.linearRampToValueAtTime(0.15, now + i * 0.05 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.05 + 0.15);
            osc.start(now + i * 0.05);
            osc.stop(now + i * 0.05 + 0.2);
          });
        }
        
        if (beatIndex % 4 === 0) {
          const kickBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
          const kickData = kickBuffer.getChannelData(0);
          for (let i = 0; i < kickBuffer.length; i++) {
            kickData[i] = Math.sin(i * 0.05 * (1 - i / kickBuffer.length)) * (1 - i / kickBuffer.length);
          }
          const kick = ctx.createBufferSource();
          const kickGain = ctx.createGain();
          kick.buffer = kickBuffer;
          kick.connect(kickGain);
          kickGain.connect(masterGain);
          kickGain.gain.setValueAtTime(0.4, now);
          kick.start(now);
        }
        
        if (beatIndex % 2 === 1) {
          const hihatBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
          const hihatData = hihatBuffer.getChannelData(0);
          for (let i = 0; i < hihatBuffer.length; i++) {
            hihatData[i] = (Math.random() * 2 - 1) * (1 - i / hihatBuffer.length);
          }
          const hihat = ctx.createBufferSource();
          const hihatGain = ctx.createGain();
          const hihatFilter = ctx.createBiquadFilter();
          hihat.buffer = hihatBuffer;
          hihatFilter.type = 'highpass';
          hihatFilter.frequency.setValueAtTime(8000, now);
          hihat.connect(hihatFilter);
          hihatFilter.connect(hihatGain);
          hihatGain.connect(masterGain);
          hihatGain.gain.setValueAtTime(0.1, now);
          hihat.start(now);
        }
        
        beatIndex++;
        if (beatIndex >= 16) {
          beatIndex = 0;
          currentPattern = (currentPattern + 1) % 4;
        }
      };
      
      playBeat();
      musicIntervalRef.current = window.setInterval(playBeat, 200);
      
    } catch (e) {
      console.warn('Music playback failed:', e);
    }
  }, [getContext]);

  const stopMusic = useCallback(() => {
    isMusicPlayingRef.current = false;
    if (musicIntervalRef.current) {
      clearInterval(musicIntervalRef.current);
      musicIntervalRef.current = null;
    }
    musicNodesRef.current.forEach(node => {
      try { node.stop(); } catch (e) {}
    });
    musicNodesRef.current = [];
  }, []);

  const playSound = useCallback((type: SoundType) => {
    if (!enabledRef.current) return;

    try {
      const ctx = getContext();
      const now = ctx.currentTime;

      switch (type) {
        case 'shootNormal': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'square';
          osc.frequency.setValueAtTime(600, now);
          osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
          osc.start(now);
          osc.stop(now + 0.1);
          break;
        }

        case 'shootLaser': {
          const osc = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          osc2.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sine';
          osc2.type = 'sine';
          osc.frequency.setValueAtTime(1200, now);
          osc.frequency.exponentialRampToValueAtTime(800, now + 0.08);
          osc2.frequency.setValueAtTime(1205, now);
          osc2.frequency.exponentialRampToValueAtTime(805, now + 0.08);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
          osc.start(now);
          osc2.start(now);
          osc.stop(now + 0.08);
          osc2.stop(now + 0.08);
          break;
        }

        case 'shootShotgun': {
          const bufferSize = ctx.sampleRate * 0.15;
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
          }
          const noise = ctx.createBufferSource();
          const filter = ctx.createBiquadFilter();
          const gain = ctx.createGain();
          noise.buffer = buffer;
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(2000, now);
          filter.frequency.exponentialRampToValueAtTime(400, now + 0.15);
          noise.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          gain.gain.setValueAtTime(0.25, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
          noise.start(now);
          
          const osc = ctx.createOscillator();
          const oscGain = ctx.createGain();
          osc.connect(oscGain);
          oscGain.connect(ctx.destination);
          osc.type = 'square';
          osc.frequency.setValueAtTime(150, now);
          osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
          oscGain.gain.setValueAtTime(0.15, now);
          oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
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
          const bufferSize = ctx.sampleRate * 0.25;
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
          filter.frequency.setValueAtTime(1200, now);
          filter.frequency.exponentialRampToValueAtTime(80, now + 0.25);
          noise.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          gain.gain.setValueAtTime(0.25, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
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
          gain.gain.setValueAtTime(0.12, now);
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
          gain.gain.setValueAtTime(0.1, now);
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
            gain.gain.linearRampToValueAtTime(0.12, now + i * 0.1 + 0.05);
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
          gain.gain.setValueAtTime(0.18, now);
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
            gain.gain.linearRampToValueAtTime(0.12, now + i * 0.25 + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.25 + 0.3);
            osc.start(now + i * 0.25);
            osc.stop(now + i * 0.25 + 0.35);
          });
          break;
        }

        case 'menuOpen': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(400, now);
          osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
          osc.start(now);
          osc.stop(now + 0.1);
          break;
        }

        case 'menuClose': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(800, now);
          osc.frequency.exponentialRampToValueAtTime(400, now + 0.1);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
          osc.start(now);
          osc.stop(now + 0.1);
          break;
        }

        case 'menuSelect': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'square';
          osc.frequency.setValueAtTime(523, now);
          osc.frequency.setValueAtTime(659, now + 0.05);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
          osc.start(now);
          osc.stop(now + 0.1);
          break;
        }

        case 'buttonClick': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(600, now);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
          osc.start(now);
          osc.stop(now + 0.05);
          break;
        }

        case 'pause': {
          const notes = [659, 523];
          notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.1);
            gain.gain.setValueAtTime(0.1, now + i * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.1);
            osc.start(now + i * 0.1);
            osc.stop(now + i * 0.1 + 0.15);
          });
          break;
        }

        case 'unpause': {
          const notes = [523, 659];
          notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.1);
            gain.gain.setValueAtTime(0.1, now + i * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.1);
            osc.start(now + i * 0.1);
            osc.stop(now + i * 0.1 + 0.15);
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
    if (!enabled) {
      stopMusic();
    }
  }, [stopMusic]);

  return { playSound, setEnabled, startMusic, stopMusic };
}

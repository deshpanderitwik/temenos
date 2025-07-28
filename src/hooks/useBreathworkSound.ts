import { useEffect, useRef, useCallback, useState } from 'react';
import * as Tone from 'tone';
import { BreathPhase } from '@/utils/breathworkPatterns';

// F minor scale notes (root, third, fifth)
const F_MINOR_NOTES = {
  inhale: 'F3',    // Root
  hold: 'Ab3',     // Minor third
  exhale: 'C4',    // Perfect fifth
  pause: 'F3'      // Root for pause
};

export interface UseBreathworkSoundReturn {
  playCountSound: (phase: BreathPhase) => void;
  initializeAudio: () => Promise<void>;
  isAudioInitialized: boolean;
  testSound: () => void;
  isMuted: boolean;
  toggleMute: () => void;
}

export function useBreathworkSound(): UseBreathworkSoundReturn {
  const synthRef = useRef<Tone.Synth | null>(null);
  const filterRef = useRef<Tone.Filter | null>(null);
  const reverbRef = useRef<Tone.Reverb | null>(null);
  const delayRef = useRef<Tone.FeedbackDelay | null>(null);
  const isInitializedRef = useRef(false);
  const [isMuted, setIsMuted] = useState(true);

  // Initialize audio context and oscillator
  const initializeAudio = useCallback(async () => {
    if (isInitializedRef.current) return;

    try {
      // Check if audio context is already running
      if (Tone.context.state !== 'running') {
        // Start audio context (required for browser autoplay policies)
        await Tone.start();
      }
      
      // Create a simple synth for better sound
      const synth = new Tone.Synth({
        oscillator: {
          type: 'sawtooth'
        },
        envelope: {
          attack: 0.005,
          decay: 0.05,
          sustain: 0.1,
          release: 0.1
        }
      });

      // Add subtle reverb
      const reverb = new Tone.Reverb({
        decay: 1.5,
        preDelay: 0.1,
        wet: 0.3
      });

      // Add a low-pass filter to soften the sawtooth wave
      const filter = new Tone.Filter({
        type: 'lowpass',
        frequency: 800, // Cut off high frequencies to soften the sound
        rolloff: -12
      });

      // Add subtle delay (currently muted)
      const delay = new Tone.FeedbackDelay({
        delayTime: 0.3,
        feedback: 0.2,
        wet: 0 // Muted - no delay effect
      });

      // Create effects chain: synth -> filter -> [delay, reverb] -> destination
      synth.connect(filter);
      filter.connect(delay);
      filter.connect(reverb);
      delay.toDestination();
      reverb.toDestination();

      // Reduce volume to make it softer
      synth.volume.value = -12;

      // Store the synth and effects
      synthRef.current = synth;
      filterRef.current = filter;
      reverbRef.current = reverb;
      delayRef.current = delay;

      isInitializedRef.current = true;
    } catch (error) {
      // Silent error handling for privacy
    }
  }, []);

  // Play count sound for current phase
  const playCountSound = useCallback((phase: BreathPhase) => {
    if (!synthRef.current || !isInitializedRef.current || isMuted) {
      return;
    }

    try {
      const note = F_MINOR_NOTES[phase.type] || F_MINOR_NOTES.inhale;
      
      // Play the note directly with the synth
      synthRef.current.triggerAttackRelease(note, '8n');
    } catch (error) {
      // Silent error handling for privacy
    }
  }, [isMuted]);

  // Toggle mute state
  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  // Test sound function
  const testSound = useCallback(() => {
    if (!synthRef.current || !isInitializedRef.current) {
      return;
    }

    try {
      // Play a test note (F3)
      synthRef.current.triggerAttackRelease('F3', '4n');
    } catch (error) {
      // Silent error handling for privacy
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (synthRef.current) {
        synthRef.current.dispose();
      }
      if (filterRef.current) {
        filterRef.current.dispose();
      }
      if (reverbRef.current) {
        reverbRef.current.dispose();
      }
      if (delayRef.current) {
        delayRef.current.dispose();
      }
    };
  }, []);

  return {
    playCountSound,
    initializeAudio,
    isAudioInitialized: isInitializedRef.current,
    testSound,
    isMuted,
    toggleMute
  };
} 
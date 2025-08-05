import { useEffect, useRef, useCallback, useState } from 'react';
import * as Tone from 'tone';
import { BreathPhase } from '@/utils/breathworkPatterns';
import { breathworkEngine, EngineEvent } from '@/utils/breathworkEngine';

// F minor scale notes (root, third, fifth)
const F_MINOR_NOTES: Record<string, string> = {
  inhale: 'F3',    // Root
  hold: 'Ab3',     // Minor third
  exhale: 'C4',    // Perfect fifth
  pause: 'F3'      // Root for pause
};

export interface UseBreathworkSoundReturn {
  playCountSound: (phase: BreathPhase, count?: number) => void;
  initializeAudio: () => Promise<void>;
  isAudioInitialized: boolean;
  testSound: () => void;
  isMuted: boolean;
  toggleMute: () => void;
  scheduleSessionSounds: (pattern: any, breaths: number) => void;
  clearScheduledSounds: () => void;
  ensureAudioRunning: () => Promise<void>;
}

export function useBreathworkSound(): UseBreathworkSoundReturn {
  const synthRef = useRef<Tone.Synth | null>(null);
  const filterRef = useRef<Tone.Filter | null>(null);
  const reverbRef = useRef<Tone.Reverb | null>(null);
  const delayRef = useRef<Tone.FeedbackDelay | null>(null);
  const [isAudioInitialized, setIsAudioInitialized] = useState(false);
  const [isMuted, setIsMuted] = useState(() => {
    // Try to load muted state from localStorage, default to false (unmuted)
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('breathwork-muted');
        return stored ? JSON.parse(stored) : false;
      } catch (error) {
        return false;
      }
    }
    return false;
  });
  const scheduledEventsRef = useRef<number[]>([]);
  const sessionStartTimeRef = useRef<number>(0);
  const isInitializedRef = useRef(false);

  // Initialize audio context and oscillator
  const initializeAudio = useCallback(async () => {
    try {
      // Check if audio context is already running
      if (Tone.context.state !== 'running') {
        // Start audio context (required for browser autoplay policies)
        await Tone.start();
      }
      
      // If already initialized, just ensure context is running
      if (isInitializedRef.current) {
        return;
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
      setIsAudioInitialized(true);
    } catch (error) {
      // Silent error handling for privacy
    }
  }, []);

  // Clear all scheduled sounds
  const clearScheduledSounds = useCallback(() => {
    scheduledEventsRef.current.forEach(id => Tone.Transport.clear(id));
    scheduledEventsRef.current = [];
    Tone.Transport.stop();
    Tone.Transport.cancel();
  }, []);

  // Schedule all sounds for a session in advance
  const scheduleSessionSounds = useCallback((pattern: any, breaths: number) => {
    if (!synthRef.current || !isInitializedRef.current) return;

    clearScheduledSounds();
    
    const patternDuration = pattern.phases.reduce((total: number, phase: any) => total + phase.duration, 0);
    let currentTime = 0;
    
    for (let round = 0; round < breaths; round++) {
      pattern.phases.forEach((phase: any) => {
        const note = F_MINOR_NOTES[phase.type] || F_MINOR_NOTES.inhale;
        
        // Schedule a sound for each second of the phase
        for (let second = 0; second < phase.duration; second++) {
          const eventId = Tone.Transport.schedule((time: number) => {
            if (!isMuted) {
              synthRef.current?.triggerAttackRelease(note, '8n', time);
            }
          }, currentTime + second);
          
          scheduledEventsRef.current.push(eventId);
        }
        
        currentTime += phase.duration;
      });
    }
  }, [isMuted, clearScheduledSounds]);

  // Play count sound for current phase (immediate playback)
  const playCountSound = useCallback((phase: BreathPhase, count?: number) => {
    if (!synthRef.current || !isInitializedRef.current || isMuted) {
      return;
    }

    try {
      // Check if audio context is running, if not, try to restart it
      if (Tone.context.state !== 'running') {
        Tone.start();
      }
      
      const note = F_MINOR_NOTES[phase.type] || F_MINOR_NOTES.inhale;
      
      // Play the note immediately
      synthRef.current.triggerAttackRelease(note, '8n');
    } catch (error) {
      // Silent error handling for privacy
    }
  }, [isMuted]);

  // Toggle mute state
  const toggleMute = useCallback(() => {
    setIsMuted((prev: boolean) => {
      const newMutedState = !prev;
      // Persist the mute state to localStorage
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('breathwork-muted', JSON.stringify(newMutedState));
        } catch (error) {
          console.error('Error saving mute state:', error);
        }
      }
      return newMutedState;
    });
  }, []);

  // Test sound function
  const testSound = useCallback(() => {
    if (!synthRef.current || !isInitializedRef.current) {
      return;
    }

    try {
      // Check if audio context is running, if not, try to restart it
      if (Tone.context.state !== 'running') {
        Tone.start();
      }
      
      // Play a test note (F3)
      synthRef.current.triggerAttackRelease('F3', '4n');
    } catch (error) {
      // Silent error handling for privacy
    }
  }, []);

  // Ensure audio is running and ready
  const ensureAudioRunning = useCallback(async () => {
    try {
      // Check if audio context is running, if not, try to restart it
      if (Tone.context.state !== 'running') {
        await Tone.start();
      }
      
      // If not initialized, initialize audio
      if (!isInitializedRef.current) {
        await initializeAudio();
      }
    } catch (error) {
      // Silent error handling for privacy
    }
  }, [initializeAudio]);

  // Listen for engine events to clear sounds when session ends
  useEffect(() => {
    const handleEngineEvent = (event: EngineEvent) => {
      if (event.type === 'sessionComplete' || event.type === 'stop') {
        clearScheduledSounds();
      }
    };

    breathworkEngine.addEventListener(handleEngineEvent);

    return () => {
      breathworkEngine.removeEventListener(handleEngineEvent);
    };
  }, [clearScheduledSounds]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearScheduledSounds();
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
      isInitializedRef.current = false;
    };
  }, [clearScheduledSounds]);

  return {
    playCountSound,
    initializeAudio,
    isAudioInitialized: isAudioInitialized,
    testSound,
    isMuted,
    toggleMute,
    scheduleSessionSounds,
    clearScheduledSounds,
    ensureAudioRunning
  };
} 
import { useState, useEffect, useCallback, useRef } from 'react';
import { breathworkEngine, EngineEvent } from '@/utils/breathworkEngine';
import { BreathPattern, BreathSession, BreathPhase } from '@/utils/breathworkPatterns';

export interface UseBreathworkReturn {
  session: BreathSession | null;
  currentPhase: BreathPhase | null;
  currentPhaseIndex: number;
  timeRemaining: number;
  progress: number;
  isActive: boolean;
  isPaused: boolean;
  currentRound: number;
  totalBreaths: number;
  currentCount: number;
  countingDirection: 'up' | 'down' | 'hold';
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  reset: () => void;
  createSession: (pattern: BreathPattern, breaths: number) => void;
}

export function useBreathwork(): UseBreathworkReturn {
  const [session, setSession] = useState<BreathSession | null>(null);
  const [currentPhase, setCurrentPhase] = useState<BreathPhase | null>(null);
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState<number>(0);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [progress, setProgress] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [totalBreaths, setTotalBreaths] = useState<number>(0);
  const [currentCount, setCurrentCount] = useState<number>(0);
  const [countingDirection, setCountingDirection] = useState<'up' | 'down' | 'hold'>('up');

  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Event listener for engine events
  const handleEngineEvent = useCallback((event: EngineEvent) => {
    switch (event.type) {
      case 'phaseChange':
        if (event.data?.phase) {
          setCurrentPhase(event.data.phase);
          setCurrentPhaseIndex(event.data.phaseIndex || 0);
        }
        break;
      case 'roundComplete':
        setCurrentRound(event.data?.completedRound + 1 || 1);
        break;
      case 'sessionComplete':
        setIsActive(false);
        setIsPaused(false);
        setCurrentRound(1); // Reset to initial state
        setCurrentCount(1);
        setCountingDirection('up');
        // Don't auto-reset - let user explicitly start a new session
        break;
      case 'pause':
        setIsPaused(true);
        break;
      case 'resume':
        setIsPaused(false);
        break;
      case 'stop':
        setIsActive(false);
        setIsPaused(false);
        break;
    }
  }, []);

  // Update UI state from engine
  const updateUIState = useCallback(() => {
    const currentSession = breathworkEngine.getSession();
    if (currentSession) {
      setSession(currentSession);
      setTimeRemaining(breathworkEngine.getPhaseTimeRemaining());
      setProgress(breathworkEngine.getProgress());
      setIsActive(currentSession.isActive);
      setIsPaused(currentSession.isPaused);
      setCurrentRound(currentSession.currentRound);
      setTotalBreaths(currentSession.breaths);
      setCurrentCount(breathworkEngine.getCurrentCount());
      setCountingDirection(breathworkEngine.getCountingDirection());
      setCurrentPhaseIndex(currentSession.currentPhaseIndex);
      
      const phase = breathworkEngine.getCurrentPhase();
      if (phase) {
        setCurrentPhase(phase);
      }
    }
  }, []);

  // Set up event listener and update interval
  useEffect(() => {
    breathworkEngine.addEventListener(handleEngineEvent);
    
    // Update UI state every 50ms for smoother animations and better sync
    updateIntervalRef.current = setInterval(updateUIState, 50);
    
    return () => {
      breathworkEngine.removeEventListener(handleEngineEvent);
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [handleEngineEvent]); // Removed updateUIState from dependencies since it's stable

  // Control functions
  const start = useCallback(() => {
    breathworkEngine.start();
  }, []);

  const pause = useCallback(() => {
    breathworkEngine.pause();
  }, []);

  const resume = useCallback(() => {
    breathworkEngine.resume();
  }, []);

  const stop = useCallback(() => {
    breathworkEngine.stop();
  }, []);

  const reset = useCallback(() => {
    breathworkEngine.reset();
  }, []);

  const createSession = useCallback((pattern: BreathPattern, breaths: number) => {
    breathworkEngine.createSession(pattern, breaths);
    // Force immediate UI update to ensure session is available
    updateUIState();
  }, [updateUIState]);

  return {
    session,
    currentPhase,
    currentPhaseIndex,
    timeRemaining,
    progress,
    isActive,
    isPaused,
    currentRound,
    totalBreaths,
    currentCount,
    countingDirection,
    start,
    pause,
    resume,
    stop,
    reset,
    createSession
  };
} 
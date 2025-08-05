'use client';

import { useState, useEffect, useRef } from 'react';
import { useBreathwork } from '@/hooks/useBreathwork';
import { useBreathworkSound } from '@/hooks/useBreathworkSound';
import { BreathPattern, getPatternById } from '@/utils/breathworkPatterns';
import { loadBreathworkSettings, saveBreathworkSettings, BreathworkSettings as StoredSettings } from '@/utils/breathworkSettings';
import { breathworkEngine } from '@/utils/breathworkEngine';
import BreathworkVisualGuide from './BreathworkVisualGuide';
import BreathworkPatternSelector from './BreathworkPatternSelector';
import BreathworkSettings from './BreathworkSettings';

interface BreathworkTimerProps {
  className?: string;
  buttonClassName?: string;
  title?: string;
  onFullScreenChange?: (isFullScreen: boolean) => void;
}

export interface BreathworkTimerRef {
  startTimer: () => void;
  stopTimer: () => void;
}

const BreathworkTimer = ({ 
  className = "w-10 h-10 rounded transition-colors flex items-center justify-center hover:bg-white/20 text-white/40 hover:text-white/95 group",
  buttonClassName = "w-10 h-10 rounded transition-colors flex items-center justify-center hover:bg-white/20 text-white/40 hover:text-white/95 group",
  title = "Start breathwork timer",
  onFullScreenChange
}: BreathworkTimerProps) => {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [selectedPattern, setSelectedPattern] = useState<BreathPattern | null>(null);
  const [breaths, setBreaths] = useState(10);
  const [showPatternSelector, setShowPatternSelector] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [wasPausedBeforeSettings, setWasPausedBeforeSettings] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const {
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
  } = useBreathwork();

  const { 
    playCountSound, 
    initializeAudio, 
    isAudioInitialized, 
    testSound, 
    isMuted, 
    toggleMute,
    scheduleSessionSounds,
    clearScheduledSounds,
    ensureAudioRunning
  } = useBreathworkSound();

  // Initialize with persisted settings or defaults
  useEffect(() => {
    if (!isInitialized) {
      const storedSettings = loadBreathworkSettings();
      const pattern = getPatternById(storedSettings.selectedPatternId);
      
      if (pattern) {
        setSelectedPattern(pattern);
        setBreaths(storedSettings.breaths);
        createSession(pattern, storedSettings.breaths);
      } else {
        // Fallback to default if stored pattern doesn't exist
        const defaultPattern = getPatternById('box-breathing');
        if (defaultPattern) {
          setSelectedPattern(defaultPattern);
          setBreaths(storedSettings.breaths);
          createSession(defaultPattern, storedSettings.breaths);
        }
      }
      setIsInitialized(true);
    }
  }, [isInitialized, createSession]);

  // Ensure session is created if pattern is selected but no session exists
  useEffect(() => {
    if (isInitialized && selectedPattern && !session) {
      createSession(selectedPattern, breaths);
    }
  }, [isInitialized, selectedPattern, session, breaths, createSession]);

  // Set up engine sound callback for precise timing
  useEffect(() => {
    if (isAudioInitialized) {
      // Set the sound callback in the engine for direct triggering
      breathworkEngine.setSoundCallback((phase, count) => {
        if (!isMuted) {
          // Use requestAnimationFrame for immediate sound playback
          requestAnimationFrame(() => {
            playCountSound(phase, count);
          });
        }
      });
    } else {
      // Clear the callback if audio is not initialized
      breathworkEngine.setSoundCallback(null);
    }

    return () => {
      // Always clear callback on cleanup
      breathworkEngine.setSoundCallback(null);
    };
  }, [isAudioInitialized, isMuted, playCountSound, isActive]);

  // Handle pattern selection
  const handlePatternSelect = (pattern: BreathPattern) => {
    setSelectedPattern(pattern);
    const newBreaths = pattern.defaultBreaths || breaths;
    setBreaths(newBreaths);
    createSession(pattern, newBreaths);
    
    // Save settings
    saveBreathworkSettings({
      selectedPatternId: pattern.id,
      breaths: newBreaths,
    });
  };

  // Handle breaths change
  const handleBreathsChange = (newBreaths: number) => {
    setBreaths(newBreaths);
    if (selectedPattern) {
      createSession(selectedPattern, newBreaths);
      
      // Save settings
      saveBreathworkSettings({
        selectedPatternId: selectedPattern.id,
        breaths: newBreaths,
      });
    }
  };

  // Handle full-screen toggle
  const handleToggle = () => {
    if (isFullScreen) {
      // Exiting full-screen mode
      setIsFullScreen(false);
      onFullScreenChange?.(false);
      // Reset timer when closing, same as stop button
      stop();
      reset();
      clearScheduledSounds();
    } else {
      // Entering full-screen mode
      setIsFullScreen(true);
      onFullScreenChange?.(true);
      // Don't auto-start - let user press play button explicitly
    }
  };

  // Handle session controls
  const handleStart = () => {
    // Check if engine has a session, if not create one
    if (!breathworkEngine.getSession() && selectedPattern) {
      createSession(selectedPattern, breaths);
      // Force immediate start after session creation
      setTimeout(() => {
        start();
      }, 10);
      return;
    }
    
    // If still no session in engine after trying to create one, return early
    if (!breathworkEngine.getSession()) {
      return;
    }
    
    // If session is completed (currentRound > totalBreaths), reset before starting
    if (currentRound > totalBreaths) {
      reset();
    }
    
    // Ensure sound callback is set up before starting (in case it was cleared)
    if (isAudioInitialized) {
      breathworkEngine.setSoundCallback((phase, count) => {
        if (!isMuted) {
          // Use requestAnimationFrame for immediate sound playback
          requestAnimationFrame(() => {
            playCountSound(phase, count);
          });
        }
      });
    }
    
    if (isPaused) {
      resume();
    } else {
      start();
    }
  };

  const handlePause = () => {
    pause();
  };

  const handleStop = () => {
    stop();
    reset();
    clearScheduledSounds();
  };

  // Handle settings modal open/close with auto-pause
  const handleSettingsOpen = () => {
    // Remember if the timer was already paused before opening settings
    setWasPausedBeforeSettings(isPaused);
    
    // Pause the timer if it's currently active and not already paused
    if (isActive && !isPaused) {
      pause();
    }
    setShowSettings(true);
  };

  const handleSettingsClose = () => {
    setShowSettings(false);
    // Resume the timer only if it was running before we opened settings
    if (isActive && isPaused && !wasPausedBeforeSettings) {
      resume();
    }
  };

  return (
    <>
      {/* Full-screen Breathwork Timer Overlay */}
      {isFullScreen && (
        <div className="fixed inset-0 top-0 left-0 w-screen h-screen bg-[#141414] z-[9999] flex" style={{ margin: 0, padding: 0 }}>
          {/* Left Sidebar */}
          <div className="w-16 flex flex-col items-center justify-center flex-shrink-0 pl-12 z-50 relative">
            {/* Navigation Buttons Container */}
            <div className="bg-white/10 rounded-lg p-2 space-y-2">
              {/* Play/Pause Button */}
              <button
                onClick={async (e) => {
                  // Ensure audio is running and ready
                  try {
                    await ensureAudioRunning();
                  } catch (error) {
                    // Silent error handling for privacy
                  }
                  
                  if (!isActive || isPaused) {
                    handleStart();
                  } else {
                    handlePause();
                  }
                }}
                className="w-10 h-10 rounded transition-colors flex items-center justify-center hover:bg-white/20 text-white/40 hover:text-white/95 group"
                title={!isActive || isPaused ? 'Start' : 'Pause'}
              >
                {!isActive || isPaused ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347c-.75.412-1.667-.13-1.667-.986V5.653Z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
                  </svg>
                )}
              </button>
              
              {/* Stop Button */}
              <button
                onClick={handleStop}
                className="w-10 h-10 rounded transition-colors flex items-center justify-center hover:bg-white/20 text-white/40 hover:text-white/95 group"
                title="Stop"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 0 1 7.5 5.25h9a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-9Z" />
                </svg>
              </button>
              
              {/* Mute/Unmute Button */}
              <button
                onClick={toggleMute}
                className="w-10 h-10 rounded transition-colors flex items-center justify-center hover:bg-white/20 text-white/40 hover:text-white/95 group"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6 4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
                  </svg>
                )}
              </button>
              
              {/* Settings Button */}
              {selectedPattern && (
                <button
                  onClick={handleSettingsOpen}
                  className="w-10 h-10 rounded transition-colors flex items-center justify-center hover:bg-white/20 text-white/40 hover:text-white/95 group"
                  title="Settings"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 0 1 0 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 0 1 0-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                </button>
              )}
              
              {/* Close Button */}
              <button
                onClick={handleToggle}
                className="w-10 h-10 rounded transition-colors flex items-center justify-center hover:bg-white/20 text-white/40 hover:text-white/95 group"
                title="Close"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Main Content - Centered Visual Guide */}
          <div className="flex-1 flex items-center justify-center">
            <BreathworkVisualGuide
              currentPhase={currentPhase}
              timeRemaining={timeRemaining}
              isActive={isActive}
              currentPhaseIndex={currentPhaseIndex}
              currentCount={currentCount}
              countingDirection={countingDirection}
              pattern={session?.pattern}
              currentRound={currentRound}
              totalBreaths={totalBreaths}
            />
          </div>


        </div>
      )}

      {/* Pattern Selector Modal */}
      <BreathworkPatternSelector
        isOpen={showPatternSelector}
        selectedPattern={selectedPattern}
        onPatternSelect={handlePatternSelect}
        onClose={() => setShowPatternSelector(false)}
      />

      {/* Settings Modal */}
      {selectedPattern && (
        <BreathworkSettings
          isOpen={showSettings}
          pattern={selectedPattern}
          breaths={breaths}
          onBreathsChange={handleBreathsChange}
          onPatternChange={handlePatternSelect}
          onClose={handleSettingsClose}
        />
      )}

      {/* Breathwork Button */}
      <button
        onClick={handleToggle}
        className={buttonClassName}
        title={isFullScreen ? 'Exit full-screen breathwork' : title}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
        </svg>
      </button>
    </>
  );
};

export default BreathworkTimer; 
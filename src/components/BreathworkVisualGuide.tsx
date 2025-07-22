'use client';

import { useEffect, useState } from 'react';
import { BreathPhase, BreathPattern } from '@/utils/breathworkPatterns';

interface BreathworkVisualGuideProps {
  currentPhase: BreathPhase | null;
  timeRemaining: number;
  isActive: boolean;
  currentPhaseIndex?: number;
  currentCount?: number;
  countingDirection?: 'up' | 'down' | 'hold';
  pattern?: BreathPattern;
  currentRound?: number;
  totalBreaths?: number;
}

export default function BreathworkVisualGuide({
  currentPhase,
  timeRemaining,
  isActive,
  currentPhaseIndex = 0,
  currentCount = 1,
  countingDirection = 'up',
  pattern,
  currentRound = 1,
  totalBreaths = 10
}: BreathworkVisualGuideProps) {
  const [countDisplay, setCountDisplay] = useState(1);

  // Helper function to determine if current hold is after inhale or exhale
  const isHoldAfterInhale = () => {
    if (!pattern || !pattern.phases || !currentPhase || currentPhase.type !== 'hold') return false;
    
    // Look backwards from current position to find the previous phase
    for (let i = currentPhaseIndex - 1; i >= 0; i--) {
      const phase = pattern.phases[i];
      if (phase.type === 'inhale') return true;
      if (phase.type === 'exhale') return false;
    }
    
    // If we can't find a previous phase, look at the pattern structure
    // Find the first inhale phase in the pattern
    const firstInhaleIndex = pattern.phases.findIndex((phase) => phase.type === 'inhale');
    if (firstInhaleIndex !== -1) {
      // If current hold is right after the first inhale, it's after inhale
      return currentPhaseIndex === firstInhaleIndex + 1;
    }
    
    // Default to false (after exhale) if we can't determine
    return false;
  };

  // Smooth count transitions
  useEffect(() => {
    if (!isActive || !currentPhase) {
      setCountDisplay(1);
      return;
    }

    // Smooth transition for count changes
    const timer = setTimeout(() => {
      setCountDisplay(currentCount);
    }, 50);

    return () => clearTimeout(timer);
  }, [currentCount, isActive, currentPhase]);

  const getPhaseColor = () => {
    if (!isActive || !currentPhase) return 'border-2 border-white/40 bg-transparent';
    
    switch (currentPhase.type) {
      case 'inhale':
        return 'bg-gradient-to-br from-[#97BC62] to-[#97BC62]/80';
      case 'hold':
        return 'bg-gradient-to-br from-gray-400/90 to-gray-600/70';
      case 'exhale':
        return 'bg-gradient-to-br from-[#2C5F2D] to-[#2C5F2D]/80';
      case 'pause':
        return 'bg-gradient-to-br from-purple-400/90 to-purple-600/70';
      default:
        return 'bg-gradient-to-br from-white/40 to-white/20';
    }
  };

  const getPhaseText = () => {
    if (!isActive || !currentPhase) return 'Press \'Play\' to begin';
    
    switch (currentPhase.type) {
      case 'inhale':
        return 'Breathe In';
      case 'hold':
        return 'Hold';
      case 'exhale':
        return 'Breathe Out';
      case 'pause':
        return 'Rest';
      default:
        return currentPhase.label || currentPhase.type;
    }
  };

  const getCountColor = () => {
    // Always return consistent white color with 95% opacity
    return 'text-white/95';
  };

  const getCountAnimation = () => {
    if (!isActive || !currentPhase) return '';
    
    switch (countingDirection) {
      case 'up':
        return 'animate-pulse';
      case 'down':
        return 'animate-pulse';
      case 'hold':
        return '';
      default:
        return '';
    }
  };

  return (
    <div className="relative flex items-center justify-center">
      {/* Current Phase Text - positioned above the circle */}
      {(isActive && currentPhase) || !isActive ? (
        <div className="absolute bottom-full mb-49 flex flex-col items-center">
          <div className="text-sm text-white/60 font-surt-regular">
            {getPhaseText()}
          </div>
        </div>
      ) : null}

      {/* Breathing Circle */}
      <div className="relative">
        {/* Main breathing circle */}
        <div
          className={`w-56 h-56 rounded-full ${getPhaseColor()} transition-all duration-300 ease-in-out`}
        />
        
        {/* Count Display - positioned absolutely over the circle */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span 
            className="text-4xl font-bold font-surt-regular text-white/95 transition-all duration-200"
          >
            {isActive && currentPhase ? countDisplay : 'Ready'}
          </span>
        </div>
        
        {/* Phase indicator ring */}
        {isActive && currentPhase && (
          <div className="absolute inset-0 rounded-full animate-pulse"></div>
        )}
      </div>

      {/* Breath Progress Visualization - positioned absolutely */}
      {isActive && totalBreaths > 0 && (
        <div className="absolute top-full mt-49 flex flex-col items-center space-y-6">
          <div className="text-sm text-white/60 font-surt-regular">
            {pattern?.name || 'Breathing'}
          </div>
          <div className="flex space-x-2">
            {Array.from({ length: totalBreaths }, (_, index) => (
              <div
                key={index}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index < currentRound - 1 
                    ? 'bg-gray-300' // Completed breaths
                    : index === currentRound - 1 
                    ? 'bg-gray-300 animate-pulse' // Current breath
                    : 'bg-white/20' // Future breaths
                }`}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Pattern name when not active */}
      {!isActive && pattern && (
        <div className="absolute top-full mt-49 flex flex-col items-center">
          <div className="text-sm text-white/60 font-surt-regular">
            {pattern.name}
          </div>
          <div className="text-sm text-white/40 font-surt-regular mt-1">
            {totalBreaths} rounds
          </div>
        </div>
      )}
    </div>
  );
} 
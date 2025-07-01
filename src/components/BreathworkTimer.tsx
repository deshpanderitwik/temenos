'use client';

import { forwardRef, useImperativeHandle } from 'react';

interface BreathworkTimerProps {
  renderCountdown?: (displayText: number | string) => React.ReactNode;
  renderButton?: (isActive: boolean, onStart: () => void, onStop: () => void) => React.ReactNode;
  isFullScreen?: boolean;
}

export interface BreathworkTimerRef {
  startTimer: () => void;
  stopTimer: () => void;
}

const BreathworkTimer = forwardRef<BreathworkTimerRef, BreathworkTimerProps>(
  ({ renderCountdown, renderButton, isFullScreen = false }, ref) => {
    // Expose empty methods to parent component for compatibility
    useImperativeHandle(ref, () => ({
      startTimer: () => {},
      stopTimer: () => {}
    }));

    // If full-screen mode is active, don't render anything (handled by SessionLayout)
    if (isFullScreen) {
      return null;
    }

    // If not in full-screen mode, only render if renderCountdown or renderButton is provided
    if (renderCountdown || renderButton) {
      return (
        <>
          {/* Countdown Display - only render if renderCountdown is provided */}
          {renderCountdown && renderCountdown(0)}
          
          {/* Button - only render if renderButton is provided */}
          {renderButton && renderButton(false, () => {}, () => {})}
        </>
      );
    }

    // Default rendering if neither prop is provided and not in full-screen mode
    return null;
  }
);

BreathworkTimer.displayName = 'BreathworkTimer';

export default BreathworkTimer; 
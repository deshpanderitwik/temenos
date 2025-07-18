import { BreathPattern, BreathSession, BreathPhase } from './breathworkPatterns';

export interface EngineEvent {
  type: 'phaseChange' | 'roundComplete' | 'sessionComplete' | 'pause' | 'resume' | 'stop';
  data?: any;
}

export type EngineEventListener = (event: EngineEvent) => void;

export class BreathworkEngine {
  private session: BreathSession | null = null;
  private timer: NodeJS.Timeout | null = null;
  private listeners: EngineEventListener[] = [];
  private phaseStartTime: number = 0;
  private currentCount: number = 1;
  private countingDirection: 'up' | 'down' | 'hold' = 'up';

  // Initialize a new session
  createSession(pattern: BreathPattern, breaths: number): BreathSession {
    const totalTime = this.calculateTotalTime(pattern, breaths);
    
    this.session = {
      pattern,
      breaths,
      currentRound: 1,
      currentPhaseIndex: 0,
      timeRemaining: pattern.phases[0]?.duration || 0,
      isActive: false,
      isPaused: false,
      totalTime,
      elapsedTime: 0
    };

    // Reset counting state
    this.currentCount = 1;
    this.countingDirection = 'up';
    
    // Initialize counting state for the first phase
    this.updateCountingState();

    return this.session;
  }

  // Start the session
  start(): void {
    if (!this.session) return;
    
    this.session.isActive = true;
    this.session.isPaused = false;
    this.phaseStartTime = Date.now();
    
    // Initialize counting state for the first phase
    this.updateCountingState();
    
    this.startTimer();
    this.emitEvent({ type: 'resume' });
  }

  // Pause the session
  pause(): void {
    if (!this.session || !this.session.isActive) return;
    
    this.session.isPaused = true;
    
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    
    this.emitEvent({ type: 'pause' });
  }

  // Resume the session
  resume(): void {
    if (!this.session || !this.session.isPaused) return;
    
    this.session.isPaused = false;
    this.phaseStartTime = Date.now() - ((this.session.pattern.phases[this.session.currentPhaseIndex]?.duration || 0) - this.session.timeRemaining) * 1000;
    
    this.startTimer();
    this.emitEvent({ type: 'resume' });
  }

  // Stop the session
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    
    if (this.session) {
      this.session.isActive = false;
      this.session.isPaused = false;
    }
    
    this.emitEvent({ type: 'stop' });
  }

  // Reset the session
  reset(): void {
    this.stop();
    if (this.session) {
      this.session.currentRound = 1;
      this.session.currentPhaseIndex = 0;
      this.session.timeRemaining = this.session.pattern.phases[0]?.duration || 0;
      this.session.elapsedTime = 0;
      this.currentCount = 1;
      this.countingDirection = 'up';
    }
  }

  // Get current session state
  getSession(): BreathSession | null {
    return this.session;
  }

  // Get current phase
  getCurrentPhase(): BreathPhase | null {
    if (!this.session) return null;
    return this.session.pattern.phases[this.session.currentPhaseIndex];
  }

  // Get progress percentage
  getProgress(): number {
    if (!this.session || this.session.totalTime === 0) return 0;
    return (this.session.elapsedTime / this.session.totalTime) * 100;
  }

  // Get time remaining in current phase
  getPhaseTimeRemaining(): number {
    if (!this.session) return 0;
    return this.session.timeRemaining;
  }

  // Get current count for display
  getCurrentCount(): number {
    return this.currentCount;
  }

  // Get counting direction
  getCountingDirection(): 'up' | 'down' | 'hold' {
    return this.countingDirection;
  }

  // Get total time remaining
  getTotalTimeRemaining(): number {
    if (!this.session) return 0;
    return this.session.totalTime - this.session.elapsedTime;
  }

  // Add event listener
  addEventListener(listener: EngineEventListener): void {
    this.listeners.push(listener);
  }

  // Remove event listener
  removeEventListener(listener: EngineEventListener): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  // Private methods
  private startTimer(): void {
    if (!this.session) return;
    
    this.timer = setInterval(() => {
      if (!this.session || this.session.isPaused) return;
      
      this.session.timeRemaining--;
      this.session.elapsedTime++;
      
      // Update counting state
      this.updateCountingState();
      
      // Check if current phase is complete
      if (this.session.timeRemaining <= 0) {
        this.advancePhase();
      }
    }, 1000);
  }

  private updateCountingState(): void {
    if (!this.session) return;
    
    const currentPhase = this.getCurrentPhase();
    if (!currentPhase) return;
    
    const phaseDuration = currentPhase.duration;
    const timeElapsed = phaseDuration - this.session.timeRemaining;
    
    switch (currentPhase.type) {
      case 'inhale':
        // Count up from 1 to duration
        this.currentCount = Math.min(timeElapsed + 1, phaseDuration);
        this.countingDirection = 'up';
        break;
      case 'hold':
        // Count up from 1 to duration during hold
        this.currentCount = Math.min(timeElapsed + 1, phaseDuration);
        this.countingDirection = 'up';
        break;
      case 'exhale':
        // Count up from 1 to duration (same as inhale)
        this.currentCount = Math.min(timeElapsed + 1, phaseDuration);
        this.countingDirection = 'up';
        break;
      case 'pause':
        // Count down from duration to 1 (similar to exhale)
        this.currentCount = Math.max(this.session.timeRemaining, 1);
        this.countingDirection = 'down';
        break;
    }
  }

  private getHoldValue(): number {
    if (!this.session) return 0;
    
    // Find the previous inhale phase to get the max value
    let previousInhaleDuration = 0;
    
    // Look backwards from current position
    for (let i = this.session.currentPhaseIndex - 1; i >= 0; i--) {
      const phase = this.session.pattern.phases[i];
      if (phase.type === 'inhale') {
        previousInhaleDuration = phase.duration;
        break;
      }
    }
    
    // If no previous inhale found, look at the pattern structure
    if (previousInhaleDuration === 0) {
      for (let i = 0; i < this.session.pattern.phases.length; i++) {
        const phase = this.session.pattern.phases[i];
        if (phase.type === 'inhale') {
          previousInhaleDuration = phase.duration;
          break;
        }
      }
    }
    
    // Return the max value (duration) for 1-based counting
    return previousInhaleDuration || this.getCurrentPhase()?.duration || 0;
  }

  private advancePhase(): void {
    if (!this.session) return;
    
    // Move to next phase
    this.session.currentPhaseIndex++;
    
    // Check if we've completed all phases in the pattern
    if (this.session.currentPhaseIndex >= this.session.pattern.phases.length) {
      this.completeRound();
    } else {
      // Set up next phase
      const nextPhase = this.session.pattern.phases[this.session.currentPhaseIndex];
      this.session.timeRemaining = nextPhase.duration;
      
      // Update counting state for new phase
      this.updateCountingState();
      
      this.emitEvent({ 
        type: 'phaseChange', 
        data: { 
          phase: nextPhase, 
          phaseIndex: this.session.currentPhaseIndex,
          round: this.session.currentRound 
        } 
      });
    }
  }

  private completeRound(): void {
    if (!this.session) return;
    
    this.session.currentRound++;
    this.session.currentPhaseIndex = 0;
    
    this.emitEvent({ 
      type: 'roundComplete', 
      data: { 
        completedRound: this.session.currentRound - 1,
        totalRounds: this.session.breaths 
      } 
    });
    
    // Check if session is complete
    if (this.session.currentRound > this.session.breaths) {
      this.completeSession();
    } else {
      // Reset to first phase for next round
      const firstPhase = this.session.pattern.phases[0];
      this.session.timeRemaining = firstPhase.duration;
      
      // Update counting state for new phase
      this.updateCountingState();
      
      this.emitEvent({ 
        type: 'phaseChange', 
        data: { 
          phase: firstPhase, 
          phaseIndex: 0,
          round: this.session.currentRound 
        } 
      });
    }
  }

  private completeSession(): void {
    this.stop();
    this.emitEvent({ type: 'sessionComplete' });
  }

  private calculateTotalTime(pattern: BreathPattern, breaths: number): number {
    const patternDuration = pattern.phases.reduce((total, phase) => total + phase.duration, 0);
    return patternDuration * breaths;
  }

  private emitEvent(event: EngineEvent): void {
    this.listeners.forEach(listener => listener(event));
  }
}

// Create a singleton instance
export const breathworkEngine = new BreathworkEngine(); 
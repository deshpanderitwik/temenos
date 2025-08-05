import { BreathPattern, BreathSession, BreathPhase } from './breathworkPatterns';

export interface EngineEvent {
  type: 'phaseChange' | 'roundComplete' | 'sessionComplete' | 'pause' | 'resume' | 'stop';
  data?: any;
}

export type EngineEventListener = (event: EngineEvent) => void;

export type SoundCallback = (phase: BreathPhase, count: number) => void;

export class BreathworkEngine {
  private session: BreathSession | null = null;
  private timer: NodeJS.Timeout | null = null;
  private listeners: EngineEventListener[] = [];
  private phaseStartTime: number = 0;
  private currentCount: number = 1;
  private countingDirection: 'up' | 'down' | 'hold' = 'up';
  private soundCallback: SoundCallback | null = null;
  private lastUpdateTime: number = 0;
  private expectedNextUpdate: number = 0;
  private expectedTime: number = 0;

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

  // Set sound callback for precise timing
  setSoundCallback(callback: SoundCallback | null): void {
    this.soundCallback = callback;
  }

  // Start the session
  start(): void {
    if (!this.session) return;
    
    this.session.isActive = true;
    this.session.isPaused = false;
    this.phaseStartTime = performance.now();
    this.lastUpdateTime = this.phaseStartTime;
    this.expectedNextUpdate = this.phaseStartTime + 1000;
    
    // Initialize counting state for the first phase
    this.updateCountingState();
    
    this.startPreciseTimer();
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
    const now = performance.now();
    
    // Calculate the time that should have elapsed in this phase
    const phaseDuration = this.session.pattern.phases[this.session.currentPhaseIndex]?.duration || 0;
    const timeElapsedInPhase = phaseDuration - this.session.timeRemaining;
    
    // Set the phase start time to maintain precise timing
    this.phaseStartTime = now - (timeElapsedInPhase * 1000);
    this.lastUpdateTime = now;
    this.expectedTime = now;
    this.expectedNextUpdate = now + 1000;
    
    this.startPreciseTimer();
    this.emitEvent({ type: 'resume' });
  }

  // Stop the session
  stop(): void {
    console.log('Engine stop called, session exists:', !!this.session);
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    
    if (this.session) {
      this.session.isActive = false;
      this.session.isPaused = false;
    }
    
    // Clear sound callback when stopping
    this.soundCallback = null;
    
    this.emitEvent({ type: 'stop' });
  }

  // Reset the session
  reset(): void {
    console.log('Engine reset called');
    this.stop();
    if (this.session) {
      this.session.currentRound = 1;
      this.session.currentPhaseIndex = 0;
      this.session.timeRemaining = this.session.pattern.phases[0]?.duration || 0;
      this.session.elapsedTime = 0;
      this.currentCount = 1;
      this.countingDirection = 'up';
    }
    // Ensure sound callback is cleared on reset
    this.soundCallback = null;
  }

  // Get current session
  getSession(): BreathSession | null {
    return this.session;
  }

  // Get current phase
  getCurrentPhase(): BreathPhase | null {
    if (!this.session) return null;
    return this.session.pattern.phases[this.session.currentPhaseIndex] || null;
  }

  // Get progress percentage
  getProgress(): number {
    if (!this.session) return 0;
    return Math.min((this.session.elapsedTime / this.session.totalTime) * 100, 100);
  }

  // Get time remaining in current phase
  getPhaseTimeRemaining(): number {
    if (!this.session) return 0;
    return this.session.timeRemaining;
  }

  // Get current count
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

  // Event listener management
  addEventListener(listener: EngineEventListener): void {
    this.listeners.push(listener);
  }

  removeEventListener(listener: EngineEventListener): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  // Private methods
  private startPreciseTimer(): void {
    if (!this.session) return;
    
    // Use setInterval with drift correction for precise 1-second timing
    const startTime = performance.now();
    this.expectedTime = startTime;
    
    this.timer = setInterval(() => {
      // Check if session is still valid and active
      if (!this.session || this.session.isPaused || !this.session.isActive) {
        if (this.timer) {
          clearInterval(this.timer);
          this.timer = null;
        }
        return;
      }
      
      const now = performance.now();
      const drift = now - this.expectedTime;
      
      // Update session state
      this.session.timeRemaining--;
      this.session.elapsedTime++;
      
      // Update counting state and trigger sound immediately
      this.updateCountingState();
      
      // Check if current phase is complete
      if (this.session.timeRemaining <= 0) {
        this.advancePhase();
      }
      
      // Update timing for next interval with drift correction
      this.expectedTime += 1000;
      this.lastUpdateTime = now;
      this.expectedNextUpdate = this.expectedTime;
      
    }, 1000);
  }

  private updateCountingState(): void {
    if (!this.session || !this.session.isActive) return;
    
    const currentPhase = this.getCurrentPhase();
    if (!currentPhase) return;
    
    const phaseDuration = currentPhase.duration;
    const timeElapsed = phaseDuration - this.session.timeRemaining;
    const previousCount = this.currentCount;
    
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
    
    // Trigger sound callback if count changed OR if this is the first count of the session (elapsedTime === 0)
    if ((this.currentCount !== previousCount || this.session.elapsedTime === 0) && this.soundCallback) {
      // Ensure precise timing for sound callbacks
      const now = performance.now();
      this.soundCallback(currentPhase, this.currentCount);
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
    this.soundCallback = null; // Clear sound callback
    this.currentCount = 1;     // Reset counting state
    this.countingDirection = 'up';
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
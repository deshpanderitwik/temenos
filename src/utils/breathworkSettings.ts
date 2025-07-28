export interface BreathworkSettings {
  selectedPatternId: string;
  breaths: number;
}

const BREATHWORK_SETTINGS_KEY = 'breathwork-settings';

export const getDefaultBreathworkSettings = (): BreathworkSettings => ({
  selectedPatternId: 'box-breathing',
  breaths: 10,
});

export const saveBreathworkSettings = (settings: BreathworkSettings): void => {
  try {
    localStorage.setItem(BREATHWORK_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    // Silent error handling for privacy
  }
};

export const loadBreathworkSettings = (): BreathworkSettings => {
  try {
    const stored = localStorage.getItem(BREATHWORK_SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Validate the stored settings
      if (parsed.selectedPatternId && typeof parsed.breaths === 'number') {
        return {
          selectedPatternId: parsed.selectedPatternId,
          breaths: Math.max(3, Math.min(20, parsed.breaths)), // Ensure breaths is within valid range
        };
      }
    }
  } catch (error) {
    // Silent error handling for privacy
  }
  
  return getDefaultBreathworkSettings();
}; 
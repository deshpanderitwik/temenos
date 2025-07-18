export interface BreathPhase {
  type: 'inhale' | 'hold' | 'exhale' | 'pause';
  duration: number; // in seconds
  label?: string; // optional custom label for display
}

export interface BreathPattern {
  id: string;
  name: string;
  description: string;
  category: 'relaxation' | 'energizing' | 'meditative' | 'custom';
  phases: BreathPhase[];
  isCyclical: boolean;
  defaultBreaths?: number;
  instructions?: string;
}

export interface BreathSession {
  pattern: BreathPattern;
  breaths: number;
  currentRound: number;
  currentPhaseIndex: number;
  timeRemaining: number;
  isActive: boolean;
  isPaused: boolean;
  totalTime: number;
  elapsedTime: number;
}

// Predefined breathwork patterns
export const BREATH_PATTERNS: BreathPattern[] = [
  {
    id: 'box-breathing',
    name: 'Box Breathing',
    description: 'Equal duration for all phases - promotes calm and focus',
    category: 'relaxation',
    phases: [
      { type: 'inhale', duration: 4, label: 'Inhale' },
      { type: 'hold', duration: 4, label: 'Hold' },
      { type: 'exhale', duration: 4, label: 'Exhale' },
      { type: 'hold', duration: 4, label: 'Hold' }
    ],
    isCyclical: true,
    defaultBreaths: 10,
    instructions: 'Breathe in for 4 counts, hold for 4, exhale for 4, hold for 4. Repeat.'
  },

  {
    id: '4-7-8-breathing',
    name: '4-7-8 Breathing',
    description: 'Extended exhale promotes relaxation and sleep',
    category: 'relaxation',
    phases: [
      { type: 'inhale', duration: 4, label: 'Inhale' },
      { type: 'hold', duration: 7, label: 'Hold' },
      { type: 'exhale', duration: 8, label: 'Exhale' }
    ],
    isCyclical: true,
    defaultBreaths: 10,
    instructions: 'Inhale for 4 counts, hold for 7, exhale for 8. Repeat.'
  },
  {
    id: 'coherent-breathing',
    name: 'Coherent Breathing',
    description: 'Equal inhale and exhale for heart rate variability',
    category: 'relaxation',
    phases: [
      { type: 'inhale', duration: 5, label: 'Inhale' },
      { type: 'exhale', duration: 5, label: 'Exhale' }
    ],
    isCyclical: true,
    defaultBreaths: 20,
    instructions: 'Breathe in and out for equal counts of 5. No holds.'
  },
  {
    id: 'extended-exhale',
    name: 'Extended Exhale',
    description: 'Longer exhale activates parasympathetic nervous system',
    category: 'relaxation',
    phases: [
      { type: 'inhale', duration: 4, label: 'Inhale' },
      { type: 'exhale', duration: 6, label: 'Exhale' }
    ],
    isCyclical: true,
    defaultBreaths: 15,
    instructions: 'Inhale for 4 counts, exhale for 6 counts. No holds.'
  },
  {
    id: 'kapalabhati',
    name: 'Kapalabhati',
    description: 'Quick forceful exhales with passive inhales',
    category: 'energizing',
    phases: [
      { type: 'inhale', duration: 1, label: 'Inhale' },
      { type: 'exhale', duration: 1, label: 'Exhale' }
    ],
    isCyclical: true,
    defaultBreaths: 30,
    instructions: 'Quick forceful exhales with passive inhales. 1 second per breath.'
  },
  {
    id: 'wim-hof',
    name: 'Wim Hof Breathing',
    description: 'Deep breathing for energy and focus',
    category: 'energizing',
    phases: [
      { type: 'inhale', duration: 3, label: 'Deep Inhale' },
      { type: 'exhale', duration: 3, label: 'Relaxed Exhale' }
    ],
    isCyclical: true,
    defaultBreaths: 30,
    instructions: 'Deep, powerful breaths. Inhale and exhale for 3 counts each.'
  },
  {
    id: 'bhastrika',
    name: 'Bhastrika (Bellows Breath)',
    description: 'Forceful inhale and exhale for energy',
    category: 'energizing',
    phases: [
      { type: 'inhale', duration: 1, label: 'Forceful Inhale' },
      { type: 'exhale', duration: 1, label: 'Forceful Exhale' }
    ],
    isCyclical: true,
    defaultBreaths: 30,
    instructions: 'Forceful inhale and exhale. 1-2 breaths per second.'
  },
  {
    id: 'double-inhale',
    name: 'Double Inhale / Long Exhale',
    description: 'Two quick inhales followed by long exhale',
    category: 'energizing',
    phases: [
      { type: 'inhale', duration: 1, label: 'First Inhale' },
      { type: 'inhale', duration: 1, label: 'Second Inhale' },
      { type: 'exhale', duration: 4, label: 'Long Exhale' }
    ],
    isCyclical: true,
    defaultBreaths: 10,
    instructions: 'Two quick inhales through nose, one long exhale through mouth.'
  },
  {
    id: 'sama-vritti',
    name: 'Sama Vritti',
    description: 'Equal duration for all phases',
    category: 'meditative',
    phases: [
      { type: 'inhale', duration: 5, label: 'Inhale' },
      { type: 'hold', duration: 5, label: 'Hold' },
      { type: 'exhale', duration: 5, label: 'Exhale' },
      { type: 'hold', duration: 5, label: 'Hold' }
    ],
    isCyclical: true,
    defaultBreaths: 10,
    instructions: 'Equal duration for inhale, hold, exhale, and hold. 5 counts each.'
  },
  {
    id: 'viloma-interrupted',
    name: 'Viloma (Interrupted Inhale)',
    description: 'Segmented inhale with normal exhale',
    category: 'meditative',
    phases: [
      { type: 'inhale', duration: 2, label: 'First Inhale' },
      { type: 'hold', duration: 1, label: 'Mini Hold' },
      { type: 'inhale', duration: 2, label: 'Second Inhale' },
      { type: 'hold', duration: 1, label: 'Mini Hold' },
      { type: 'inhale', duration: 2, label: 'Third Inhale' },
      { type: 'exhale', duration: 6, label: 'Exhale' }
    ],
    isCyclical: true,
    defaultBreaths: 8,
    instructions: 'Three short inhales with mini holds, then normal exhale.'
  },
  {
    id: 'nadi-shodhana',
    name: 'Nadi Shodhana',
    description: 'Alternate nostril breathing for balance',
    category: 'meditative',
    phases: [
      { type: 'inhale', duration: 4, label: 'Inhale Left' },
      { type: 'hold', duration: 4, label: 'Hold' },
      { type: 'exhale', duration: 4, label: 'Exhale Right' },
      { type: 'inhale', duration: 4, label: 'Inhale Right' },
      { type: 'hold', duration: 4, label: 'Hold' },
      { type: 'exhale', duration: 4, label: 'Exhale Left' }
    ],
    isCyclical: true,
    defaultBreaths: 5,
    instructions: 'Inhale through left nostril, exhale through right. Then reverse.'
  }
];

export const getPatternById = (id: string): BreathPattern | undefined => {
  return BREATH_PATTERNS.find(pattern => pattern.id === id);
};

export const getPatternsByCategory = (category: BreathPattern['category']): BreathPattern[] => {
  return BREATH_PATTERNS.filter(pattern => pattern.category === category);
};

export const getCategoryDisplayName = (category: BreathPattern['category']): string => {
  const displayNames: Record<BreathPattern['category'], string> = {
    'relaxation': 'relaxing',
    'energizing': 'energizing',
    'meditative': 'meditative',
    'custom': 'custom'
  };
  return displayNames[category];
}; 
'use client';

import { useState } from 'react';
import { BREATH_PATTERNS, BreathPattern, getPatternsByCategory, getCategoryDisplayName } from '@/utils/breathworkPatterns';
import Modal from './Modal';

interface BreathworkPatternSelectorProps {
  selectedPattern: BreathPattern | null;
  onPatternSelect: (pattern: BreathPattern) => void;
  onClose: () => void;
  isOpen: boolean;
}

export default function BreathworkPatternSelector({
  selectedPattern,
  onPatternSelect,
  onClose,
  isOpen
}: BreathworkPatternSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<BreathPattern['category']>('relaxation');

  const categories = [
    { id: 'relaxation', name: 'Relaxation & Coherence', icon: '🧘‍♀️' },
    { id: 'energizing', name: 'Energizing', icon: '⚡' },
    { id: 'meditative', name: 'Meditative', icon: '🕉️' }
  ] as const;

  const patternsInCategory = getPatternsByCategory(selectedCategory);

  const getPhaseDescription = (pattern: BreathPattern): string => {
    return pattern.phases.map(phase => `${phase.label || phase.type} ${phase.duration}s`).join(' → ');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="2xl">
      {/* Header */}
      <div className="flex justify-center px-4 pt-6 pb-4 border-b border-white/10">
        <h2 className="text-xl font-surt-semibold text-white">Choose Breathing Pattern</h2>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors p-2 rounded hover:bg-white/10"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex border-b border-white/10">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`flex-1 px-4 py-3 text-sm font-surt-medium transition-colors ${
              selectedCategory === category.id
                ? 'bg-white/10 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="mr-2">{category.icon}</span>
            {category.name}
          </button>
        ))}
      </div>

      {/* Patterns List */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 scrollbar-hide">
        <div className="grid gap-3">
          {patternsInCategory.map((pattern) => (
            <div
              key={pattern.id}
              onClick={() => onPatternSelect(pattern)}
              className={`p-4 rounded-[12px] cursor-pointer transition-all border ${
                selectedPattern?.id === pattern.id
                  ? 'bg-white/10 border-white/20'
                  : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/15'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-base font-surt-medium text-white">{pattern.name}</h3>
                                  <span className="text-xs text-gray-400 bg-white/10 px-2 py-1 rounded-full font-surt-regular">
                    {getCategoryDisplayName(pattern.category)}
                  </span>
              </div>
                              <p className="text-sm text-gray-400 mb-3 font-surt-regular">{pattern.description}</p>
                                  <div className="text-xs text-gray-500 font-surt-regular">
                      {getPhaseDescription(pattern)}
                    </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-center px-4 pt-4 pb-6 border-t border-white/10">
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2 text-gray-400 hover:text-white transition-colors text-base font-surt-medium"
          >
            Cancel
          </button>
          {selectedPattern && (
            <button
              onClick={() => {
                onPatternSelect(selectedPattern);
                onClose();
              }}
              className="px-5 pt-2 pb-2.5 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors text-base font-surt-medium shadow-none"
            >
              Select Pattern
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
} 
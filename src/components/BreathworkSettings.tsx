'use client';

import { useState } from 'react';
import { BreathPattern, BREATH_PATTERNS, getCategoryDisplayName } from '@/utils/breathworkPatterns';
import Modal from './Modal';

interface BreathworkSettingsProps {
  pattern: BreathPattern;
  breaths: number;
  onBreathsChange: (breaths: number) => void;
  onPatternChange?: (pattern: BreathPattern) => void;
  onClose: () => void;
  isOpen: boolean;
}

export default function BreathworkSettings({
  pattern,
  breaths,
  onBreathsChange,
  onPatternChange,
  onClose,
  isOpen
}: BreathworkSettingsProps) {
  const [tempBreaths, setTempBreaths] = useState(breaths);

  const handleSave = () => {
    onBreathsChange(tempBreaths);
    onClose();
  };

  const handleCancel = () => {
    setTempBreaths(breaths);
    onClose();
  };

  const handlePatternSelect = (selectedPattern: BreathPattern) => {
    if (onPatternChange) {
      onPatternChange(selectedPattern);
    }
  };

  const calculateTotalTime = (breaths: number) => {
    const patternDuration = pattern.phases.reduce((total, phase) => total + phase.duration, 0);
    const totalSeconds = patternDuration * breaths;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getPhaseDescription = (pattern: BreathPattern): string => {
    return pattern.phases.map(phase => `${phase.label || phase.type} ${phase.duration}s`).join(' → ');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="2xl">
      <div className="flex flex-col h-full pt-8 pl-8 pr-8 pb-8 scrollbar-hide">
        {/* Breaths Setting - moved to top */}
        <div className="mb-6">
          <label className="block text-sm font-surt-medium text-white mb-6">
            Number of Breaths
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="3"
              max="20"
              value={tempBreaths}
              onChange={(e) => setTempBreaths(parseInt(e.target.value))}
              className="flex-1 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider"
            />
            <span className="text-white font-surt-medium min-w-[3rem] text-center text-base">
              {tempBreaths}
            </span>
          </div>
        </div>

        {/* Breathwork Patterns List */}
        <div className="mb-6 flex-1 min-h-0 overflow-hidden">
          <label className="block text-sm font-surt-medium text-white mb-3">
            Breathing Pattern
          </label>
          <div className="h-full relative">
            <div className="h-full overflow-y-auto scrollbar-hide" style={{ paddingRight: 0, marginRight: 0 }}>
              <div className="grid gap-2 pt-6 pb-16">
                {BREATH_PATTERNS.map((breathPattern) => (
                  <div
                    key={breathPattern.id}
                    onClick={() => handlePatternSelect(breathPattern)}
                    className={`p-3 rounded-[8px] cursor-pointer transition-all border ${
                      pattern.id === breathPattern.id
                        ? 'bg-white/10 border-white/20'
                        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/15'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <h4 className="text-sm font-surt-medium text-white">{breathPattern.name}</h4>
                      <span className="text-xs text-gray-400 bg-white/10 px-2 py-1 rounded-full">
                        {getCategoryDisplayName(breathPattern.category)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mb-2 font-surt-regular">{breathPattern.description}</p>
                    <div className="text-xs text-gray-500 font-surt-regular">
                      {getPhaseDescription(breathPattern)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Top gradient fade - positioned OVER the scroll container */}
            <div 
              className="absolute top-0 left-0 right-0 h-6 pointer-events-none z-20"
              style={{
                background: 'linear-gradient(to bottom, #141414 0%, rgba(20, 20, 20, 0.8) 50%, rgba(20, 20, 20, 0) 100%)'
              }}
            />
            
            {/* Bottom gradient fade - positioned at the actual scroll boundary */}
            <div 
              className="absolute left-0 right-0 h-8 pointer-events-none z-20"
              style={{
                bottom: '24px', // Account for the pb-10 (40px) padding minus 16px nudge
                background: 'linear-gradient(to top, #141414 0%, rgba(20, 20, 20, 0.9) 30%, rgba(20, 20, 20, 0.6) 60%, rgba(20, 20, 20, 0) 100%)'
              }}
            />
          </div>
        </div>

        {/* Buttons - positioned at bottom right */}
        <div className="flex justify-end gap-3 mt-auto">
          <button
            onClick={handleCancel}
            className="px-5 py-2 text-gray-400 hover:text-white transition-colors text-base font-surt-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 pt-2 pb-2.5 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors text-base font-surt-medium shadow-none"
          >
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
} 
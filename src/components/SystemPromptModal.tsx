'use client';

import { useState, useEffect } from 'react';

interface SystemPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPrompt: string;
  onSave: (prompt: string) => void;
}

const DEFAULT_SYSTEM_PROMPT = `You are a helpful AI assistant. You can help with various tasks and conversations.

Please respond in a helpful, informative, and engaging manner.`;

interface SavedPrompt {
  id: string;
  name: string;
  prompt: string;
  created: string;
  lastModified: string;
  characterCount: number;
}

export default function SystemPromptModal({
  isOpen,
  onClose,
  currentPrompt,
  onSave
}: SystemPromptModalProps) {
  const [prompt, setPrompt] = useState(currentPrompt);
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
  const [promptName, setPromptName] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPrompt(currentPrompt);
    if (isOpen) {
      loadSavedPrompts();
    }
  }, [currentPrompt, isOpen]);

  const loadSavedPrompts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/system-prompts');
      if (response.ok) {
        const data = await response.json();
        setSavedPrompts(data.systemPrompts || []);
      }
    } catch (error) {
      console.error('Error loading saved prompts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    onSave(prompt);
    onClose();
  };

  const handleSavePrompt = async () => {
    if (!promptName.trim() || !prompt.trim()) return;
    
    try {
      const response = await fetch('/api/system-prompts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: promptName.trim(),
          prompt: prompt
        })
      });

      if (response.ok) {
        await loadSavedPrompts();
        setPromptName('');
        setShowSaveForm(false);
      } else {
        console.error('Failed to save prompt');
      }
    } catch (error) {
      console.error('Error saving prompt:', error);
    }
  };

  const handleLoadPrompt = async (savedPrompt: SavedPrompt) => {
    try {
      const response = await fetch(`/api/system-prompts/${savedPrompt.id}`);
      if (response.ok) {
        const data = await response.json();
        setPrompt(data.systemPrompt.prompt);
      }
    } catch (error) {
      console.error('Error loading prompt:', error);
    }
  };

  const handleDeletePrompt = async (id: string) => {
    try {
      const response = await fetch(`/api/system-prompts/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadSavedPrompts();
      } else {
        console.error('Failed to delete prompt');
      }
    } catch (error) {
      console.error('Error deleting prompt:', error);
    }
  };

  const handleUseDefault = () => {
    setPrompt(DEFAULT_SYSTEM_PROMPT);
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 z-50"
          onClick={onClose}
        />
      )}

      {/* Modal */}
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center p-6 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        } transition-opacity duration-300`}
      >
        <div
          className={`bg-[#0A0A0A] border border-white/10 rounded-lg shadow-2xl w-full max-w-4xl h-[90vh] max-h-[90vh] transform transition-transform duration-300 flex flex-col ${
            isOpen ? 'scale-100' : 'scale-95'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col h-full min-h-0">
            {/* Header - Fixed */}
            <div className="flex justify-between items-center p-6 border-b border-white/10 flex-shrink-0">
              <div>
                                  <h2 className="text-2xl font-semibold text-white cursor-default">System Prompt</h2>
                <p className="text-gray-400 text-sm mt-1">Customize how the AI assistant behaves</p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 min-h-0">
              <div className="space-y-4 h-full flex flex-col">
                {/* Quick Actions */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <button
                    onClick={() => setShowSaveForm(true)}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    Save Current
                  </button>
                  <button
                    onClick={handleUseDefault}
                    className="px-3 py-1 text-sm bg-white/10 text-white rounded hover:bg-white/20 transition-colors"
                  >
                    Use Default
                  </button>
                </div>

                {/* Save Form */}
                {showSaveForm && (
                  <div className="bg-[#0A0A0A] rounded-lg p-4 border border-white/20 flex-shrink-0">
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        value={promptName}
                        onChange={(e) => setPromptName(e.target.value)}
                        placeholder="Enter a name for this prompt..."
                        className="flex-1 bg-white/10 border border-white/20 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSavePrompt();
                          }
                        }}
                      />
                      <button
                        onClick={handleSavePrompt}
                        disabled={!promptName.trim()}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setShowSaveForm(false)}
                        className="px-4 py-2 bg-white/10 text-white rounded hover:bg-white/20 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Saved Prompts */}
                {loading ? (
                  <div className="text-gray-400 text-center py-8 flex-shrink-0">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    Loading saved prompts...
                  </div>
                ) : savedPrompts.length > 0 ? (
                  <div className="flex-shrink-0">
                    <h3 className="text-lg font-medium text-white mb-3">Saved Prompts</h3>
                    <div className="grid gap-3 max-h-48 overflow-y-auto">
                      {savedPrompts.map((savedPrompt) => (
                        <div
                          key={savedPrompt.id}
                          className="p-4 bg-[#0A0A0A] rounded border border-white/20"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="text-white font-medium">{savedPrompt.name}</h4>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleLoadPrompt(savedPrompt)}
                                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                              >
                                Load
                              </button>
                              <button
                                onClick={() => handleDeletePrompt(savedPrompt.id)}
                                className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                          <p className="text-sm text-gray-400 line-clamp-3">
                            {savedPrompt.prompt}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* Prompt Editor */}
                <div className="flex-1 min-h-0 flex flex-col">
                  <label className="block text-sm font-medium text-gray-300 mb-2 flex-shrink-0">
                    System Prompt
                  </label>
                  <div className="flex-1 min-h-0 flex flex-col">
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      className="flex-1 min-h-[200px] bg-[#0A0A0A] border border-white/20 rounded-lg px-4 py-3 text-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter your system prompt..."
                    />
                    <p className="text-xs text-gray-500 mt-2 flex-shrink-0">
                      {prompt.length} characters
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer - Fixed */}
            <div className="flex justify-end gap-3 p-6 border-t border-white/10 flex-shrink-0">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Apply Prompt
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 
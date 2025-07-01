'use client';

import { useState, useEffect } from 'react';

interface Narrative {
  id: string;
  title: string;
  created: string;
  lastModified: string;
  characterCount: number;
}

interface NarrativesListProps {
  isOpen: boolean;
  onClose: () => void;
  currentNarrativeId: string | null;
  onNarrativeSelect: (narrativeId: string) => void;
  onNewNarrative: () => void;
  onDeleteNarrative: (narrativeId: string) => void;
}

export default function NarrativesList({
  isOpen,
  onClose,
  currentNarrativeId,
  onNarrativeSelect,
  onNewNarrative,
  onDeleteNarrative,
}: NarrativesListProps) {
  const [narratives, setNarratives] = useState<Narrative[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadNarratives();
    }
  }, [isOpen]);

  const loadNarratives = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/narratives');
      const data = await response.json();
      
      if (data.narratives) {
        setNarratives(data.narratives);
      }
    } catch (error) {
      console.error('Failed to load narratives:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (narrativeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this narrative? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/narratives/${narrativeId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setNarratives(prev => prev.filter(n => n.id !== narrativeId));
        onDeleteNarrative(narrativeId);
      }
    } catch (error) {
      console.error('Failed to delete narrative:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const formatCharacterCount = (count: number) => {
    if (count < 1000) return `${count} chars`;
    if (count < 1000000) return `${(count / 1000).toFixed(1)}k chars`;
    return `${(count / 1000000).toFixed(1)}M chars`;
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

      {/* Full Screen Modal */}
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center p-6 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        } transition-opacity duration-300`}
      >
        <div
          className={`bg-[#0A0A0A] border border-white/10 rounded-lg shadow-2xl w-full max-w-4xl max-h-[80vh] transform transition-transform duration-300 ${
            isOpen ? 'scale-100' : 'scale-95'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-white/10">
              <h2 className="text-2xl font-semibold text-white cursor-default">Narratives</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* New Narrative Button */}
            <div className="p-6 border-b border-white/10">
              <button
                onClick={() => {
                  onNewNarrative();
                  onClose();
                }}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-lg font-medium"
              >
                + New Narrative
              </button>
            </div>

            {/* Narratives List */}
            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="text-gray-400 text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  Loading narratives...
                </div>
              ) : narratives.length === 0 ? (
                <div className="text-gray-400 text-center py-12">
                  <div className="text-6xl mb-4">📝</div>
                  <h3 className="text-xl font-medium mb-2">No narratives yet</h3>
                  <p className="text-gray-500">Start your first narrative to begin your story!</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {narratives.map((narrative) => (
                    <div
                      key={narrative.id}
                      onClick={() => {
                        onNarrativeSelect(narrative.id);
                        onClose();
                      }}
                      className={`group p-4 rounded-lg cursor-pointer transition-all border-2 ${
                        currentNarrativeId === narrative.id
                          ? 'bg-blue-900 border-blue-600 shadow-lg'
                          : 'hover:bg-white/10 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white text-lg font-medium truncate mb-2">
                            {narrative.title}
                          </h3>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-gray-400">
                              {formatDate(narrative.lastModified)}
                            </span>
                            <span className="text-gray-500">
                              {formatCharacterCount(narrative.characterCount)}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => handleDelete(narrative.id, e)}
                          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 p-2 transition-all hover:bg-red-900 hover:bg-opacity-20 rounded"
                          title="Delete narrative"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Info */}
            <div className="p-6 border-t border-white/10 bg-[#0A0A0A] bg-opacity-50">
              <div className="flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center gap-4">
                  <span>🔒 All narratives are encrypted</span>
                  <span>💾 Stored locally on your machine</span>
                </div>
                <span>{narratives.length} narrative{narratives.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 
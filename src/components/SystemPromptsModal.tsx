import { useState } from 'react';
import SystemPromptsList from './SystemPromptsList';
import SystemPromptForm from './SystemPromptForm';

interface SystemPromptsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activePrompt: { title: string; body: string };
  setActivePrompt: (prompt: { title: string; body: string }) => void;
}

export default function SystemPromptsModal({ isOpen, onClose, activePrompt, setActivePrompt }: SystemPromptsModalProps) {
  const [mode, setMode] = useState<'list' | 'form'>('list');
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingPrompt, setEditingPrompt] = useState<null | { id: string; title: string; body: string; created: string; lastModified: string }>(null);
  const [viewOnly, setViewOnly] = useState(false);

  // Always reset to list mode when modal is closed
  if (!isOpen) {
    if (mode !== 'list') setMode('list');
    if (editingPrompt) setEditingPrompt(null);
    if (viewOnly) setViewOnly(false);
    return null;
  }

  return (
    <>
      {/* Scrim */}
      <div
        className="fixed top-0 left-0 w-full h-full z-[200] transition-opacity duration-300"
        onClick={onClose}
        style={{ background: 'rgba(0,0,0,0.6)', pointerEvents: 'auto' }}
      />
      {/* Modal Container */}
      <div className="fixed z-[210] top-0 left-0 w-full h-full flex items-center justify-center pointer-events-none">
        <div
          className="bg-[#141414] border border-white/10 rounded-xl w-full max-w-2xl h-[672px] shadow-xl flex flex-col transition-transform duration-300 scale-100 pointer-events-auto"
          onClick={e => e.stopPropagation()}
        >
          {mode === 'list' && !editingPrompt ? (
            <SystemPromptsList
              isOpen={true}
              onClose={onClose}
              currentPromptId={null}
              onPromptSelect={prompt => {
                setActivePrompt({ title: prompt.title, body: prompt.body });
                onClose();
              }}
              onNewPrompt={() => setMode('form')}
              onDeletePrompt={() => setRefreshKey(k => k + 1)}
              onEditPrompt={(prompt, viewOnlyFlag) => { setEditingPrompt(prompt); setMode('form'); setViewOnly(!!viewOnlyFlag); }}
              key={refreshKey}
            />
          ) : (
            <SystemPromptForm
              isOpen={true}
              onClose={() => { setMode('list'); setEditingPrompt(null); setViewOnly(false); }}
              onCreated={() => {
                setMode('list');
                setEditingPrompt(null);
                setViewOnly(false);
                setRefreshKey(k => k + 1);
              }}
              initialPrompt={editingPrompt || undefined}
              viewOnly={viewOnly}
            />
          )}
        </div>
      </div>
    </>
  );
} 
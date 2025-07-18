import { useState } from 'react';
import SystemPromptsList from './SystemPromptsList';
import SystemPromptForm from './SystemPromptForm';
import Modal from './Modal';

interface SystemPromptsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activePrompt: { title: string; body: string };
  setActivePrompt: (prompt: { title: string; body: string }) => void;
  preloadedPrompts?: Array<{ id: string; title: string; body: string; created: string; lastModified: string }>;
}

export default function SystemPromptsModal({ isOpen, onClose, activePrompt, setActivePrompt, preloadedPrompts }: SystemPromptsModalProps) {
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
    <Modal isOpen={isOpen} onClose={onClose} zIndex={210}>
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
          isInsideModal={true}
          key={refreshKey}
          preloadedPrompts={preloadedPrompts}
          refreshKey={refreshKey}
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
    </Modal>
  );
} 
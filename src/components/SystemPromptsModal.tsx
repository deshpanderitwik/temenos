import { useState, useEffect } from 'react';
import SystemPromptsList from './SystemPromptsList';
import SystemPromptForm from './SystemPromptForm';
import Modal from './Modal';

interface SystemPromptsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activePrompt: { title: string; body: string };
  setActivePrompt: (prompt: { title: string; body: string }) => void;
  preloadedPrompts?: Array<{ id: string; title: string; body?: string; created: string; lastModified: string }>;
}

export default function SystemPromptsModal({ isOpen, onClose, activePrompt, setActivePrompt, preloadedPrompts }: SystemPromptsModalProps) {
  const [mode, setMode] = useState<'list' | 'form'>('list');
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingPrompt, setEditingPrompt] = useState<null | { id: string; title: string; body?: string; created: string; lastModified: string }>(null);
  const [viewOnly, setViewOnly] = useState(false);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setMode('list');
      setEditingPrompt(null);
      setViewOnly(false);
    }
  }, [isOpen]);

  const handleClose = () => {
    setMode('list');
    setEditingPrompt(null);
    setViewOnly(false);
    onClose();
  };

  const handleFormClose = () => {
    setMode('list');
    setEditingPrompt(null);
    setViewOnly(false);
  };

  const handleFormCreated = () => {
    setMode('list');
    setEditingPrompt(null);
    setViewOnly(false);
    setRefreshKey(k => k + 1);
  };

  const handleEditPrompt = (prompt: { id: string; title: string; body?: string; created: string; lastModified: string }, viewOnlyFlag?: boolean) => {
    setEditingPrompt(prompt);
    setMode('form');
    setViewOnly(!!viewOnlyFlag);
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} zIndex={210}>
      {mode === 'list' && !editingPrompt ? (
        <SystemPromptsList
          isOpen={true}
          onClose={handleClose}
          currentPromptId={null}
          onPromptSelect={prompt => {
            setActivePrompt({ title: prompt.title, body: prompt.body || '' });
            handleClose();
          }}
          onNewPrompt={() => setMode('form')}
          onDeletePrompt={() => setRefreshKey(k => k + 1)}
          onEditPrompt={handleEditPrompt}
          isInsideModal={true}
          key={refreshKey}
          preloadedPrompts={preloadedPrompts}
          refreshKey={refreshKey}
        />
      ) : (
        <SystemPromptForm
          isOpen={true}
          onClose={handleFormClose}
          onCreated={handleFormCreated}
          initialPrompt={editingPrompt || undefined}
          viewOnly={viewOnly}
        />
      )}
    </Modal>
  );
} 
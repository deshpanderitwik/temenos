import { useState } from 'react';
import ContextsList from './ContextsList';
import ContextForm from './ContextForm';
import Modal from './Modal';

interface ContextsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContextSelect: (context: { id: string; title: string; body: string; created: string; lastModified: string }) => void;
  onDeleteContext?: (contextId: string) => void;
  preloadedContexts?: Array<{ id: string; title: string; body: string; created: string; lastModified: string }>;
}

export default function ContextsModal({ isOpen, onClose, onContextSelect, onDeleteContext, preloadedContexts }: ContextsModalProps) {
  const [mode, setMode] = useState<'list' | 'form'>('list');
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingContext, setEditingContext] = useState<null | { id: string; title: string; body: string; created: string; lastModified: string }>(null);
  const [viewOnly, setViewOnly] = useState(false);

  // Always reset to list mode when modal is closed
  if (!isOpen) {
    if (mode !== 'list') setMode('list');
    if (editingContext) setEditingContext(null);
    if (viewOnly) setViewOnly(false);
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} zIndex={210}>
      {mode === 'list' && !editingContext ? (
        <ContextsList
          isOpen={true}
          onClose={onClose}
          currentContextId={null}
          onContextSelect={context => {
            onContextSelect(context);
            onClose();
          }}
          onNewContext={() => setMode('form')}
          onDeleteContext={(contextId) => {
            setRefreshKey(k => k + 1);
            onDeleteContext?.(contextId);
          }}
          onEditContext={(context, viewOnlyFlag) => { setEditingContext(context); setMode('form'); setViewOnly(!!viewOnlyFlag); }}
          isInsideModal={true}
          key={refreshKey}
          preloadedContexts={preloadedContexts}
          refreshKey={refreshKey}
        />
      ) : (
        <ContextForm
          isOpen={true}
          onClose={() => { setMode('list'); setEditingContext(null); setViewOnly(false); }}
          onCreated={() => {
            setMode('list');
            setEditingContext(null);
            setViewOnly(false);
            setRefreshKey(k => k + 1);
          }}
          initialContext={editingContext || undefined}
          viewOnly={viewOnly}
        />
      )}
    </Modal>
  );
} 
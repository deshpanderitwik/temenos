import { useState, useEffect } from 'react';
import ItemListBrowser from './ItemListBrowser';
import { DEFAULT_SYSTEM_PROMPT } from '@/utils/constants';

interface SystemPrompt {
  id: string;
  title: string;
  body: string;
  created: string;
  lastModified: string;
}

interface SystemPromptsListProps {
  isOpen: boolean;
  onClose: () => void;
  currentPromptId: string | null;
  onPromptSelect: (prompt: SystemPrompt) => void;
  onNewPrompt: () => void;
  onDeletePrompt: (promptId: string) => void;
  onEditPrompt?: (prompt: SystemPrompt, viewOnly?: boolean) => void;
}

export default function SystemPromptsList({
  isOpen,
  onClose,
  currentPromptId,
  onPromptSelect,
  onNewPrompt,
  onDeletePrompt,
  onEditPrompt,
}: SystemPromptsListProps) {
  const [prompts, setPrompts] = useState<SystemPrompt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadPrompts();
    } else {
      // Reset state when modal closes
      setPrompts([]);
      setLoading(true);
    }
  }, [isOpen]);

  const loadPrompts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/system-prompts');
      const data = await response.json();
      const now = new Date().toISOString();
      const defaultPrompt = {
        id: 'default',
        title: 'Temenos Guide',
        body: DEFAULT_SYSTEM_PROMPT,
        created: now,
        lastModified: now,
      };
      if (data.prompts) {
        setPrompts([defaultPrompt, ...data.prompts]);
      } else {
        setPrompts([defaultPrompt]);
      }
    } catch (error) {
      // Silent error handling
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (promptId: string) => {
    try {
      const response = await fetch(`/api/system-prompts/${promptId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setPrompts(prev => prev.filter(p => p.id !== promptId));
        onDeletePrompt(promptId);
      }
    } catch (error) {
      // Silent error handling
    }
  };

  return (
    <ItemListBrowser
      isOpen={isOpen}
      onClose={onClose}
      items={prompts}
      currentItemId={currentPromptId}
      onItemSelect={prompt => onPromptSelect(prompt)}
      onNewItem={onNewPrompt}
      onDeleteItem={id => {
        if (id === 'default') return;
        handleDelete(id);
      }}
      renderItemTitle={p => (
        <span className="flex items-center gap-2">
          {p.title}
          {p.id === 'default' && (
            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-white/10 text-white/70 border border-white/20 flex items-center">Default</span>
          )}
        </span>
      )}
      renderItemDate={p => {
        const date = new Date(p.lastModified);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${month}/${day}/${year}`;
      }}
      getItemId={p => p.id}
      newItemLabel={'+ New System Prompt'}
      emptyIcon={'🧠'}
      emptyTitle={'No system prompts yet'}
      emptyDescription={'Create your first system prompt to guide your AI!'}
      loading={loading}
      canDeleteItem={p => p.id !== 'default'}
      closeOnNewItem={false}
      renderItemActions={p => onEditPrompt ? (
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="text-gray-400 p-2 transition-all rounded hover:text-white hover:bg-white/10"
            title="Edit"
            onClick={e => { e.stopPropagation(); onEditPrompt(p, p.id === 'default'); }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
            </svg>
          </button>
        </div>
      ) : null}
    />
  );
} 
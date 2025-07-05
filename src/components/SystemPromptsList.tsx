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
  isInsideModal?: boolean;
}

export default function SystemPromptsList({
  isOpen,
  onClose,
  currentPromptId,
  onPromptSelect,
  onNewPrompt,
  onDeletePrompt,
  onEditPrompt,
  isInsideModal = false,
}: SystemPromptsListProps) {
  const [prompts, setPrompts] = useState<SystemPrompt[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadPrompts();
    } else {
      // Reset state when modal closes
      setPrompts([]);
    }
  }, [isOpen]);

  const loadPrompts = async () => {
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

  // If not inside a modal, use the full ItemListBrowser component
  if (!isInsideModal) {
    return (
      <ItemListBrowser<SystemPrompt>
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
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 0 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
              </svg>
            </button>
          </div>
        ) : null}
      />
    );
  }

  // If inside a modal, render just the content without the modal wrapper
  return (
    <>
      {/* New Item Button */}
      <div className="flex justify-center px-4 pt-6 pb-4">
        <button
          onClick={onNewPrompt}
          className="px-5 py-2 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors text-base font-medium shadow-none"
        >
          + New System Prompt
        </button>
      </div>

      {/* List */}
      <div className="flex-1 min-h-0 overflow-y-auto p-2 scrollbar-hide">
        {prompts.length > 0 && (
          <div>
            {prompts.map((item, index) => {
              const id = item.id;
              const deletable = id !== 'default';
              return (
                <div key={id}>
                  <div
                    onClick={() => {
                      onPromptSelect(item);
                      onClose();
                    }}
                    className={`flex items-center justify-between px-4 py-4 cursor-pointer transition-all ${
                      currentPromptId === id
                        ? 'bg-[rgba(255,255,255,0.1)] rounded-[12px]' : 'hover:bg-white/5 hover:rounded-[12px]'
                    }`}
                  >
                    <div className="truncate text-white text-base">
                      <span className="flex items-center gap-2">
                        {item.title}
                        {item.id === 'default' && (
                          <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-white/10 text-white/70 border border-white/20 flex items-center">Default</span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-gray-400 text-sm">
                        {(() => {
                          const date = new Date(item.lastModified);
                          const month = (date.getMonth() + 1).toString().padStart(2, '0');
                          const day = date.getDate().toString().padStart(2, '0');
                          const year = date.getFullYear();
                          return `${month}/${day}/${year}`;
                        })()}
                      </span>
                      {onEditPrompt && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            className="text-gray-400 p-2 transition-all rounded hover:text-white hover:bg-white/10"
                            title="Edit"
                            onClick={e => { e.stopPropagation(); onEditPrompt(item, item.id === 'default'); }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 0 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                            </svg>
                          </button>
                        </div>
                      )}
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          if (!deletable) return;
                          if (confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
                            handleDelete(id);
                          }
                        }}
                        className={`text-gray-400 p-2 transition-all rounded ${deletable ? 'hover:text-white hover:bg-white/10' : 'opacity-40 cursor-not-allowed text-gray-600'}`}
                        title={deletable ? 'Delete' : 'Cannot delete'}
                        disabled={!deletable}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
} 
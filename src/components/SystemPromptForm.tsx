import { useState, useEffect } from 'react';

interface SystemPromptFormProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (prompt: { id: string; title: string; body: string; created: string; lastModified: string }) => void;
  initialPrompt?: { id: string; title: string; body: string; created: string; lastModified: string };
  viewOnly?: boolean;
}

export default function SystemPromptForm({ isOpen, onClose, onCreated, initialPrompt, viewOnly }: SystemPromptFormProps) {
  const [title, setTitle] = useState(initialPrompt?.title || '');
  const [body, setBody] = useState(initialPrompt?.body || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTitle(initialPrompt?.title || '');
    setBody(initialPrompt?.body || '');
  }, [initialPrompt]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      let response, data;
      if (initialPrompt) {
        response = await fetch(`/api/system-prompts/${initialPrompt.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, body }),
        });
      } else {
        response = await fetch('/api/system-prompts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, body }),
        });
      }
      if (!response.ok) {
        data = await response.json();
        setError(data.error || 'Failed to save prompt.');
        setLoading(false);
        return;
      }
      data = await response.json();
      onCreated(data.prompt);
      setTitle('');
      setBody('');
      onClose();
    } catch (err) {
      setError('Failed to save prompt.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <form
      className="flex flex-col flex-1 p-8"
      style={{ minHeight: 0 }}
      onSubmit={handleSubmit}
      onClick={e => e.stopPropagation()}
    >
      <h2 className="text-white text-2xl font-semibold mb-6">{viewOnly ? 'View Default System Prompt' : initialPrompt ? 'Edit System Prompt' : 'New System Prompt'}</h2>
      <label className="text-gray-300 text-sm mb-2" htmlFor="system-prompt-title">Title</label>
      <input
        id="system-prompt-title"
        className={`mb-4 px-4 py-2 rounded bg-[#232323] border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500 ${loading || viewOnly ? 'text-white/60 cursor-not-allowed' : 'text-white'}`}
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Give your prompt a title here"
        required
        disabled={loading || viewOnly}
        maxLength={100}
      />
      <label className="text-gray-300 text-sm mb-2" htmlFor="system-prompt-body">Prompt</label>
      <textarea
        id="system-prompt-body"
        className={`mb-4 px-4 py-2 rounded bg-[#232323] border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px] flex-1 ${loading || viewOnly ? 'text-white/60 cursor-not-allowed' : 'text-white'}`}
        value={body}
        onChange={e => setBody(e.target.value)}
        placeholder="Write the body of your prompt here"
        required
        disabled={loading || viewOnly}
        maxLength={2000}
      />
      {error && <div className="text-red-400 mb-4">{error}</div>}
      <div className="flex justify-end gap-3 mt-2">
        <button
          type="button"
          className={`px-5 py-2 rounded-full transition-colors text-base font-medium shadow-none ${loading ? 'text-white/60 cursor-not-allowed' : 'bg-white/10 text-white hover:bg-white/20'}`}
          onClick={onClose}
          disabled={loading}
        >
          {viewOnly ? 'Close' : 'Cancel'}
        </button>
        <button
          type="submit"
          className={`px-5 py-2 rounded-full transition-colors text-base font-medium shadow-none disabled:opacity-60 ${loading || viewOnly ? 'bg-white/20 text-white/60 cursor-not-allowed' : 'bg-white/20 text-white hover:bg-white/30'}`}
          disabled={loading || viewOnly}
        >
          Save Prompt
        </button>
      </div>
    </form>
  );
} 
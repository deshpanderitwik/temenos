import { useState, useEffect } from 'react';

interface ContextFormProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (context: { id: string; title: string; body: string; created: string; lastModified: string }) => void;
  initialContext?: { id: string; title: string; body: string; created: string; lastModified: string };
  viewOnly?: boolean;
}

export default function ContextForm({ isOpen, onClose, onCreated, initialContext, viewOnly }: ContextFormProps) {
  const [title, setTitle] = useState(initialContext?.title || '');
  const [body, setBody] = useState(initialContext?.body || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTitle(initialContext?.title || '');
    setBody(initialContext?.body || '');
  }, [initialContext]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      let response, data;
      if (initialContext) {
        response = await fetch(`/api/contexts/${initialContext.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, body }),
        });
      } else {
        response = await fetch('/api/contexts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, body }),
        });
      }
      if (!response.ok) {
        data = await response.json();
        setError(data.error || 'Failed to save context.');
        setLoading(false);
        return;
      }
      data = await response.json();
      onCreated(data.context);
      setTitle('');
      setBody('');
      onClose();
    } catch (err) {
      setError('Failed to save context.');
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

      <label className="text-gray-300 text-sm mb-2 font-surt-medium" htmlFor="context-title">Title</label>
      <input
        id="context-title"
        className={`mb-4 px-4 py-2 rounded bg-[#232323] border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500 font-surt-medium ${loading || viewOnly ? 'text-white/60 cursor-not-allowed' : 'text-white'}`}
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Give your context a title here"
        required
        disabled={loading || viewOnly}
        maxLength={100}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
      />
      <label className="text-gray-300 text-sm mb-2 font-surt-medium" htmlFor="context-body">Context</label>
      <textarea
        id="context-body"
        className={`mb-4 px-4 py-2 rounded bg-[#232323] border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px] flex-1 resize-none font-surt-medium ${loading || viewOnly ? 'text-white/60 cursor-not-allowed' : 'text-white'}`}
        value={body}
        onChange={e => setBody(e.target.value)}
        placeholder="Write the context text here"
        required
        disabled={loading || viewOnly}
        maxLength={2000}
      />
      {error && <div className="text-red-400 mb-4">{error}</div>}
      <div className="flex justify-end gap-3 mt-2">
        <button
          type="button"
          className={`px-5 py-2 rounded-full transition-colors text-base font-surt-medium shadow-none ${loading ? 'text-white/60 cursor-not-allowed' : 'bg-white/10 text-white hover:bg-white/20'}`}
          onClick={onClose}
          disabled={loading}
        >
          {viewOnly ? 'Close' : 'Cancel'}
        </button>
        <button
          type="submit"
          className={`px-5 py-2 rounded-full transition-colors text-base font-surt-medium shadow-none disabled:opacity-60 ${loading || viewOnly ? 'bg-white/20 text-white/60 cursor-not-allowed' : 'bg-white/20 text-white hover:bg-white/30'}`}
          disabled={loading || viewOnly}
        >
          Save Context
        </button>
      </div>
    </form>
  );
} 
'use client';

import { useState, useEffect } from 'react';

interface ConversationMetadata {
  id: string;
  title: string;
  created: string;
  lastModified: string;
  messageCount: number;
}

interface ConversationListProps {
  isOpen: boolean;
  onClose: () => void;
  currentConversationId: string | null;
  onConversationSelect: (conversationId: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (conversationId: string) => void;
}

export default function ConversationList({
  isOpen,
  onClose,
  currentConversationId,
  onConversationSelect,
  onNewConversation,
  onDeleteConversation
}: ConversationListProps) {
  const [conversations, setConversations] = useState<ConversationMetadata[]>([]);
  const [loading, setLoading] = useState(false);

  // Load conversations when sidebar opens
  useEffect(() => {
    if (isOpen) {
      loadConversations();
    }
  }, [isOpen]);

  const loadConversations = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/conversations');
      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent conversation selection
    
    if (!confirm('Are you sure you want to delete this conversation?')) {
      return;
    }

    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setConversations(prev => prev.filter(conv => conv.id !== conversationId));
        onDeleteConversation(conversationId);
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
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
          className={`bg-[#141414] border border-white/10 rounded-lg shadow-2xl w-full max-w-4xl h-[80vh] transform transition-transform duration-300 ${
            isOpen ? 'scale-100' : 'scale-95'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-white/10 flex-shrink-0">
              <h2 className="text-2xl font-semibold text-white cursor-default">Conversations</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* New Conversation Button */}
            <div className="p-6 border-b border-white/10 flex-shrink-0">
              <button
                onClick={() => {
                  onNewConversation();
                  onClose();
                }}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-lg font-medium"
              >
                + New Conversation
              </button>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto p-6 min-h-0">
              {loading ? (
                <div className="text-gray-400 text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  Loading conversations...
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-gray-400 text-center py-12">
                  <div className="text-6xl mb-4">💬</div>
                  <h3 className="text-xl font-medium mb-2">No conversations yet</h3>
                  <p className="text-gray-500">Start your first conversation to begin your exploration!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {conversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      onClick={() => {
                        onConversationSelect(conversation.id);
                        onClose();
                      }}
                      className={`group p-4 rounded-lg cursor-pointer transition-all border-2 ${
                        currentConversationId === conversation.id
                          ? 'bg-blue-900 border-blue-600 shadow-lg'
                          : 'hover:bg-white/10 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white text-lg font-medium truncate mb-2">
                            {conversation.title}
                          </h3>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-gray-400">
                              {formatDate(conversation.lastModified)}
                            </span>
                            <span className="text-gray-500">
                              {conversation.messageCount} messages
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => handleDelete(conversation.id, e)}
                          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 p-2 transition-all hover:bg-red-900 hover:bg-opacity-20 rounded"
                          title="Delete conversation"
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
            <div className="p-6 border-t border-white/10 bg-[#141414] bg-opacity-50 flex-shrink-0">
              <div className="flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center gap-4">
                  <span>🔒 All conversations are encrypted</span>
                  <span>💾 Stored locally on your machine</span>
                </div>
                <span>{conversations.length} conversation{conversations.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 
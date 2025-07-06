'use client';

import { useState, useEffect } from 'react';
import ItemListBrowser from './ItemListBrowser';

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
  preloadedConversations?: Array<{ id: string; title: string; created: string; lastModified: string; messageCount: number }>;
}

export default function ConversationList({
  isOpen,
  onClose,
  currentConversationId,
  onConversationSelect,
  onNewConversation,
  onDeleteConversation,
  preloadedConversations
}: ConversationListProps) {
  const [conversations, setConversations] = useState<ConversationMetadata[]>([]);

  // Load conversations when the sidebar is opened
  useEffect(() => {
    if (isOpen) {
      if (preloadedConversations && preloadedConversations.length > 0) {
        // Use preloaded data if available
        setConversations(preloadedConversations);
      } else {
        // Fallback to API call if no preloaded data
        loadConversations();
      }
    } else {
      // Reset state when modal closes
      setConversations([]);
    }
  }, [isOpen, preloadedConversations]);

  const loadConversations = async () => {
    try {
      const response = await fetch('/api/conversations');
      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (error) {
      // Silent error handling for privacy
    }
  };

  const handleDelete = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setConversations(prev => prev.filter(conv => conv.id !== conversationId));
        onDeleteConversation(conversationId);
      }
    } catch (error) {
      // Silent error handling for privacy
    }
  };

  return (
    <ItemListBrowser<ConversationMetadata>
      isOpen={isOpen}
      onClose={onClose}
      items={conversations}
      currentItemId={currentConversationId}
      onItemSelect={c => onConversationSelect(c.id)}
      onNewItem={onNewConversation}
      onDeleteItem={handleDelete}
      renderItemTitle={c => c.title}
      renderItemDate={c => {
        const date = new Date(c.lastModified);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${month}/${day}/${year}`;
      }}
      getItemId={c => c.id}
      newItemLabel={'+ New Conversation'}
      closeOnNewItem={true}
    />
  );
} 
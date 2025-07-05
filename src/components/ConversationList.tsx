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
  const [loading, setLoading] = useState(true);

  // Load conversations when the sidebar is opened
  useEffect(() => {
    if (isOpen) {
      loadConversations();
    } else {
      // Reset state when modal closes
      setConversations([]);
      setLoading(true);
    }
  }, [isOpen]);

  const loadConversations = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/conversations');
      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (error) {
      // Silent error handling for privacy
    } finally {
      setLoading(false);
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
    <ItemListBrowser
      isOpen={isOpen}
      onClose={onClose}
      items={conversations}
      currentItemId={currentConversationId}
      onItemSelect={onConversationSelect}
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
      emptyIcon={'💬'}
      emptyTitle={'No conversations yet'}
      emptyDescription={'Start your first conversation to begin your exploration!'}
      loading={loading}
      closeOnNewItem={true}
    />
  );
} 
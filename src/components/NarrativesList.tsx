'use client';

import { useState, useEffect } from 'react';
import ItemListBrowser from './ItemListBrowser';

interface Narrative {
  id: string;
  title: string;
  created: string;
  lastModified: string;
  characterCount: number;
  preferredMode?: 'draft' | 'main';
}

interface NarrativesListProps {
  isOpen: boolean;
  onClose: () => void;
  currentNarrativeId: string | null;
  onNarrativeSelect: (narrativeId: string) => void;
  onNewNarrative: () => void;
  onDeleteNarrative: (narrativeId: string) => void;
  preloadedNarratives?: Array<{ id: string; title: string; created: string; lastModified: string; characterCount: number }>;
  refreshTrigger?: number; // Add a refresh trigger that increments when narratives are updated
}

export default function NarrativesList({
  isOpen,
  onClose,
  currentNarrativeId,
  onNarrativeSelect,
  onNewNarrative,
  onDeleteNarrative,
  preloadedNarratives,
  refreshTrigger = 0,
}: NarrativesListProps) {
  const [narratives, setNarratives] = useState<Narrative[]>([]);

  // Load narratives when the sidebar is opened, when preloaded data changes, or when refresh is triggered
  useEffect(() => {
    if (isOpen) {
      if (preloadedNarratives && preloadedNarratives.length > 0) {
        // Use preloaded data if available
        setNarratives(preloadedNarratives);
      } else {
        // Fallback to API call if no preloaded data
        loadNarratives();
      }
    } else {
      // Reset state when modal closes
      setNarratives([]);
    }
  }, [isOpen, preloadedNarratives, refreshTrigger]);

  const loadNarratives = async () => {
    try {
      const response = await fetch('/api/narratives');
      const data = await response.json();
      
      if (data.narratives) {
        setNarratives(data.narratives);
      }
    } catch (error) {
      // Silent error handling for privacy
    }
  };

  const handleDelete = async (narrativeId: string) => {
    try {
      const response = await fetch(`/api/narratives/${narrativeId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setNarratives(prev => prev.filter(n => n.id !== narrativeId));
        onDeleteNarrative(narrativeId);
      }
    } catch (error) {
      // Silent error handling for privacy
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const formatCharacterCount = (count: number) => {
    if (count < 1000) return `${count} chars`;
    if (count < 1000000) return `${(count / 1000).toFixed(1)}k chars`;
    return `${(count / 1000000).toFixed(1)}M chars`;
  };

  return (
    <ItemListBrowser<Narrative>
      isOpen={isOpen}
      onClose={onClose}
      items={narratives}
      currentItemId={currentNarrativeId}
      onItemSelect={n => onNarrativeSelect(n.id)}
      onNewItem={onNewNarrative}
      onDeleteItem={handleDelete}
      renderItemTitle={n => n.title}
      renderItemDate={n => {
        const date = new Date(n.lastModified);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${month}/${day}/${year}`;
      }}
      getItemId={n => n.id}
      newItemLabel={'+ New Narrative'}
      closeOnNewItem={true}
    />
  );
} 
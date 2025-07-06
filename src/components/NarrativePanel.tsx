'use client';

/**
 * Narrative Editor Component
 * 
 * Keyboard Shortcuts:
 * - Cmd+Z (Mac) / Ctrl+Z (Windows/Linux): Undo
 * - Cmd+Shift+Z (Mac) / Ctrl+Y (Windows/Linux): Redo
 * - Cmd+S (Mac) / Ctrl+S (Windows/Linux): Save
 * - Cmd+Enter (Mac) / Ctrl+Enter (Windows/Linux): Add new paragraph
 * - Cmd+J (Mac) / Ctrl+J (Windows/Linux): Toggle draft/main mode (global)
 * - Cmd+B: Bold text
 * - Cmd+I: Italic text
 * - Cmd+1/2/3: Heading levels 1/2/3
 */

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import History from '@tiptap/extension-history';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Heading from '@tiptap/extension-heading';
import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';

interface Narrative {
  id: string;
  title: string;
  content: string;
  draftContent?: string;
  created: string;
  lastModified: string;
  characterCount: number;
}

interface NarrativePanelProps {
  currentNarrative: Narrative | null;
  onNarrativeUpdate: (narrative: Narrative | null) => void;
  onSave?: () => void;
  isDraftMode: boolean;
  setIsDraftMode: (v: boolean) => void;
}

export interface NarrativePanelRef {
  addTextToContent: (text: string) => void;
  saveCurrentContent: () => Promise<void>;
  handleModeSwitch: () => Promise<void>;
}

// Consolidated narrative state interface
interface NarrativeState {
  id: string | null;
  title: string; // Independent of mode changes - same in both draft and main modes
  mainContent: string;
  draftContent: string;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
}

const NarrativePanel = forwardRef<NarrativePanelRef, NarrativePanelProps>(({ currentNarrative, onNarrativeUpdate, onSave, isDraftMode, setIsDraftMode }, ref) => {
  // Consolidated state - single source of truth
  const [narrativeState, setNarrativeState] = useState<NarrativeState>({
    id: null,
    title: '',
    mainContent: '',
    draftContent: '',
    lastSaved: null,
    hasUnsavedChanges: false
  });

  // Simplified state variables
  const [isSaving, setIsSaving] = useState(false);
  const [titleOpacity, setTitleOpacity] = useState(0.95);
  const [isTitleFocused, setIsTitleFocused] = useState(false);
  
  // Essential refs only
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isAutoSavingRef = useRef(false);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);



  const editor = useEditor({
    extensions: [
      Document,
      Paragraph.configure({
        HTMLAttributes: {
          class: 'whitespace-pre-wrap',
        },
      }),
      Text,
      Placeholder.configure({
        placeholder: 'Begin writing your narrative here... Share your thoughts, insights, and the story that emerges from your exploration.',
      }),
      CharacterCount,
      History.configure({
        depth: 100, // Keep more history entries
      }),
      Bold,
      Italic,
      Heading.configure({
        levels: [1, 2, 3],
      }),
    ],
    content: '<p>Start your story here...</p>',
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const content = editor.getHTML();
      
      // Debounce state updates to prevent cursor jumping during rapid typing
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      
      updateTimeoutRef.current = setTimeout(() => {
        // Update the appropriate content based on current mode
        setNarrativeState(prev => ({
          ...prev,
          ...(isDraftMode 
            ? { draftContent: content }
            : { mainContent: content }
          ),
          hasUnsavedChanges: true
        }));
      }, 100); // Short debounce for state updates
      
      // Auto-save functionality
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      saveTimeoutRef.current = setTimeout(() => {
        handleAutoSave(content);
      }, 500);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none',
        style: 'height: 100%; overflow: visible;',
      },
      handleKeyDown: (view, event) => {
        // Custom keyboard shortcuts for the narrative editor
        const { state, dispatch } = view;
        
        // Cmd+S (Mac) or Ctrl+S (Windows/Linux) to save
        if ((event.metaKey || event.ctrlKey) && event.key === 's') {
          event.preventDefault();
          saveCurrentContent();
          return true;
        }
        
        // Cmd+Enter (Mac) or Ctrl+Enter (Windows/Linux) to add new paragraph
        if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
          event.preventDefault();
          editor?.commands.enter();
          return true;
        }
        
        return false;
      },
    },
  });

  // Enhanced scroll handling for title opacity with smooth transitions
  const handleScroll = useCallback(() => {
    // Find the actual scrollable container
    const editorElement = editor?.view?.dom;
    if (!editorElement) return;
    
    // Find the scrollable parent container - try different overflow values
    let scrollableContainer = editorElement.parentElement;
    while (scrollableContainer && 
           getComputedStyle(scrollableContainer).overflowY !== 'auto' &&
           getComputedStyle(scrollableContainer).overflowY !== 'scroll' &&
           getComputedStyle(scrollableContainer).overflow !== 'auto' &&
           getComputedStyle(scrollableContainer).overflow !== 'scroll') {
      scrollableContainer = scrollableContainer.parentElement;
    }
    
    if (!scrollableContainer) {
      return;
    }
    
    const scrollTop = scrollableContainer.scrollTop;
    const maxScroll = scrollableContainer.scrollHeight - scrollableContainer.clientHeight;
    

    
    // Calculate opacity based on scroll position with smooth transition
    // Start fading when scroll > 50px, fully faded at 200px
    const fadeStart = 50;
    const fadeEnd = 200;
    
    let newOpacity;
    if (scrollTop <= fadeStart) {
      newOpacity = 0.95;
    } else if (scrollTop >= fadeEnd) {
      newOpacity = 0.15;
    } else {
      // Smooth transition between fadeStart and fadeEnd
      const fadeProgress = (scrollTop - fadeStart) / (fadeEnd - fadeStart);
      newOpacity = 0.95 - (fadeProgress * 0.8); // 0.95 to 0.15
    }
    
    setTitleOpacity(newOpacity);
  }, [editor]);

  // Auto-save handler to avoid circular dependency
  const handleAutoSave = useCallback(async (content: string) => {
    if (isSaving) return;
    
    isAutoSavingRef.current = true;
    setIsSaving(true);
    
    try {
      const titleToSave = narrativeState.title || 'New Narrative';
      
      // Determine what to save based on current mode
      const contentToSave = isDraftMode ? narrativeState.mainContent : content;
      const draftContentToSave = isDraftMode ? content : narrativeState.draftContent;
      
      // Skip save if content is empty (but always save title)
      if (!contentToSave || contentToSave.trim() === '' || contentToSave === '<p></p>') {
        // Still save if we have a title to preserve
        if (titleToSave && titleToSave !== 'New Narrative') {
          const response = await fetch('/api/narratives', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id: narrativeState.id,
              title: titleToSave,
              content: narrativeState.mainContent,
              draftContent: narrativeState.draftContent,
            }),
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.narrative) {
              // Don't trigger onNarrativeUpdate during auto-save to prevent cursor jumping
              // Only update local state
              setNarrativeState(prev => ({
                ...prev,
                id: data.narrative?.id || prev.id, // Update ID if a new narrative was created
                lastSaved: new Date(),
                hasUnsavedChanges: false
              }));
            }
          }
        }
        return;
      }
      
      const response = await fetch('/api/narratives', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: narrativeState.id,
          title: titleToSave,
          content: contentToSave,
          draftContent: draftContentToSave,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Auto-save failed: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setNarrativeState(prev => ({
          ...prev,
          id: data.narrative?.id || prev.id, // Update ID if a new narrative was created
          lastSaved: new Date(),
          hasUnsavedChanges: false
        }));
        
        // Trigger save feedback
        onSave?.();
        
        // Don't trigger onNarrativeUpdate during auto-save to prevent cursor jumping
        // Only update parent state on manual saves or mode switches
      }
    } catch (error) {
      // Silent error handling for privacy
    } finally {
      setIsSaving(false);
      isAutoSavingRef.current = false;
    }
  }, [isSaving, narrativeState, isDraftMode, onSave]);

  // Unified save function - handles both main and draft content
  const saveNarrative = useCallback(async (content?: string) => {
    if (isSaving) return;
    
    setIsSaving(true);
    
    try {
      // Get current editor content if not provided
      const currentContent = content || editor?.getHTML() || '';
      const titleToSave = narrativeState.title || 'New Narrative';
      
      // Determine what to save based on current mode
      const contentToSave = isDraftMode ? narrativeState.mainContent : currentContent;
      const draftContentToSave = isDraftMode ? currentContent : narrativeState.draftContent;
      
      // Skip save if content is empty (but always save title)
      if (!contentToSave || contentToSave.trim() === '' || contentToSave === '<p></p>') {
        // Still save if we have a title to preserve
        if (titleToSave && titleToSave !== 'New Narrative') {
          const response = await fetch('/api/narratives', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id: narrativeState.id,
              title: titleToSave,
              content: narrativeState.mainContent,
              draftContent: narrativeState.draftContent,
            }),
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.narrative) {
              // Update local state with the returned narrative data
              setNarrativeState(prev => ({
                ...prev,
                id: data.narrative?.id || prev.id, // Update ID if a new narrative was created
                lastSaved: new Date(),
                hasUnsavedChanges: false
              }));
              
              // Only update parent state if this is a manual save (not auto-save)
              if (content) {
                onNarrativeUpdate(data.narrative);
              }
            }
          }
        }
        return;
      }
      
      const response = await fetch('/api/narratives', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: narrativeState.id,
          title: titleToSave,
          content: contentToSave,
          draftContent: draftContentToSave,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Save failed: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setNarrativeState(prev => ({
          ...prev,
          id: data.narrative?.id || prev.id, // Update ID if a new narrative was created
          lastSaved: new Date(),
          hasUnsavedChanges: false
        }));
        
        // Trigger save feedback
        onSave?.();
        
        // Only update parent state if this is a manual save (not auto-save)
        if (content && data.narrative) {
          onNarrativeUpdate(data.narrative);
        }
      }
    } catch (error) {
      // Silent error handling for privacy
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, narrativeState, isDraftMode, onSave, onNarrativeUpdate, editor]);

  // Add scroll listener to the actual scrollable container
  useEffect(() => {
    // Wait for the editor to be ready
    if (!editor) return;
    
    // Find the actual scrollable container - it's the parent of the TipTap editor
    const editorElement = editor.view?.dom;
    if (!editorElement) {
      return;
    }
    

    
    // Find the scrollable parent container - try different overflow values
    let scrollableContainer = editorElement.parentElement;
    while (scrollableContainer && 
           getComputedStyle(scrollableContainer).overflowY !== 'auto' &&
           getComputedStyle(scrollableContainer).overflowY !== 'scroll' &&
           getComputedStyle(scrollableContainer).overflow !== 'auto' &&
           getComputedStyle(scrollableContainer).overflow !== 'scroll') {
      scrollableContainer = scrollableContainer.parentElement;
    }
    
    if (!scrollableContainer) {
      return;
    }
    
    // Add scroll listener to the actual scrollable container
    scrollableContainer.addEventListener('scroll', handleScroll, { passive: true });
    
    // Initial opacity calculation
    handleScroll();
    
    return () => {
      scrollableContainer.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll, editor]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  // Load narrative data when currentNarrative changes
  useEffect(() => {
    if (currentNarrative) {
      setNarrativeState(prev => {
        // Only update title if we're loading a different narrative
        const shouldUpdateTitle = prev.id !== currentNarrative.id;
        
        return {
          id: currentNarrative.id,
          title: shouldUpdateTitle ? (currentNarrative.title || '') : prev.title,
          mainContent: currentNarrative.content || '',
          draftContent: currentNarrative.draftContent || '',
          lastSaved: null,
          hasUnsavedChanges: prev.id === currentNarrative.id ? prev.hasUnsavedChanges : false
        };
      });
    } else {
      // Reset to default state when no narrative is selected
      setNarrativeState({
        id: null,
        title: 'New Narrative',
        mainContent: '',
        draftContent: '',
        lastSaved: null,
        hasUnsavedChanges: false
      });
      
      if (editor) {
        editor.commands.setContent('<p></p>', false);
      }
    }
  }, [currentNarrative, editor]);

  // Separate effect to handle content loading based on mode changes
  useEffect(() => {
    if (currentNarrative && editor && !isAutoSavingRef.current) {
      // Load the appropriate content into the editor based on current mode
      const contentToLoad = isDraftMode 
        ? currentNarrative.draftContent || '<p></p>'
        : currentNarrative.content || '<p></p>';
      
      // Only update editor content if it's actually different from current content
      // This prevents losing user input when auto-save triggers a re-render
      const currentEditorContent = editor.getHTML();
      
      // Normalize content for comparison to avoid whitespace differences
      const normalizeContent = (content: string) => {
        return content.replace(/\s+/g, ' ').trim();
      };
      
      const normalizedCurrent = normalizeContent(currentEditorContent);
      const normalizedToLoad = normalizeContent(contentToLoad);
      
      if (normalizedCurrent !== normalizedToLoad) {
        // Preserve cursor position by storing it before content update
        const { from, to } = editor.state.selection;
        
        editor.commands.setContent(contentToLoad, false);
        
        // Restore cursor position if it's still valid
        try {
          const newState = editor.state;
          if (from <= newState.doc.content.size && to <= newState.doc.content.size) {
            editor.commands.setTextSelection({ from, to });
          }
        } catch (error) {
          // If cursor position is invalid, just place it at the end
          editor.commands.focus('end');
        }
      }
    }
  }, [currentNarrative, editor, isDraftMode]);

  // Function to add text to the appropriate content (main or draft)
  const addTextToContent = useCallback((text: string) => {
    if (!editor) return;
    
    // Check if the text contains multiple paragraphs (has double newlines)
    const hasMultipleParagraphs = text.includes('\n\n') || text.split('\n').filter(line => line.trim().length > 0).length > 1;
    
    if (hasMultipleParagraphs) {
      // If multiple paragraphs, insert each line as a new paragraph
      const lines = text.split('\n').filter(line => line.trim().length > 0);
      lines.forEach((line, index) => {
        if (index === 0) {
          // Replace current content with first line
          editor.commands.setContent(`<p>${line}</p>`, false);
        } else {
          // Add subsequent lines as new paragraphs
          editor.commands.enter();
          editor.commands.insertContent(line);
        }
      });
    } else {
      // If single paragraph, just insert the text at cursor position
      editor.commands.insertContent(text.trim());
    }
    
    // Update state based on current mode
    setNarrativeState(prev => ({
      ...prev,
      ...(isDraftMode 
        ? { draftContent: editor.getHTML() }
        : { mainContent: editor.getHTML() }
      ),
      hasUnsavedChanges: true
    }));
  }, [isDraftMode, editor]);

  // Implemented save function
  const saveCurrentContent = async () => {
    if (!editor) return;
    await saveNarrative();
  };

  const handleModeSwitch = useCallback(async () => {
    if (!editor) return;
    
    // Save current content before switching (title is preserved in narrativeState)
    const currentContent = editor.getHTML();
    await saveNarrative(currentContent);
    
    // Toggle the mode
    const newMode = !isDraftMode;
    setIsDraftMode(newMode);
    
    // Load the appropriate content for the new mode (title remains unchanged)
    const contentToLoad = newMode 
      ? narrativeState.draftContent || '<p></p>'
      : narrativeState.mainContent || '<p></p>';
    
    // Use setContent with preserveWhitespace to maintain history better
    editor.commands.setContent(contentToLoad, false);
  }, [editor, isDraftMode, narrativeState, saveNarrative, setIsDraftMode]);

  // Expose functions to parent component via ref
  useImperativeHandle(ref, () => ({
    addTextToContent,
    saveCurrentContent,
    handleModeSwitch
  }), [addTextToContent, saveCurrentContent, handleModeSwitch]);

  return (
    <div className="h-full flex flex-col bg-[#141414]">
      {/* Title and Editor Content grouped for unified nudge */}
      <div className="narrative-content-wrapper pt-6 pl-4 h-full flex flex-col">
        <div className="w-[664px] mx-auto">
          {/* Title is independent of mode changes - remains the same in both draft and main modes */}
          <div className="relative">
            <input
              type="text"
              className="narrative-title text-xl font-semibold text-white outline-none border-none bg-transparent w-full transition-all duration-200 px-6"
              value={narrativeState.title}
              onChange={e => {
                const newTitle = e.target.value;
                setNarrativeState(prev => ({
                  ...prev,
                  title: newTitle,
                  hasUnsavedChanges: true
                }));
                
                // Use the same auto-save mechanism as the main editor
                if (saveTimeoutRef.current) {
                  clearTimeout(saveTimeoutRef.current);
                }
                
                saveTimeoutRef.current = setTimeout(() => {
                  handleAutoSave(editor?.getHTML() || '');
                }, 500);
              }}
              onBlur={async e => {
                const trimmedTitle = e.target.value.trim();
                setNarrativeState(prev => ({
                  ...prev,
                  title: trimmedTitle
                }));
                setIsTitleFocused(false);
                
                // Recalculate opacity based on current scroll position
                handleScroll();
                
                // Clear any pending timeout and save immediately
                if (saveTimeoutRef.current) {
                  clearTimeout(saveTimeoutRef.current);
                }
                
                // Save immediately when title loses focus
                await handleAutoSave(editor?.getHTML() || '');
              }}
              onMouseEnter={() => {
                if (titleOpacity < 1) {
                  setTitleOpacity(0.95);
                }
              }}
              onMouseLeave={() => {
                if (!isTitleFocused) {
                  // Recalculate opacity based on current scroll position
                  handleScroll();
                }
              }}
              onFocus={() => {
                setIsTitleFocused(true);
                setTitleOpacity(0.95);
              }}
              placeholder="New Narrative"
              style={{ 
                fontFamily: 'var(--font-eczar), Georgia, "Times New Roman", serif',
                minHeight: '1.5rem',
                opacity: titleOpacity,
                transition: 'opacity 0.3s ease-out',
                cursor: titleOpacity < 0.95 ? 'pointer' : 'text'
              }}
            />
          </div>
        </div>
        {/* Editor Content */}
        <div className="flex-1 overflow-hidden min-h-0 relative">
          <div className="w-[664px] mx-auto h-full relative">
            <div 
              ref={scrollContainerRef}
              className="absolute inset-0 overflow-y-auto scrollbar-hide"
            >
              <EditorContent 
                editor={editor} 
                className="narrative-editor bg-[#141414] h-full"
              />
              {/* Gradient mask overlay at the top of the editor */}
              <div 
                className="absolute top-0 left-0 right-0 h-8 pointer-events-none z-10"
                style={{
                  background: 'linear-gradient(to bottom, #141414 0%, rgba(20, 20, 20, 0.8) 50%, rgba(20, 20, 20, 0) 100%)'
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

NarrativePanel.displayName = 'NarrativePanel';

export default NarrativePanel;
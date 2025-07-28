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
 * - Tab: Insert tab character
 * - Shift+Tab: Remove indentation (outdent)
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
  preferredMode?: 'draft' | 'main';
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
  title: string; // Independent of mode changes - same in both main and draft modes
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
  
  // Cursor position tracking for both modes
  const cursorPositionsRef = useRef<{
    draft: { from: number; to: number } | null;
    main: { from: number; to: number } | null;
  }>({
    draft: null,
    main: null
  });

  // Helper function to get editor content - defined before editor to avoid hoisting issues
  const getEditorContent = (editor: any): string => {
    if (!editor) return '';
    return editor.getHTML();
  };

  const editor = useEditor({
    extensions: [
      Document,
      Paragraph.configure({
        HTMLAttributes: {
          class: '',
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
    parseOptions: {
      preserveWhitespace: true,
    },
    onUpdate: ({ editor }) => {
      // Get content from editor
      const content = getEditorContent(editor);
      
      // Store current cursor position for the current mode
      if (editor && editor.state && editor.state.selection) {
        const { from, to } = editor.state.selection;
        if (isDraftMode) {
          cursorPositionsRef.current.draft = { from, to };
        } else {
          cursorPositionsRef.current.main = { from, to };
        }
      }
      
      // Debounce state updates to prevent cursor jumping during rapid typing
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      
      updateTimeoutRef.current = setTimeout(() => {
        // Update the appropriate content based on current mode
        setNarrativeState(prev => ({
          ...prev,
          ...(isDraftMode 
            ? { mainContent: content }
            : { draftContent: content }
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
        class: 'max-w-none focus:outline-none',
        style: 'height: 100%; overflow: visible; white-space: pre-wrap;',
      },
      handleKeyDown: (view, event) => {
        // Custom keyboard shortcuts for the narrative editor
        const { state, dispatch } = view;
        
        // Tab key - insert tab character instead of moving focus
        if (event.key === 'Tab') {
          event.preventDefault();
          
          if (event.shiftKey) {
            // Shift+Tab: Remove indentation (outdent)
            const { from, to } = state.selection;
            const lineStart = state.doc.resolve(from).start();
            const lineEnd = state.doc.resolve(from).end();
            const lineContent = state.doc.textBetween(lineStart, lineEnd);
            
            // Check if line starts with indentation (tabs, spaces, or non-breaking spaces)
            const indentationMatch = lineContent.match(/^(\t{1,4}|\u00A0{1,4}|\s{1,4})/);
            if (indentationMatch) {
              const indentLength = indentationMatch[1].length;
              const newFrom = from - indentLength;
              const newTo = to - indentLength;
              
              // Remove the indentation
              editor?.chain()
                .setTextSelection({ from: lineStart, to: lineStart + indentLength })
                .deleteSelection()
                .setTextSelection({ from: newFrom, to: newTo })
                .run();
            }
          } else {
            // Regular Tab: Insert tab character
            editor?.commands.insertContent('\t');
          }
          
          return true;
        }
        
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

  // Save title immediately when user clicks away
  const saveTitle = useCallback(async () => {
    if (isSaving) return;
    
    setIsSaving(true);
    
    try {
      const titleToSave = narrativeState.title || 'New Narrative';
      
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

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Title save failed: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setNarrativeState(prev => ({
          ...prev,
          lastSaved: new Date(),
          hasUnsavedChanges: false
        }));
        
        // Trigger save feedback
        onSave?.();
        
        // Update parent state for title changes
        onNarrativeUpdate(data.narrative);
      }
    } catch (error) {
      // Silent error handling for privacy
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, narrativeState, onSave, onNarrativeUpdate]);

  // Save body content immediately when user clicks away
  const saveBody = useCallback(async () => {
    if (isSaving) return;
    
    setIsSaving(true);
    
    try {
      const currentContent = editor ? getEditorContent(editor) : '';
      const titleToSave = narrativeState.title || 'New Narrative';
      
      // Determine what to save based on current mode
      const contentToSave = isDraftMode ? currentContent : narrativeState.mainContent;
      const draftContentToSave = isDraftMode ? narrativeState.draftContent : currentContent;
      
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
          preferredMode: isDraftMode ? 'draft' : 'main',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Body save failed: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setNarrativeState(prev => ({
          ...prev,
          lastSaved: new Date(),
          hasUnsavedChanges: false
        }));
        
        // Trigger save feedback
        onSave?.();
        
        // Update parent state for body changes
        onNarrativeUpdate(data.narrative);
      }
    } catch (error) {
      // Silent error handling for privacy
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, narrativeState, isDraftMode, onSave, onNarrativeUpdate, editor]);

  // Auto-save handler to avoid circular dependency
  const handleAutoSave = useCallback(async (content: string) => {
    if (isSaving) return;
    
    isAutoSavingRef.current = true;
    setIsSaving(true);
    
    try {
      const titleToSave = narrativeState.title || 'New Narrative';
      
      // Determine what to save based on current mode
      const contentToSave = isDraftMode ? content : narrativeState.mainContent;
      const draftContentToSave = isDraftMode ? narrativeState.draftContent : content;
      
      // Skip save if content is empty (but always save title)
      const contentToCheck = contentToSave || '';
      if (!contentToSave || contentToCheck.trim() === '' || contentToCheck === '<p></p>') {
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
              // Update local state
              setNarrativeState(prev => ({
                ...prev,
                id: data.narrative?.id || prev.id, // Update ID if a new narrative was created
                lastSaved: new Date(),
                hasUnsavedChanges: false
              }));
              
              // For title-only saves, we can safely update parent state without cursor jumping
              onNarrativeUpdate(data.narrative);
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
  }, [isSaving, narrativeState, isDraftMode, onSave, onNarrativeUpdate]);

  // Unified save function - handles both draft and main content
  const saveNarrative = useCallback(async (content?: string) => {
    if (isSaving) return;
    
    setIsSaving(true);
    
    try {
      // Get current editor content if not provided
      const currentContent = content || (editor ? getEditorContent(editor) : '') || '';
      const titleToSave = narrativeState.title || 'New Narrative';
      
      // Determine what to save based on current mode
      const contentToSave = isDraftMode ? currentContent : narrativeState.mainContent;
      const draftContentToSave = isDraftMode ? narrativeState.draftContent : currentContent;
      
      // Skip save if content is empty (but always save title)
      const contentToCheck = contentToSave || '';
      if (!contentToSave || contentToCheck.trim() === '' || contentToCheck === '<p></p>') {
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
              preferredMode: isDraftMode ? 'draft' : 'main',
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
          preferredMode: isDraftMode ? 'draft' : 'main',
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
      
      // Reset cursor positions when switching to a new narrative
      if (narrativeState.id !== currentNarrative.id) {
        cursorPositionsRef.current = {
          draft: null,
          main: null
        };
      }
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
      
      // Reset cursor positions
      cursorPositionsRef.current = {
        draft: null,
        main: null
      };
      
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
        ? currentNarrative.content || '<p></p>'
        : currentNarrative.draftContent || '<p></p>';
      
      // Only update editor content if it's actually different from current content
      // This prevents losing user input when auto-save triggers a re-render
      const currentEditorContent = editor.getHTML();
      
      // Simple content comparison
      if (currentEditorContent !== contentToLoad) {
        // Store current cursor position before content update
        const { from, to } = editor.state.selection;
        if (isDraftMode) {
          cursorPositionsRef.current.draft = { from, to };
        } else {
          cursorPositionsRef.current.main = { from, to };
        }
        
        // Set the content with whitespace preservation
        editor.commands.setContent(contentToLoad, false, { preserveWhitespace: true });
        
        // Try to restore the stored cursor position for this mode
        const storedPosition = isDraftMode 
          ? cursorPositionsRef.current.draft 
          : cursorPositionsRef.current.main;
        
        if (storedPosition) {
          try {
            const newState = editor.state;
            if (storedPosition.from <= newState.doc.content.size && storedPosition.to <= newState.doc.content.size) {
              editor.commands.setTextSelection({ 
                from: storedPosition.from, 
                to: storedPosition.to 
              });
            } else {
              // If stored position is invalid, place cursor at the end
              editor.commands.focus('end');
            }
          } catch (error) {
            // If cursor position is invalid, just place it at the end
            editor.commands.focus('end');
          }
        } else {
          // If no stored position, place cursor at the end
          editor.commands.focus('end');
        }
      }
    }
  }, [currentNarrative, editor, isDraftMode]);

  // Function to add text to the appropriate content (draft or main)
  const addTextToContent = useCallback((text: string) => {
    if (!editor) return;
    
    // Check if the text contains multiple paragraphs (has double newlines)
    const hasMultipleParagraphs = text.includes('\n\n') || text.split('\n').filter(line => line.trim().length > 0).length > 1;
    
    if (hasMultipleParagraphs) {
      // Split by double newlines to preserve paragraph structure
      const paragraphs = text.split('\n\n').filter(paragraph => paragraph.trim().length > 0);
      
      paragraphs.forEach((paragraph, paragraphIndex) => {
        if (paragraphIndex > 0) {
          // Add paragraph break between paragraphs
          editor.commands.enter();
        }
        
        // Convert paragraph to HTML to preserve line breaks within paragraphs
        const lines = paragraph.split('\n').filter(line => line.trim().length > 0);
        const htmlContent = `<p>${lines.join('<br>')}</p>`;
        
        // Insert as HTML to preserve formatting
        editor.commands.insertContent(htmlContent);
      });
    } else {
      // If single paragraph, convert to HTML to preserve line breaks
      const lines = text.split('\n').filter(line => line.trim().length > 0);
      const htmlContent = `<p>${lines.join('<br>')}</p>`;
      editor.commands.insertContent(htmlContent);
    }
    
    // Update state based on current mode
    setNarrativeState(prev => ({
      ...prev,
      ...(isDraftMode 
        ? { mainContent: getEditorContent(editor) }
        : { draftContent: getEditorContent(editor) }
      ),
      hasUnsavedChanges: true
    }));
  }, [isDraftMode, editor]);

  // Implemented save function
  const saveCurrentContent = async () => {
    if (!editor) return;
    await saveNarrative(getEditorContent(editor));
  };

  const handleModeSwitch = useCallback(async () => {
    if (!editor) return;
    
    // Save current content before switching (title is preserved in narrativeState)
    const currentContent = getEditorContent(editor);
    await saveNarrative(currentContent);
    
    // Store current cursor position before switching
    const { from, to } = editor.state.selection;
    if (isDraftMode) {
      cursorPositionsRef.current.draft = { from, to };
    } else {
      cursorPositionsRef.current.main = { from, to };
    }
    
    // Toggle the mode
    const newMode = !isDraftMode;
    setIsDraftMode(newMode);
    
    // Load the appropriate content for the new mode (title remains unchanged)
    const contentToLoad = newMode 
      ? narrativeState.mainContent || '<p></p>'
      : narrativeState.draftContent || '<p></p>';
    
    // Set content with whitespace preservation
    editor.commands.setContent(contentToLoad, false, { preserveWhitespace: true });
    
    // Restore the previously stored cursor position for this mode
    const storedPosition = newMode 
      ? cursorPositionsRef.current.draft 
      : cursorPositionsRef.current.main;
    
    if (storedPosition) {
      try {
        const newState = editor.state;
        if (storedPosition.from <= newState.doc.content.size && storedPosition.to <= newState.doc.content.size) {
          editor.commands.setTextSelection({ 
            from: storedPosition.from, 
            to: storedPosition.to 
          });
        } else {
          // If stored position is invalid, place cursor at the end
          editor.commands.focus('end');
        }
      } catch (error) {
        // If cursor position is invalid, just place it at the end
        editor.commands.focus('end');
      }
    } else {
      // If no stored position, place cursor at the end
      editor.commands.focus('end');
    }
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
          {/* Title is independent of mode changes - remains the same in both main and draft modes */}
          <div className="relative">
            <input
              type="text"
                              className="narrative-title text-2xl font-surt-semibold text-white outline-none border-none bg-transparent w-full transition-all duration-200 px-6"
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
                  handleAutoSave(editor ? getEditorContent(editor) : '');
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
                
                // Clear any pending timeout
                if (saveTimeoutRef.current) {
                  clearTimeout(saveTimeoutRef.current);
                }
                
                // Save title immediately when user clicks away
                await saveTitle();
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
                fontFamily: 'var(--font-apoc-revelations-ultrabold), serif',
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
              onBlur={async () => {
                // Clear any pending timeout
                if (saveTimeoutRef.current) {
                  clearTimeout(saveTimeoutRef.current);
                }
                
                // Save body content immediately when user clicks away
                await saveBody();
              }}
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
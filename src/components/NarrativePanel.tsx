'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
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
  const [titleOpacity, setTitleOpacity] = useState(1);
  const [isTitleFocused, setIsTitleFocused] = useState(false);
  
  // Essential refs only
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const titleSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Simplified scroll handling for title opacity
  const handleScroll = useCallback(() => {
    const scrollContainer = scrollContainerRef.current;
    const scrollTop = scrollContainer?.scrollTop || 0;
    
    setTitleOpacity(scrollTop > 0 ? 0.4 : 0.95);
  }, []);

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
    ],
    content: '<p>Start your story here...</p>',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none',
        style: 'height: 100%; overflow: visible;',
      },
    },
    onUpdate: ({ editor }) => {
      const content = editor.getHTML();
      
      // Update the appropriate content based on current mode
      setNarrativeState(prev => ({
        ...prev,
        ...(isDraftMode 
          ? { draftContent: content }
          : { mainContent: content }
        ),
        hasUnsavedChanges: true
      }));
      
      // Auto-save functionality
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      saveTimeoutRef.current = setTimeout(() => {
        handleAutoSave(content);
      }, 500);
    },
  });

  // Auto-save handler to avoid circular dependency
  const handleAutoSave = useCallback(async (content: string) => {
    if (isSaving) return;
    
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
          lastSaved: new Date(),
          hasUnsavedChanges: false
        }));
        
        // Trigger save feedback
        onSave?.();
        
        // Update parent state with the saved narrative
        if (data.narrative) {
          onNarrativeUpdate(data.narrative);
        }
      }
    } catch (error) {
      // Silent error handling for privacy
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, narrativeState, isDraftMode, onSave, onNarrativeUpdate]);

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
        throw new Error(`Save failed: ${response.status} ${errorText}`);
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
        
        // Update parent state with the saved narrative
        if (data.narrative) {
          onNarrativeUpdate(data.narrative);
        }
      }
    } catch (error) {
      // Silent error handling for privacy
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, narrativeState, isDraftMode, onSave, onNarrativeUpdate, editor]);

  // Add scroll listener to the scroll container
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;
    
    scrollContainer.addEventListener('scroll', handleScroll);
    
    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (titleSaveTimeoutRef.current) {
        clearTimeout(titleSaveTimeoutRef.current);
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
        editor.commands.setContent('<p></p>');
      }
    }
  }, [currentNarrative, editor]);

  // Separate effect to handle content loading based on mode changes
  useEffect(() => {
    if (currentNarrative && editor) {
      // Load the appropriate content into the editor based on current mode
      const contentToLoad = isDraftMode 
        ? currentNarrative.draftContent || '<p></p>'
        : currentNarrative.content || '<p></p>';
      
      // Only update editor content if it's actually different from current content
      // This prevents losing user input when auto-save triggers a re-render
      const currentEditorContent = editor.getHTML();
      if (currentEditorContent !== contentToLoad) {
        editor.commands.setContent(contentToLoad);
      }
    }
  }, [currentNarrative, editor, isDraftMode]);

  // Function to add text to the appropriate content (main or draft)
  const addTextToContent = useCallback((text: string) => {
    if (!editor) return;
    
    // Check if the text contains multiple paragraphs (has double newlines)
    const hasMultipleParagraphs = text.includes('\n\n') || text.split('\n').filter(line => line.trim().length > 0).length > 1;
    
    let formattedText;
    if (hasMultipleParagraphs) {
      // If multiple paragraphs, wrap each non-empty line in <p> tags
      formattedText = text
        .split('\n')
        .filter(line => line.trim().length > 0)
        .map(line => `<p>${line}</p>`)
        .join('');
    } else {
      // If single paragraph, just add the text without wrapping in <p> tags
      formattedText = text.trim();
    }
    
    // Update state based on current mode
    setNarrativeState(prev => ({
      ...prev,
      ...(isDraftMode 
        ? { draftContent: prev.draftContent.replace(/<\/p>$/, formattedText) }
        : { mainContent: prev.mainContent.replace(/<\/p>$/, formattedText) }
      ),
      hasUnsavedChanges: true
    }));
    
    // Update editor content
    const currentContent = editor.getHTML();
    const newContent = currentContent.replace(/<\/p>$/, formattedText);
    editor.commands.setContent(newContent);
  }, [isDraftMode, editor]);

  // Implemented save function
  const saveCurrentContent = async () => {
    if (!editor) return;
    await saveNarrative();
  };

  const handleModeSwitch = useCallback(async () => {
    if (!editor) return;
    
    console.log('Mode switch - before save:', {
      currentTitle: narrativeState.title,
      isDraftMode,
      hasUnsavedChanges: narrativeState.hasUnsavedChanges
    });
    
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
    
    editor.commands.setContent(contentToLoad);
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
        <div className="max-w-[42em] mx-auto px-6" style={{ 
          marginLeft: 'calc(max(0px, 50% - 21em - 4px))'
        }}>
          {/* Title is independent of mode changes - remains the same in both draft and main modes */}
          <div className="relative">
            <input
              type="text"
              className="narrative-title text-xl font-semibold text-white outline-none border-none bg-transparent w-full transition-all duration-200"
              value={narrativeState.title}
              onChange={e => {
                const newTitle = e.target.value;
                setNarrativeState(prev => ({
                  ...prev,
                  title: newTitle,
                  hasUnsavedChanges: true
                }));
                
                // Clear any existing timeout
                if (titleSaveTimeoutRef.current) {
                  clearTimeout(titleSaveTimeoutRef.current);
                }
                
                // Set a new timeout to save the title after a delay
                titleSaveTimeoutRef.current = setTimeout(async () => {
                  if (newTitle && newTitle !== 'New Narrative' && newTitle !== currentNarrative?.title) {
                    try {
                      const response = await fetch('/api/narratives', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          id: narrativeState.id,
                          title: newTitle,
                          content: narrativeState.mainContent,
                          draftContent: narrativeState.draftContent,
                        }),
                      });
                      
                      if (response.ok) {
                        const data = await response.json();
                        if (data.success && data.narrative) {
                          // Only update parent state if the narrative ID is different or if we don't have an ID yet
                          // This prevents unnecessary re-renders that could cause content loss
                          if (!narrativeState.id || data.narrative.id !== narrativeState.id) {
                            onNarrativeUpdate(data.narrative);
                          }
                          setNarrativeState(prev => ({
                            ...prev,
                            lastSaved: new Date(),
                            hasUnsavedChanges: false
                          }));
                          // Trigger save feedback for green button effect
                          onSave?.();
                        }
                      }
                    } catch (error) {
                      // Silent error handling for privacy
                    }
                  }
                }, 1000); // Save after 1 second of no typing
              }}
              onBlur={async e => {
                const trimmedTitle = e.target.value.trim();
                setNarrativeState(prev => ({
                  ...prev,
                  title: trimmedTitle
                }));
                setIsTitleFocused(false);
                
                const scrollContainer = scrollContainerRef.current;
                const scrollTop = scrollContainer?.scrollTop || 0;
                setTitleOpacity(scrollTop > 0 ? 0.4 : 0.95);
                
                // Clear any pending timeout
                if (titleSaveTimeoutRef.current) {
                  clearTimeout(titleSaveTimeoutRef.current);
                }
                
                // Save immediately when title is changed
                if (trimmedTitle && trimmedTitle !== 'New Narrative' && trimmedTitle !== currentNarrative?.title) {
                  try {
                    const response = await fetch('/api/narratives', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        id: narrativeState.id,
                        title: trimmedTitle,
                        content: narrativeState.mainContent,
                        draftContent: narrativeState.draftContent,
                      }),
                    });
                    
                    if (response.ok) {
                      const data = await response.json();
                      if (data.success && data.narrative) {
                        // Only update parent state if the narrative ID is different or if we don't have an ID yet
                        // This prevents unnecessary re-renders that could cause content loss
                        if (!narrativeState.id || data.narrative.id !== narrativeState.id) {
                          onNarrativeUpdate(data.narrative);
                        }
                        setNarrativeState(prev => ({
                          ...prev,
                          lastSaved: new Date(),
                          hasUnsavedChanges: false
                        }));
                        // Trigger save feedback for green button effect
                        onSave?.();
                      }
                    }
                  } catch (error) {
                    // Silent error handling for privacy
                  }
                }
              }}
              onMouseEnter={() => {
                if (titleOpacity < 1) {
                  setTitleOpacity(0.95);
                }
              }}
              onMouseLeave={() => {
                if (!isTitleFocused) {
                  const scrollContainer = scrollContainerRef.current;
                  const scrollTop = scrollContainer?.scrollTop || 0;
                  setTitleOpacity(scrollTop > 0 ? 0.4 : 0.95);
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
                transition: 'opacity 0.2s ease-in-out',
                cursor: titleOpacity < 1 ? 'pointer' : 'text'
              }}
            />
          </div>
        </div>
        {/* Editor Content */}
        <div className="flex-1 overflow-hidden min-h-0 relative">
          <div 
            ref={scrollContainerRef}
            className="absolute inset-0 overflow-y-auto"
          >
            <EditorContent 
              editor={editor} 
              className="narrative-editor bg-[#141414]"
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
  );
});

NarrativePanel.displayName = 'NarrativePanel';

export default NarrativePanel;
'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';

interface Narrative {
  id: string;
  title: string;
  content: string;
  draftContent?: string; // Optional draft content stored at the bottom
  created: string;
  lastModified: string;
  characterCount: number;
}

interface NarrativePanelProps {
  currentNarrative: Narrative | null;
  onNarrativeUpdate: (narrative: Narrative | null) => void;
  onAddToChat?: (text: string) => void;
  onSave?: () => void;
  isDraftMode: boolean;
  setIsDraftMode: (v: boolean) => void;
}

export interface NarrativePanelRef {
  addTextToContent: (text: string) => void;
  isDraftMode: boolean;
}

const NarrativePanel = forwardRef<NarrativePanelRef, NarrativePanelProps>(({ currentNarrative, onNarrativeUpdate, onAddToChat, onSave, isDraftMode, setIsDraftMode }, ref) => {
  const [narrativeTitle, setNarrativeTitle] = useState<string>('');
  const [currentNarrativeId, setCurrentNarrativeId] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveTimeoutRef] = useState<{ current: NodeJS.Timeout | null }>({ current: null });
  const [cursorPosition, setCursorPosition] = useState<{ from: number; to: number } | null>(null);
  const isUpdatingFromSaveRef = useRef(false);
  
  // DRAFT/MAIN toggle state
  const [draftContent, setDraftContent] = useState('');
  const [mainContent, setMainContent] = useState('');

  // Transition state for smooth animations
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Scroll state for title shrinking and opacity
  const [isTitleShrunk, setIsTitleShrunk] = useState(false);
  const [titleOpacity, setTitleOpacity] = useState(1);
  const [isTitleFocused, setIsTitleFocused] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Test state change
  useEffect(() => {
    console.log('titleOpacity changed to:', titleOpacity);
  }, [titleOpacity]);

  // Remove the event handler entirely - let's use CSS hover instead

  // Refs to access current state values in callbacks
  const draftContentRef = useRef(draftContent);
  const mainContentRef = useRef(mainContent);

  // Update refs when state changes
  useEffect(() => {
    draftContentRef.current = draftContent;
  }, [draftContent]);

  useEffect(() => {
    mainContentRef.current = mainContent;
  }, [mainContent]);

  // Handle scroll for title shrinking and opacity
  const handleScroll = useCallback(() => {
    // Check all possible scroll sources
    const tipTapElement = document.querySelector('.ProseMirror');
    const narrativeEditor = document.querySelector('.narrative-editor');
    const scrollContainer = scrollContainerRef.current;
    
    let scrollTop = 0;
    let scrollSource = 'none';
    
    if (tipTapElement && tipTapElement.scrollTop > 0) {
      scrollTop = tipTapElement.scrollTop;
      scrollSource = 'tipTap';
    } else if (narrativeEditor && narrativeEditor.scrollTop > 0) {
      scrollTop = narrativeEditor.scrollTop;
      scrollSource = 'narrativeEditor';
    } else if (scrollContainer && scrollContainer.scrollTop > 0) {
      scrollTop = scrollContainer.scrollTop;
      scrollSource = 'scrollContainer';
    } else if (window.scrollY > 0) {
      scrollTop = window.scrollY;
      scrollSource = 'window';
    }
    
    console.log('Scroll detected:', { scrollTop, scrollSource }); // Debug log
    setIsTitleShrunk(scrollTop > 40);
    
    // Control title opacity based on scroll position
    if (scrollTop > 0) {
      console.log('Setting opacity to 0.4'); // Debug log
      setTitleOpacity(0.4); // 40% opacity when scrolling
    } else {
      console.log('Setting opacity to 1'); // Debug log
      setTitleOpacity(1); // Full opacity when at top
    }
  }, []);



  const editor = useEditor({
    extensions: [
      StarterKit,
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
      // Store cursor position before autosave
      const { from, to } = editor.state.selection;
      setCursorPosition({ from, to });
      
      // Store content based on current mode
      const content = editor.getHTML();
      if (isDraftMode) {
        setDraftContent(content);
      } else {
        setMainContent(content);
      }
      
      // Auto-save functionality
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      saveTimeoutRef.current = setTimeout(() => {
        if (isDraftMode) {
          saveDraftContent();
        } else {
          saveNarrative();
        }
      }, 2000); // Auto-save after 2 seconds of inactivity
    },
  });



  // Handle side effects of draft mode changes
  useEffect(() => {
    if (!editor) return;
    
    // Start transition animation
    setIsTransitioning(true);
    
    // Fade out current content
    const fadeOutDuration = 200; // 200ms fade out for snappy transition
    
    setTimeout(() => {
      if (isDraftMode) {
        // Load draft content into editor with placeholder if empty
        const draftContentToLoad = draftContentRef.current || '<p class="is-editor-empty" data-placeholder="Start your draft here... Sketch your ideas, thoughts, and rough notes before moving them to the main narrative."></p>';
        editor.commands.setContent(draftContentToLoad);
        
        // Update placeholder for draft mode
        const placeholderExtension = editor.extensionManager.extensions.find(ext => ext.name === 'placeholder');
        if (placeholderExtension) {
          placeholderExtension.options.placeholder = 'Start your draft here... Sketch your ideas, thoughts, and rough notes before moving them to the main narrative.';
        }
      } else {
        // Load main content into editor
        editor.commands.setContent(mainContentRef.current || '<p></p>');
        
        // Update placeholder for main mode
        const placeholderExtension = editor.extensionManager.extensions.find(ext => ext.name === 'placeholder');
        if (placeholderExtension) {
          placeholderExtension.options.placeholder = 'Begin writing your narrative here... Share your thoughts, insights, and the story that emerges from your exploration.';
        }
      }
      
      // Fade in new content immediately after content is loaded
      setIsTransitioning(false);
    }, fadeOutDuration);
  }, [isDraftMode, editor]);

  // Add scroll listener after editor is ready
  useEffect(() => {
    if (!editor) return;
    
    // Wait a bit for the editor to be fully rendered
    const timeoutId = setTimeout(() => {
      // Try multiple possible scrollable elements
      const tipTapElement = document.querySelector('.ProseMirror');
      const narrativeEditor = document.querySelector('.narrative-editor');
      const scrollContainer = scrollContainerRef.current;
      
      console.log('Found elements:', {
        tipTap: !!tipTapElement,
        narrativeEditor: !!narrativeEditor,
        scrollContainer: !!scrollContainer
      });
      
      // Add listeners to all possible scrollable elements
      const elements = [tipTapElement, narrativeEditor, scrollContainer].filter(Boolean);
      
      elements.forEach(element => {
        if (element) {
          console.log('Adding scroll listener to:', element.className || element.tagName);
          element.addEventListener('scroll', handleScroll);
        }
      });
      
      // Also add to window as fallback
      window.addEventListener('scroll', handleScroll);
      
      // Cleanup function
      return () => {
        elements.forEach(element => {
          if (element) {
            element.removeEventListener('scroll', handleScroll);
          }
        });
        window.removeEventListener('scroll', handleScroll);
      };
    }, 200);
    
    return () => clearTimeout(timeoutId);
  }, [editor, handleScroll]);

  const copyFromDraftToMain = useCallback(() => {
    if (!editor || !isDraftMode) return;
    
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to);
    
    if (selectedText.trim()) {
      // Add to main content by appending to the existing paragraph
      setMainContent(prevContent => {
        const newMainContent = prevContent.replace(/<\/p>$/, ` ${selectedText}</p>`);
        return newMainContent;
      });
        
      // Don't remove from draft content - just copy it
      // The selected text remains in the draft
        
      // Show feedback
      showCopyFeedback();
    }
  }, [editor]);

  // Load narrative data when currentNarrative changes
  useEffect(() => {
    if (currentNarrative) {
      setNarrativeTitle(currentNarrative.title || '');
      setCurrentNarrativeId(currentNarrative.id);
      setMainContent(currentNarrative.content || '');
      setDraftContent(currentNarrative.draftContent || '');
      
      // Load the appropriate content into the editor
      if (editor) {
        if (isDraftMode) {
          editor.commands.setContent(currentNarrative.draftContent || '<p></p>');
        } else {
          editor.commands.setContent(currentNarrative.content || '<p></p>');
        }
      }
    } else {
      // Reset to default state when no narrative is selected
      setNarrativeTitle('');
      setCurrentNarrativeId(null);
      setMainContent('');
      setDraftContent('');
      setLastSaved(null);
      
      if (editor) {
        editor.commands.setContent('<p></p>');
      }
    }
  }, [currentNarrative, editor, isDraftMode]);

  // Restore cursor position after content updates
  useEffect(() => {
    if (cursorPosition && editor && !isUpdatingFromSaveRef.current) {
      try {
        const { from, to } = cursorPosition;
        const docSize = editor.state.doc.content.size;
        
        // Ensure cursor position is within document bounds
        const safeFrom = Math.min(from, docSize);
        const safeTo = Math.min(to, docSize);
        
        editor.commands.setTextSelection({ from: safeFrom, to: safeTo });
      } catch (error) {
        // Silently handle cursor restoration errors
      }
    }
  }, [cursorPosition, editor]);

  const saveNarrative = async () => {
    if (!editor || isUpdatingFromSaveRef.current) return;
    
    setIsSaving(true);
    isUpdatingFromSaveRef.current = true;
    
    try {
      const content = editor.getHTML();
      const titleToSave = narrativeTitle || 'New Narrative';
      
      // Determine what to save based on current mode
      const contentToSave = isDraftMode ? draftContentRef.current : content;
      const draftContentToSave = isDraftMode ? content : draftContentRef.current;
      
      const response = await fetch('/api/narratives', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: currentNarrativeId,
          title: titleToSave,
          content: contentToSave,
          draftContent: draftContentToSave,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setLastSaved(new Date());
        
        // Trigger save feedback
        onSave?.();
        
        // Update parent state with the saved narrative
        if (data.narrative) {
          onNarrativeUpdate(data.narrative);
        }
      }
    } catch {
      // Silently handle error
    } finally {
      setIsSaving(false);
      isUpdatingFromSaveRef.current = false;
    }
  };

  const saveDraftContent = async () => {
    if (!editor || isUpdatingFromSaveRef.current) return;
    
    setIsSaving(true);
    isUpdatingFromSaveRef.current = true;
    
    try {
      const content = editor.getHTML();
      const titleToSave = narrativeTitle || 'New Narrative';
      
      const response = await fetch('/api/narratives', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: currentNarrativeId,
          title: titleToSave,
          content: mainContentRef.current, // Keep existing main content
          draftContent: content, // Save current draft content
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setLastSaved(new Date());
        
        // Trigger save feedback
        onSave?.();
      }
    } catch {
      // Silently handle error
    } finally {
      setIsSaving(false);
      isUpdatingFromSaveRef.current = false;
    }
  };

  const startNewNarrative = () => {
    setNarrativeTitle(''); // Start with empty title to allow proper cursor placement
    setCurrentNarrativeId(null);
    setLastSaved(null);
    setMainContent('');
    setDraftContent('');
    setIsDraftMode(false);
    editor?.commands.setContent('');
    // Clear parent state by passing null
    onNarrativeUpdate(null);
  };

  // Calculate word count from editor content
  const getWordCount = () => {
    if (!editor) return 0;
    const text = editor.getText();
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  };

  const showCopyFeedback = () => {
    // Create a temporary feedback element
    const feedback = document.createElement('div');
    feedback.textContent = 'Text copied to main narrative';
    feedback.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity duration-300';
    document.body.appendChild(feedback);
    
    // Remove after 2 seconds
    setTimeout(() => {
      feedback.style.opacity = '0';
      setTimeout(() => document.body.removeChild(feedback), 300);
    }, 2000);
  };

  // Function to add text to the appropriate content (main or draft)
  const addTextToContent = useCallback((text: string) => {
    if (isDraftMode) {
      // Add to draft content
      setDraftContent(prevContent => {
        const newContent = prevContent.replace(/<\/p>$/, ` ${text}</p>`);
        return newContent;
      });
      
      // If we're currently in draft mode, update the editor
      if (editor) {
        const currentContent = editor.getHTML();
        const newContent = currentContent.replace(/<\/p>$/, ` ${text}</p>`);
        editor.commands.setContent(newContent);
      }
    } else {
      // Add to main content
      setMainContent(prevContent => {
        const newContent = prevContent.replace(/<\/p>$/, ` ${text}</p>`);
        return newContent;
      });
      
      // If we're currently in main mode, update the editor
      if (editor) {
        const currentContent = editor.getHTML();
        const newContent = currentContent.replace(/<\/p>$/, ` ${text}</p>`);
        editor.commands.setContent(newContent);
      }
    }
  }, [isDraftMode, editor]);

  // Expose functions to parent component via ref
  useImperativeHandle(ref, () => ({
    addTextToContent,
    isDraftMode
  }), [addTextToContent, isDraftMode]);

  NarrativePanel.displayName = 'NarrativePanel';

  return (
    <div className="h-full flex flex-col bg-[#0A0A0A]">
      {/* Title and Editor Content grouped for unified nudge */}
      <div className="narrative-content-wrapper pt-7 pl-4 h-full flex flex-col">
        <div className="max-w-[42em] mx-auto px-6" style={{ 
          marginLeft: 'calc(max(0px, 50% - 21em - 4px))'
        }}>
          <input
            type="text"
            className="narrative-title text-xl font-semibold text-white outline-none border-none bg-transparent w-full transition-all duration-200"
            value={narrativeTitle}
            onChange={e => {
              setNarrativeTitle(e.target.value);
            }}
            onBlur={e => {
              setNarrativeTitle(e.target.value.trim());
              setIsTitleFocused(false);
              if (titleOpacity === 0.95) {
                setTitleOpacity(0.4);
              }
            }}
            onMouseEnter={() => {
              if (titleOpacity < 1) {
                setTitleOpacity(0.95);
              }
            }}
            onMouseLeave={() => {
              if (titleOpacity === 0.95 && !isTitleFocused) {
                setTitleOpacity(0.4);
              }
            }}
            onFocus={() => {
              setIsTitleFocused(true);
              setTitleOpacity(0.95);
            }}
            placeholder="Untitled Narrative"
            style={{ 
              fontFamily: 'var(--font-eczar), Georgia, "Times New Roman", serif',
              minHeight: '1.5rem',
              opacity: titleOpacity,
              transition: 'opacity 0.2s ease-in-out',
              cursor: titleOpacity < 1 ? 'pointer' : 'text'
            }}
          />
        </div>
        {/* Editor Content */}
        <div className="flex-1 overflow-hidden min-h-0 relative">
          <div 
            ref={scrollContainerRef}
            className="absolute inset-0 overflow-y-auto"
          >
            <EditorContent 
              editor={editor} 
              className={`narrative-editor bg-[#0A0A0A] transition-opacity duration-250 ${
                isTransitioning ? 'opacity-0' : 'opacity-100'
              }`}
            />
            {/* Gradient mask overlay at the top of the editor */}
            <div 
              className="absolute top-0 left-0 right-0 h-8 pointer-events-none z-10"
              style={{
                background: 'linear-gradient(to bottom, #0A0A0A 0%, rgba(10, 10, 10, 0.8) 50%, rgba(10, 10, 10, 0) 100%)'
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
});

export default NarrativePanel;
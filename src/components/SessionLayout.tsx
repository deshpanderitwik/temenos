'use client';

import { useState, useRef, useEffect } from 'react';
import NarrativePanel, { NarrativePanelRef } from './NarrativePanel';
import ChatPanel from './ChatPanel';
import ConversationList from './ConversationList';
import NarrativesList from './NarrativesList';
import ImagesList, { ImagesListModal } from './ImagesList';
import BreathworkTimer from './BreathworkTimer';
import { DEFAULT_SYSTEM_PROMPT } from '@/utils/constants';
import SystemPromptsModal from './SystemPromptsModal';

interface Conversation {
  id: string;
  title: string;
  created: string;
  lastModified: string;
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
}

interface Narrative {
  id: string;
  title: string;
  content: string;
  created: string;
  lastModified: string;
  characterCount: number;
  preferredMode?: 'draft' | 'main';
}

interface Image {
  id: string;
  title: string;
  created: string;
  lastModified: string;
  url: string;
}

export default function SessionLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNarrativesOpen, setIsNarrativesOpen] = useState(false);
  const [isImagesOpen, setIsImagesOpen] = useState(false);
  const [chatWidth, setChatWidth] = useState(30); // Percentage
  const [isDragging, setIsDragging] = useState(false);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [currentNarrative, setCurrentNarrative] = useState<Narrative | null>(null);
  const [currentImage, setCurrentImage] = useState<Image | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(25);
  const [systemPrompt, setSystemPrompt] = useState<{ title: string; body: string }>({
    title: 'Temenos Guide',
    body: DEFAULT_SYSTEM_PROMPT,
  });

  // Wrapper function to save system prompt to localStorage when it changes
  const handleSystemPromptChange = (prompt: { title: string; body: string }) => {
    setSystemPrompt(prompt);
    if (typeof window !== 'undefined') {
      localStorage.setItem('temenos-selected-system-prompt-title', prompt.title);
      localStorage.setItem('temenos-selected-system-prompt-body', prompt.body);
    }
  };
  const [selectedModel, setSelectedModel] = useState(() => {
    // Load saved model from localStorage on component mount
    if (typeof window !== 'undefined') {
      const savedModel = localStorage.getItem('temenos-selected-model');
      return savedModel || 'r1-1776';
    }
    return 'r1-1776';
  });

  // Wrapper function to save model to localStorage when it changes
  const handleModelChange = (model: string) => {
    setSelectedModel(model);
    if (typeof window !== 'undefined') {
      localStorage.setItem('temenos-selected-model', model);
    }
  };
  
  // Preloaded data state
  const [preloadedConversations, setPreloadedConversations] = useState<Array<{ id: string; title: string; created: string; lastModified: string; messageCount: number }>>([]);
  const [preloadedNarratives, setPreloadedNarratives] = useState<Array<{ id: string; title: string; created: string; lastModified: string; characterCount: number }>>([]);
  const [narrativesRefreshTrigger, setNarrativesRefreshTrigger] = useState(0);
  const [preloadedSystemPrompts, setPreloadedSystemPrompts] = useState<Array<{ id: string; title: string; body: string; created: string; lastModified: string }>>([]);
  const [preloadedImages, setPreloadedImages] = useState<Array<{ id: string; title: string; created: string; lastModified: string; url: string }>>([]);
  const [imagesRefreshTrigger, setImagesRefreshTrigger] = useState(0);
  const [viewingImage, setViewingImage] = useState<{ id: string; title: string; url: string } | null>(null);

  // Narrative panel ref
  const narrativePanelRef = useRef<NarrativePanelRef>(null);

  // DRAFT/MAIN toggle state
  const [isDraftMode, setIsDraftMode] = useState(true);
  
  // Breathwork timer full-screen state
  const [isBreathworkFullScreen, setIsBreathworkFullScreen] = useState(false);

  // UI visibility state for cmd + . shortcut
  const [isUIVisible, setIsUIVisible] = useState(true);

  // Keyboard shortcut handler for cmd + j to toggle draft/main mode and cmd + . to hide/show UI
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
              // Cmd+J (Mac) or Ctrl+J (Windows/Linux) to toggle draft/main mode
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault();
        
        // Use the simplified mode switch function
        if (narrativePanelRef.current) {
          await narrativePanelRef.current.handleModeSwitch();
        }
      }
      
      // Cmd+. (Mac) or Ctrl+. (Windows/Linux) to hide/show UI
      if ((e.metaKey || e.ctrlKey) && e.key === '.') {
        e.preventDefault();
        setIsUIVisible(prev => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDraftMode]);

  // Helper function to load the latest conversation
  const loadLatestConversation = async () => {
    try {
      const response = await fetch('/api/conversations');
      if (response.ok) {
        const data = await response.json();
        if (data.conversations && data.conversations.length > 0) {
          // The API already sorts by lastModified (newest first), so take the first one
          const latestConversation = data.conversations[0];
          await handleConversationSelect(latestConversation.id);
        }
      }
    } catch (error) {
      // Silent error handling for privacy
    }
  };

  // Helper function to load the latest narrative
  const loadLatestNarrative = async () => {
    try {
      const response = await fetch('/api/narratives');
      if (response.ok) {
        const data = await response.json();
        if (data.narratives && data.narratives.length > 0) {
          // The API already sorts by lastModified (newest first), so take the first one
          const latestNarrative = data.narratives[0];
          await handleNarrativeSelect(latestNarrative.id);
        }
      }
    } catch (error) {
      // Silent error handling for privacy
    }
  };

  // Preload all data functions
  const preloadConversations = async () => {
    try {
      const response = await fetch('/api/conversations');
      if (response.ok) {
        const data = await response.json();
        setPreloadedConversations(data.conversations || []);
      }
    } catch (error) {
      // Silent error handling for privacy
    }
  };

  const preloadNarratives = async () => {
    try {
      const response = await fetch('/api/narratives');
      if (response.ok) {
        const data = await response.json();

        setPreloadedNarratives(data.narratives || []);
      }
    } catch (error) {
      // Silent error handling for privacy
    }
  };

  const preloadSystemPrompts = async () => {
    try {
      const response = await fetch('/api/system-prompts');
      if (response.ok) {
        const data = await response.json();
        const now = new Date().toISOString();
        const defaultPrompt = {
          id: 'default',
          title: 'Temenos Guide',
          body: DEFAULT_SYSTEM_PROMPT,
          created: now,
          lastModified: now,
        };
        // Put default prompt at the bottom, other prompts at the top (already sorted by newest first)
        setPreloadedSystemPrompts([...(data.prompts || []), defaultPrompt]);
      } else {
        const now = new Date().toISOString();
        const defaultPrompt = {
          id: 'default',
          title: 'Temenos Guide',
          body: DEFAULT_SYSTEM_PROMPT,
          created: now,
          lastModified: now,
        };
        setPreloadedSystemPrompts([defaultPrompt]);
      }
    } catch (error) {
      // Silent error handling for privacy
      const now = new Date().toISOString();
      const defaultPrompt = {
        id: 'default',
        title: 'Temenos Guide',
        body: DEFAULT_SYSTEM_PROMPT,
        created: now,
        lastModified: now,
      };
      setPreloadedSystemPrompts([defaultPrompt]);
    }
  };

  // Load latest conversation and narrative on component mount
  useEffect(() => {
    const loadLatestItems = async () => {
      // Preload all data in parallel
      await Promise.all([
        preloadConversations(),
        preloadNarratives(),
        preloadSystemPrompts(),
        loadLatestConversation(),
        loadLatestNarrative()
      ]);
    };
    
    loadLatestItems();
  }, []);

  // Load saved system prompt after component mounts (to avoid hydration mismatch)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedPromptTitle = localStorage.getItem('temenos-selected-system-prompt-title');
      const savedPromptBody = localStorage.getItem('temenos-selected-system-prompt-body');
      
      if (savedPromptTitle && savedPromptBody) {
        setSystemPrompt({
          title: savedPromptTitle,
          body: savedPromptBody,
        });
      }
    }
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    startXRef.current = e.clientX;
    startWidthRef.current = chatWidth;
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;

    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    // Invert the calculation: mouse position from right edge determines chat width
    const mousePositionFromRight = containerRect.right - e.clientX;
    const newWidth = (mousePositionFromRight / containerRect.width) * 100;
    
    // Constrain width between 20% and 80%
    let constrainedWidth = Math.max(20, Math.min(80, newWidth));

    // --- Prevent resizing past max pixel width (600px) ---
    const maxPx = 600;
    const pxWidth = (constrainedWidth / 100) * containerRect.width;
    if (pxWidth >= maxPx) {
      constrainedWidth = (maxPx / containerRect.width) * 100;
    }
    // -----------------------------------------------------

    setChatWidth(constrainedWidth);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDragging]);

  const narrativeWidth = 100 - chatWidth;

  const handleConversationSelect = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.conversation) {
          setCurrentConversation(data.conversation);
        }
      }
    } catch (error) {
      // Silent error handling for privacy
    }
  };

  const handleNewConversation = () => {
    setCurrentConversation(null);
  };

  const handleDeleteConversation = (deletedConversationId: string) => {
    if (currentConversation?.id === deletedConversationId) {
      setCurrentConversation(null);
    }
    // Refresh preloaded conversations after deletion
    preloadConversations();
  };

  const handleConversationUpdate = async (updatedConversation: Conversation) => {
    setCurrentConversation(updatedConversation);
    
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedConversation),
      });

      if (!response.ok) {
        // Silent error handling for privacy
      } else {
        // Refresh preloaded conversations after update
        await preloadConversations();
      }
    } catch (error) {
      // Silent error handling for privacy
    }
  };

  const handleNarrativeSelect = async (narrativeId: string) => {
    try {
      const response = await fetch(`/api/narratives/${narrativeId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.narrative) {
          setCurrentNarrative(data.narrative);
          
          // Restore the preferred mode for this narrative
          if (data.narrative.preferredMode) {
            setIsDraftMode(data.narrative.preferredMode === 'draft');
          }
        }
      }
    } catch (error) {
      // Silent error handling for privacy
    }
  };

  const handleNewNarrative = () => {
    setCurrentNarrative(null);
    // Reset to draft mode for new narratives
    setIsDraftMode(true);
  };

  const handleDeleteNarrative = (deletedNarrativeId: string) => {
    if (currentNarrative?.id === deletedNarrativeId) {
      setCurrentNarrative(null);
    }
    // Refresh preloaded narratives after deletion
    preloadNarratives();
  };

  const handleNarrativeUpdate = (updatedNarrative: Narrative | null) => {
    setCurrentNarrative(updatedNarrative);
    
    // Restore the preferred mode for this narrative
    if (updatedNarrative?.preferredMode) {
      setIsDraftMode(updatedNarrative.preferredMode === 'draft');
    }
    
    // Refresh preloaded narratives after update
    if (updatedNarrative) {
      preloadNarratives();
      // Increment refresh trigger to force NarrativesList to update
      setNarrativesRefreshTrigger(prev => prev + 1);
    }
  };

  // Add text to the current narrative (modified to check current mode)
  const handleAddToNarrative = (text: string) => {
    if (narrativePanelRef.current) {
      // Use the narrative panel's addTextToContent function which automatically
      // adds to the correct section based on current mode
      narrativePanelRef.current.addTextToContent(text);
    } else {
      // Fallback to old behavior if ref is not available
      if (!currentNarrative) {
        // Create a new narrative if none exists
        const newNarrative: Narrative = {
          id: `narrative_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title: 'New Narrative',
          content: `<p>${text}</p>`,
          created: new Date().toISOString(),
          lastModified: new Date().toISOString(),
          characterCount: text.length
        };
        setCurrentNarrative(newNarrative);
      } else {
        // Add text to the current active paragraph instead of creating a new one
        const updatedNarrative: Narrative = {
          ...currentNarrative,
          content: currentNarrative.content.replace(/<\/p>$/, ` ${text}</p>`),
          lastModified: new Date().toISOString(),
          characterCount: currentNarrative.characterCount + text.length
        };
        setCurrentNarrative(updatedNarrative);
      }
    }
  };

  // Image handlers
  const handleImageSelect = async (imageId: string) => {
    try {
      const response = await fetch(`/api/images/${imageId}`);
      const data = await response.json();
      if (data.image) {
        setCurrentImage(data.image);
      }
    } catch (error) {
      // Silent error handling for privacy
    }
  };

  const handleNewImage = () => {
    // This will be handled by the ImagesList component now
    // The modal will switch to form mode
    // Increment refresh trigger to force list update
    setImagesRefreshTrigger(prev => prev + 1);
  };

  const handleDeleteImage = (deletedImageId: string) => {
    if (currentImage?.id === deletedImageId) {
      setCurrentImage(null);
    }
    setImagesRefreshTrigger(prev => prev + 1);
  };

  const [systemPromptsOpen, setSystemPromptsOpen] = useState(false);

  return (
    <div className="h-screen bg-[#141414] flex">
        {/* Main/Draft Toggle Switch - absolute positioned to move with layout */}
        {isUIVisible && !isBreathworkFullScreen && (
          <div className="absolute top-0 left-0 pt-7 z-[100]" style={{ paddingLeft: '24px' }}>
            <div className="w-16 flex items-center justify-center">
              <button
                className={`w-10 h-6 rounded-full flex items-center transition-colors duration-300 focus:outline-none ${!isDraftMode ? 'bg-green-600' : 'bg-white/10'}`}
                onClick={async () => {
                  // Use the simplified mode switch function
                  if (narrativePanelRef.current) {
                    await narrativePanelRef.current.handleModeSwitch();
                  }
                }}
                title={!isDraftMode ? 'Switch to Draft (⌘+J)' : 'Switch to Main Narrative (⌘+J)'}
              >
                <span
                  className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform duration-300 ${!isDraftMode ? 'translate-x-4' : 'translate-x-1'}`}
                />
              </button>
            </div>
          </div>
        )}
        
        {/* Left Sidebar */}
        {isUIVisible && (
          <div className="w-16 flex flex-col items-center justify-center flex-shrink-0 pl-12 z-50 relative">
            {/* Navigation Buttons Container */}
            <div className="bg-white/10 rounded-lg p-2 space-y-2">
              <button
                onClick={handleNewNarrative}
                className="w-10 h-10 rounded transition-colors flex items-center justify-center hover:bg-white/20 text-white/40 hover:text-white/95 group"
                title="New Narrative"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </button>
              
              <button
                onClick={() => setIsNarrativesOpen(true)}
                className="w-10 h-10 rounded transition-colors flex items-center justify-center hover:bg-white/20 text-white/40 hover:text-white/95 group"
                title="Narratives"
              >
                <svg 
                  className="w-5 h-5 transition-colors duration-300 text-white/40 group-hover:text-white/95" 
                  xmlns="http://www.w3.org/2000/svg" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  strokeWidth="1.5" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
              </button>
              
              <button
                onClick={() => setIsImagesOpen(true)}
                className="w-10 h-10 rounded transition-colors flex items-center justify-center hover:bg-white/20 text-white/40 hover:text-white/95 group"
                title="Images"
              >
                <svg 
                  className="w-5 h-5 transition-colors duration-300 text-white/40 group-hover:text-white/95" 
                  xmlns="http://www.w3.org/2000/svg" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  strokeWidth="1.5" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                </svg>
              </button>
              
              <BreathworkTimer onFullScreenChange={setIsBreathworkFullScreen} />
              

            </div>
          </div>
        )}

        {/* Main Content with Resizable Panels */}
        <div 
          ref={containerRef}
          className={`flex-1 flex relative resizable-container ${isDragging ? 'resizing' : ''}`}
          style={{ cursor: isDragging ? 'col-resize' : 'default' }}
        >
          {/* Narrative Panel */}
          <div 
            className="bg-[#141414] resizable-panel"
            style={{ width: isUIVisible ? `${narrativeWidth}%` : '100%' }}
          >
            <NarrativePanel 
              currentNarrative={currentNarrative}
              onNarrativeUpdate={handleNarrativeUpdate}
              ref={narrativePanelRef}
              isDraftMode={isDraftMode}
              setIsDraftMode={setIsDraftMode}
            />
          </div>

          {/* Chat Panel with floating appearance and left-edge resize handle */}
          <div 
            className={`resizable-panel chat-panel rounded-2xl bg-[#141414]/95 border border-white/10 backdrop-blur-lg mr-4 flex flex-col relative transition-opacity duration-200 ${!isUIVisible ? 'opacity-0 pointer-events-none' : ''}`}
            style={{ 
              width: isUIVisible ? `${chatWidth}%` : '0%', 
              minWidth: isUIVisible ? '320px' : '0px', 
              maxWidth: isUIVisible ? '600px' : '0px', 
              marginTop: 'calc(2rem - 3px)', 
              marginBottom: '2rem',
              overflow: isUIVisible ? 'visible' : 'hidden'
            }}
          >
            {/* Left-edge resize handle */}
            <div
              className="absolute top-0 left-0 h-full w-3 cursor-col-resize z-20"
              style={{ userSelect: 'none' }}
              onMouseDown={handleMouseDown}
              title="Resize chat panel"
            />
                          <ChatPanel 
                currentConversation={currentConversation}
                onConversationUpdate={handleConversationUpdate}
                onAddToNarrative={handleAddToNarrative}
                systemPrompt={systemPrompt.body}
                onSystemPromptChange={body => handleSystemPromptChange({ ...systemPrompt, body })}
                selectedModel={selectedModel}
                onModelChange={handleModelChange}
                onOpenSystemPrompts={() => setSystemPromptsOpen(true)}
                systemPromptTitle={systemPrompt.title}
                onOpenConversations={() => setIsSidebarOpen(true)}
              />
          </div>
        </div>

        {/* Conversations List Overlay */}
        {isUIVisible && (
          <ConversationList
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            currentConversationId={currentConversation?.id || null}
            onConversationSelect={handleConversationSelect}
            onNewConversation={handleNewConversation}
            onDeleteConversation={handleDeleteConversation}
            preloadedConversations={preloadedConversations}
          />
        )}

        {/* Narratives List Overlay */}
        {isUIVisible && (
          <NarrativesList
            isOpen={isNarrativesOpen}
            onClose={() => setIsNarrativesOpen(false)}
            currentNarrativeId={currentNarrative?.id || null}
            onNarrativeSelect={handleNarrativeSelect}
            onNewNarrative={handleNewNarrative}
            onDeleteNarrative={handleDeleteNarrative}
            preloadedNarratives={preloadedNarratives}
            refreshTrigger={narrativesRefreshTrigger}
          />
        )}

        {isUIVisible && (
          <SystemPromptsModal
            isOpen={systemPromptsOpen}
            onClose={() => setSystemPromptsOpen(false)}
            activePrompt={systemPrompt}
            setActivePrompt={handleSystemPromptChange}
            preloadedPrompts={preloadedSystemPrompts}
          />
        )}

        {/* Images List Modal */}
        {isUIVisible && (
          <ImagesListModal
            isOpen={isImagesOpen}
            onClose={() => setIsImagesOpen(false)}
            currentImageId={currentImage?.id || null}
            onImageSelect={handleImageSelect}
            onNewImage={handleNewImage}
            onDeleteImage={handleDeleteImage}
            preloadedImages={preloadedImages}
            refreshTrigger={imagesRefreshTrigger}
            viewingImage={viewingImage}
            onViewingImageChange={setViewingImage}
          />
        )}

        {/* Full-screen Image Viewer Overlay */}
        {viewingImage && (
          <div className="fixed inset-0 top-0 left-0 w-screen h-screen bg-[#141414] z-[9999] flex" style={{ margin: 0, padding: 0 }}>
            {/* Left Sidebar */}
            <div className="w-16 flex flex-col items-center justify-center flex-shrink-0 pl-12 z-50 relative">
              {/* Navigation Buttons Container */}
              <div className="bg-white/10 rounded-lg p-2 space-y-2">
                {/* Images List Button */}
                <button
                  onClick={() => {
                    setIsImagesOpen(true);
                  }}
                  className="w-10 h-10 rounded transition-colors flex items-center justify-center hover:bg-white/20 text-white/40 hover:text-white/95 group"
                  title="Images List"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                  </svg>
                </button>
                
                {/* Close Button */}
                <button
                  onClick={() => setViewingImage(null)}
                  className="w-10 h-10 rounded transition-colors flex items-center justify-center hover:bg-white/20 text-white/40 hover:text-white/95 group"
                  title="Close"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Image Display Area */}
            <div className="flex-1 flex items-center justify-center p-4">
              <img 
                src={viewingImage.url} 
                alt={viewingImage.title}
                className="max-h-[90%] max-w-[90%] object-contain"
              />
            </div>
          </div>
        )}


      </div>
  );
} 
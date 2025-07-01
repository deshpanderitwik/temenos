'use client';

import { useState, useRef, useEffect } from 'react';
import NarrativePanel, { NarrativePanelRef } from './NarrativePanel';
import ChatPanel from './ChatPanel';
import ConversationList from './ConversationList';
import NarrativesList from './NarrativesList';
import SystemPromptModal from './SystemPromptModal';
import BreathworkTimer, { BreathworkTimerRef } from './BreathworkTimer';

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
}

export default function SessionLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNarrativesOpen, setIsNarrativesOpen] = useState(false);
  const [chatWidth, setChatWidth] = useState(30); // Percentage
  const [isDragging, setIsDragging] = useState(false);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [currentNarrative, setCurrentNarrative] = useState<Narrative | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(25);
  const [isSystemPromptModalOpen, setIsSystemPromptModalOpen] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState<string>('You are a wise, compassionate therapeutic assistant trained in Jungian depth psychology...');
  
  // Save feedback state
  const [showSaveFeedback, setShowSaveFeedback] = useState(false);
  
  // Breathwork timer state
  const [breathworkIsFullScreen, setBreathworkIsFullScreen] = useState(false);
  const breathworkTimerRef = useRef<BreathworkTimerRef | null>(null);
  const [breathworkDisplayText, setBreathworkDisplayText] = useState<number | string>(0);
  const [breathworkCurrentPhase, setBreathworkCurrentPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
  const [breathworkCycleCount, setBreathworkCycleCount] = useState(0);
  const breathworkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Narrative panel ref
  const narrativePanelRef = useRef<NarrativePanelRef>(null);

  // DRAFT/MAIN toggle state
  const [isDraftMode, setIsDraftMode] = useState(false);

  // Keyboard shortcut handler for cmd + j to toggle draft/main mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+J (Mac) or Ctrl+J (Windows/Linux) to toggle draft/main mode
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault();
        setIsDraftMode((prev) => !prev);
      }
    };

    // Add global keyboard event listener
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup on unmount
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

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
      console.error('Failed to load latest conversation:', error);
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
      console.error('Failed to load latest narrative:', error);
    }
  };

  // Load latest conversation and narrative on component mount
  useEffect(() => {
    const loadLatestItems = async () => {
      await Promise.all([
        loadLatestConversation(),
        loadLatestNarrative()
      ]);
    };
    
    loadLatestItems();
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
    let newWidth = (mousePositionFromRight / containerRect.width) * 100;
    
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
      console.error('Failed to load conversation:', error);
    }
  };

  const handleNewConversation = () => {
    setCurrentConversation(null);
  };

  const handleDeleteConversation = (deletedConversationId: string) => {
    if (currentConversation?.id === deletedConversationId) {
      setCurrentConversation(null);
    }
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
        console.error('Failed to save conversation');
      }
    } catch (error) {
      console.error('Error saving conversation:', error);
    }
  };

  const handleNarrativeSelect = async (narrativeId: string) => {
    try {
      const response = await fetch(`/api/narratives/${narrativeId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.narrative) {
          setCurrentNarrative(data.narrative);
        }
      }
    } catch (error) {
      console.error('Failed to load narrative:', error);
    }
  };

  const handleNewNarrative = () => {
    setCurrentNarrative(null);
  };

  const handleDeleteNarrative = (deletedNarrativeId: string) => {
    if (currentNarrative?.id === deletedNarrativeId) {
      setCurrentNarrative(null);
    }
  };

  const handleNarrativeUpdate = (updatedNarrative: Narrative | null) => {
    setCurrentNarrative(updatedNarrative);
  };

  // Add text to the current narrative (modified to check draft mode)
  const handleAddToNarrative = (text: string) => {
    if (narrativePanelRef.current) {
      // Use the narrative panel's addTextToContent function which automatically
      // adds to the correct section based on current draft mode
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

  // Handle breathwork full-screen toggle
  const handleBreathworkToggle = () => {
    if (breathworkIsFullScreen) {
      // Exiting full-screen mode
      setBreathworkIsFullScreen(false);
      setBreathworkDisplayText(0);
      setBreathworkCurrentPhase('inhale');
      setBreathworkCycleCount(0);
      if (breathworkIntervalRef.current) {
        clearInterval(breathworkIntervalRef.current);
        breathworkIntervalRef.current = null;
      }
    } else {
      // Entering full-screen mode
      setBreathworkIsFullScreen(true);
      setBreathworkDisplayText(0);
      setBreathworkCurrentPhase('inhale');
      setBreathworkCycleCount(0);
      // Start the timer after a brief delay to ensure the component is mounted
      setTimeout(() => {
        startBreathworkTimer();
      }, 100);
    }
  };

  // Start breathwork timer
  const startBreathworkTimer = () => {
    let count = 0;
    let holdCount = 0;
    let currentPhase: 'inhale' | 'hold' | 'exhale' = 'inhale';
    let cycleCount = 0;

    breathworkIntervalRef.current = setInterval(() => {
      if (currentPhase === 'inhale') {
        count++;
        if (count > 4) {
          currentPhase = 'hold';
          holdCount = 0;
          setBreathworkCurrentPhase('hold');
          setBreathworkDisplayText(holdCount);
        } else {
          setBreathworkDisplayText(count);
        }
      } else if (currentPhase === 'hold') {
        holdCount++;
        if (holdCount > 7) {
          currentPhase = 'exhale';
          count = 8;
          setBreathworkCurrentPhase('exhale');
          setBreathworkDisplayText(8);
        } else {
          setBreathworkDisplayText(holdCount);
        }
      } else if (currentPhase === 'exhale') {
        if (count === 8) {
          // First tick in exhale phase, show 8 then start counting down
          count = 7;
          setBreathworkDisplayText(7);
        } else {
          count--;
          if (count < 0) {
            // Complete cycle - increment cycle count
            cycleCount++;
            setBreathworkCycleCount(cycleCount);
            
            // Check if we've completed 10 cycles
            if (cycleCount > 10) {
              // Reset everything for next round
              cycleCount = 1;
              setBreathworkCycleCount(1);
              count = 0;
              holdCount = 0;
              currentPhase = 'inhale';
              setBreathworkCurrentPhase('inhale');
              setBreathworkDisplayText(0);
            } else {
              // Continue to next cycle
              currentPhase = 'inhale';
              holdCount = 0;
              count = 0;
              setBreathworkCurrentPhase('inhale');
              setBreathworkDisplayText(0);
            }
          } else {
            setBreathworkDisplayText(count);
          }
        }
      }
    }, 1000);
  };

  // Cleanup breathwork timer on unmount
  useEffect(() => {
    return () => {
      if (breathworkIntervalRef.current) {
        clearInterval(breathworkIntervalRef.current);
      }
    };
  }, []);

  return (
    <>
      {/* Full-screen Breathwork Timer Overlay */}
      {breathworkIsFullScreen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-[9999] flex items-center justify-center">
          <div className="text-center w-32">
            <div className="text-8xl font-bold text-white mb-2 font-eczar">
              {breathworkDisplayText}
            </div>
            <div className="text-2xl text-gray-300 mb-4">
              {breathworkCurrentPhase === 'inhale' && 'Inhale'}
              {breathworkCurrentPhase === 'hold' && 'Hold'}
              {breathworkCurrentPhase === 'exhale' && 'Exhale'}
            </div>
            {/* Cycle dots */}
            <div className="flex justify-center gap-1 mb-8">
              {Array.from({ length: 10 }, (_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                    i < breathworkCycleCount 
                      ? 'bg-white' 
                      : 'bg-gray-600'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={handleBreathworkToggle}
              className="px-3 py-1 bg-red-600 text-white rounded-lg transition-all flex items-center gap-2 mx-auto opacity-50 hover:opacity-100 text-sm"
            >
              Stop
            </button>
          </div>
        </div>
      )}
      
      <div className="h-screen bg-[#0A0A0A] flex">
        {/* Draft/Main Toggle Switch - fixed at top left, 48px from edge */}
        <div className="fixed top-0 left-0 pt-7 z-[100]" style={{ paddingLeft: '24px' }}>
          <div className="w-16 flex items-center justify-center">
            <button
              className={`w-10 h-6 rounded-full flex items-center transition-colors duration-300 focus:outline-none ${isDraftMode ? 'bg-yellow-600' : 'bg-white/10'}`}
              onClick={() => setIsDraftMode((v) => !v)}
              title={isDraftMode ? 'Switch to Main Narrative (⌘+J)' : 'Switch to Draft (⌘+J)'}
            >
              <span
                className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform duration-300 ${isDraftMode ? 'translate-x-4' : 'translate-x-0'}`}
              />
            </button>
          </div>
        </div>
        {/* Left Sidebar */}
        <div className="w-16 flex flex-col items-center justify-center flex-shrink-0 pl-12 z-50 relative">
          {/* Navigation Buttons Container */}
          <div className="bg-white/10 rounded-lg p-2 space-y-2">
            <BreathworkTimer 
              ref={breathworkTimerRef}
              renderButton={() => (
                <button
                  onClick={handleBreathworkToggle}
                  className="w-10 h-10 rounded transition-colors flex items-center justify-center hover:bg-white/20 text-white group"
                  title={breathworkIsFullScreen ? 'Exit full-screen breathwork' : 'Start full-screen breathwork timer'}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>
              )}
            />
            
            <button
              onClick={() => setIsNarrativesOpen(true)}
              className="w-10 h-10 rounded transition-colors flex items-center justify-center hover:bg-white/20 text-white group"
              title="Narratives"
            >
              <svg 
                className={`w-5 h-5 transition-colors duration-300 ${showSaveFeedback ? 'text-green-400' : 'text-white'}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
            
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="w-10 h-10 rounded transition-colors flex items-center justify-center hover:bg-white/20 text-white group"
              title="Conversations"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Main Content with Resizable Panels */}
        <div 
          ref={containerRef}
          className={`flex-1 flex relative resizable-container ${isDragging ? 'resizing' : ''}`}
          style={{ cursor: isDragging ? 'col-resize' : 'default' }}
        >
          {/* Narrative Panel */}
          <div 
            className="bg-[#0A0A0A] resizable-panel"
            style={{ width: `${narrativeWidth}%` }}
          >
            <NarrativePanel 
              currentNarrative={currentNarrative}
              onNarrativeUpdate={handleNarrativeUpdate}
              onSave={() => {
                setShowSaveFeedback(true);
                setTimeout(() => {
                  setShowSaveFeedback(false);
                }, 1000);
              }}
              ref={narrativePanelRef}
              isDraftMode={isDraftMode}
              setIsDraftMode={setIsDraftMode}
            />
          </div>

          {/* Chat Panel with floating appearance and left-edge resize handle */}
          <div 
            className="resizable-panel chat-panel rounded-2xl shadow-2xl bg-[#18181b]/95 border border-white/10 backdrop-blur-lg my-8 mr-4 flex flex-col relative"
            style={{ width: `${chatWidth}%`, minWidth: '320px', maxWidth: '600px' }}
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
              systemPrompt={systemPrompt}
              onSystemPromptChange={setSystemPrompt}
              onOpenSystemPromptModal={() => setIsSystemPromptModalOpen(true)}
            />
          </div>
        </div>

        {/* Conversations List Overlay */}
        <ConversationList
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          currentConversationId={currentConversation?.id || null}
          onConversationSelect={handleConversationSelect}
          onNewConversation={handleNewConversation}
          onDeleteConversation={handleDeleteConversation}
        />

        {/* Narratives List Overlay */}
        <NarrativesList
          isOpen={isNarrativesOpen}
          onClose={() => setIsNarrativesOpen(false)}
          currentNarrativeId={currentNarrative?.id || null}
          onNarrativeSelect={handleNarrativeSelect}
          onNewNarrative={handleNewNarrative}
          onDeleteNarrative={handleDeleteNarrative}
        />

        <SystemPromptModal
          isOpen={isSystemPromptModalOpen}
          onClose={() => setIsSystemPromptModalOpen(false)}
          currentPrompt={systemPrompt}
          onSave={(prompt) => setSystemPrompt(prompt)}
        />
      </div>
    </>
  );
} 
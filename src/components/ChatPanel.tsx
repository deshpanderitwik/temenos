'use client';

import { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { encryptClientSide, decryptClientSide } from '@/utils/encryption';
import ThinkingMessage from './ThinkingMessage';
import { DEFAULT_SYSTEM_PROMPT } from '@/utils/constants';
import SystemPromptsList from './SystemPromptsList';

// Markdown components for chat messages
const markdownComponents = {
  h1: ({children}: any) => <h1 className="text-lg font-bold text-gray-100 mb-2 mt-3">{children}</h1>,
  h2: ({children}: any) => <h2 className="text-base font-bold text-gray-100 mb-2 mt-2">{children}</h2>,
  h3: ({children}: any) => <h3 className="text-xl font-bold text-gray-100 mb-1 mt-2">{children}</h3>,
  p: ({children}: any) => <p className="text-gray-100 mb-2 leading-relaxed [&:last-child]:mb-0 [li>&]:mt-0">{children}</p>,
  strong: ({children}: any) => <strong className="font-bold text-gray-50">{children}</strong>,
  em: ({children}: any) => <em className="italic text-gray-200">{children}</em>,
  ul: ({children}: any) => (
    <ul className="mb-2 text-gray-100 space-y-1 list-none pl-0 [&>li>ul]:ml-4 [&>li>ol]:ml-4 [&>li>ul>li>ul]:ml-4 [&>li>ol>li>ol]:ml-4 [&>li>ul>li>ol]:ml-4 [&>li>ol>li>ul]:ml-4">
      {children}
    </ul>
  ),
  ol: ({children}: any) => (
    <ol className="mb-2 text-gray-100 space-y-1 list-none pl-0 [&>li>ul]:ml-4 [&>li>ol]:ml-4 [&>li>ul>li>ul]:ml-4 [&>li>ol>li>ol]:ml-4 [&>li>ul>li>ol]:ml-4 [&>li>ol>li>ul]:ml-4">
      {children}
    </ol>
  ),
  li: ({children, index, ordered}: any) => {
    // Check if this is an ordered list by looking at the parent
    const isOrdered = ordered || (typeof index === 'number');
    return (
      <li className="text-gray-100 flex items-start">
        <span className="mr-2 flex-shrink-0 min-w-[1.5rem] text-left">
          {isOrdered ? `${(index || 0) + 1}.` : '•'}
        </span>
        <span className="flex-1">{children}</span>
      </li>
    );
  },
  code: ({children}: any) => <code className="bg-gray-600 px-1 py-0.5 rounded text-xs font-mono text-gray-100">{children}</code>,
  pre: ({children}: any) => <pre className="bg-gray-600 p-2 rounded overflow-x-auto mb-2 text-xs">{children}</pre>,
  blockquote: ({children}: any) => <blockquote className="border-l-4 border-white/10 pl-3 italic text-gray-300 mb-2">{children}</blockquote>,
};

// Thinking content markdown components (smaller text)
const thinkingMarkdownComponents = {
  h1: ({children}: any) => <h1 className="text-lg font-bold text-gray-200 mb-2 mt-3">{children}</h1>,
  h2: ({children}: any) => <h2 className="text-base font-bold text-gray-200 mb-2 mt-2">{children}</h2>,
  h3: ({children}: any) => <h3 className="text-xl font-bold text-gray-200 mb-1 mt-2">{children}</h3>,
  p: ({children}: any) => <p className="text-gray-300 text-sm mb-2 leading-relaxed [&:last-child]:mb-0 [li>&]:mt-0">{children}</p>,
  strong: ({children}: any) => <strong className="font-bold text-gray-200">{children}</strong>,
  em: ({children}: any) => <em className="italic text-gray-300">{children}</em>,
  ul: ({children}: any) => (
    <ul className="mb-2 text-gray-300 text-sm space-y-1 list-none pl-0 [&>li>ul]:ml-4 [&>li>ol]:ml-4 [&>li>ul>li>ul]:ml-4 [&>li>ol>li>ol]:ml-4 [&>li>ul>li>ol]:ml-4 [&>li>ol>li>ul]:ml-4">
      {children}
    </ul>
  ),
  ol: ({children}: any) => (
    <ol className="mb-2 text-gray-300 text-sm space-y-1 list-none pl-0 [&>li>ul]:ml-4 [&>li>ol]:ml-4 [&>li>ul>li>ul]:ml-4 [&>li>ol>li>ol]:ml-4 [&>li>ul>li>ol]:ml-4 [&>li>ol>li>ul]:ml-4">
      {children}
    </ol>
  ),
  li: ({children, index, ordered}: any) => {
    // Check if this is an ordered list by looking at the parent
    const isOrdered = ordered || (typeof index === 'number');
    return (
      <li className="text-gray-300 text-sm flex items-start">
        <span className="mr-2 flex-shrink-0 min-w-[1.5rem] text-left">
          {isOrdered ? `${(index || 0) + 1}.` : '•'}
        </span>
        <span className="flex-1">{children}</span>
      </li>
    );
  },
  code: ({children}: any) => <code className="bg-gray-700 px-1 py-0.5 rounded text-xs font-mono text-gray-200">{children}</code>,
  pre: ({children}: any) => <pre className="bg-gray-700 p-2 rounded overflow-x-auto mb-2 text-xs">{children}</pre>,
  blockquote: ({children}: any) => <blockquote className="border-l-2 border-white/10 pl-2 italic text-gray-400 mb-2 text-sm">{children}</blockquote>,
};

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface Conversation {
  id: string;
  title: string;
  created: string;
  lastModified: string;
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
}

interface ChatPanelProps {
  currentConversation: Conversation | null;
  onConversationUpdate: (conversation: Conversation) => void;
  onAddToNarrative?: (text: string) => void;
  systemPrompt: string;
  onSystemPromptChange: (prompt: string) => void;
  selectedModel?: string;
  onModelChange?: (model: string) => void;
  onOpenSystemPrompts: () => void;
  systemPromptTitle?: string;
  onOpenConversations?: () => void;
}

export default function ChatPanel({ currentConversation, onConversationUpdate, onAddToNarrative, systemPrompt, onSystemPromptChange, selectedModel = 'r1-1776', onModelChange, onOpenSystemPrompts, systemPromptTitle, onOpenConversations }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef<{ top: number; height: number; shouldRestore: boolean } | null>(null);
  const isScrollingToBottomRef = useRef(false);
  const lastMessageRef = useRef<HTMLDivElement>(null);




  const editor = useEditor({
    extensions: [
      StarterKit,
    ],
    content: '<p>Start your story here...</p>',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none',
      },
    },
  });

  // Preserve scroll position during resize
  const preserveScrollPosition = () => {
    const container = messagesContainerRef.current;
    if (container) {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10; // 10px tolerance
      
      // Only preserve scroll if not at bottom
      if (!isAtBottom) {
        const scrollPercentage = scrollTop / (scrollHeight - clientHeight);
        scrollPositionRef.current = {
          top: scrollTop,
          height: scrollHeight,
          shouldRestore: true
        };
        return scrollPercentage;
      } else {
        scrollPositionRef.current = {
          top: scrollTop,
          height: scrollHeight,
          shouldRestore: false
        };
      }
    }
    return 0;
  };

  // Restore scroll position after resize
  const restoreScrollPosition = (scrollPercentage: number) => {
    const container = messagesContainerRef.current;
    if (container && scrollPositionRef.current?.shouldRestore) {
      const { scrollHeight, clientHeight } = container;
      const newScrollTop = scrollPercentage * (scrollHeight - clientHeight);
      
      // Constrain scroll position to valid range
      const maxScrollTop = scrollHeight - clientHeight;
      const constrainedScrollTop = Math.max(0, Math.min(newScrollTop, maxScrollTop));
      
      container.scrollTop = constrainedScrollTop;
    }
  };

  // Listen for resize events to preserve scroll position
  useEffect(() => {
    let resizeTimeout: NodeJS.Timeout;
    let isResizing = false;
    
    const handleResize = () => {
      // Don't interfere if we're intentionally scrolling to bottom
      if (isScrollingToBottomRef.current) {
        return;
      }
      
      // Clear previous timeout
      clearTimeout(resizeTimeout);
      
      if (!isResizing) {
        // Preserve current scroll position only at the start of resize
        const scrollPercentage = preserveScrollPosition();
        isResizing = true;
        
        // Restore scroll position after resize is complete
        resizeTimeout = setTimeout(() => {
          // Don't restore if we're intentionally scrolling to bottom
          if (!isScrollingToBottomRef.current) {
            restoreScrollPosition(scrollPercentage);
          }
          isResizing = false;
        }, 100); // Increased delay to ensure resize is complete
      }
    };

    // Use ResizeObserver to detect when the container size changes
    const resizeObserver = new ResizeObserver(handleResize);
    
    if (messagesContainerRef.current) {
      resizeObserver.observe(messagesContainerRef.current);
    }

    return () => {
      clearTimeout(resizeTimeout);
      resizeObserver.disconnect();
    };
  }, []);



  // Load conversation when currentConversation changes
  useEffect(() => {
    if (currentConversation && currentConversation.messages) {
      // Convert conversation messages to our Message format
      const convertedMessages: Message[] = currentConversation.messages
        .filter(msg => msg.role === 'user' || msg.role === 'assistant')
        .map((msg, index) => ({
          id: `${currentConversation.id}_${index}`,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          timestamp: new Date(msg.role === 'user' ? currentConversation.created : currentConversation.lastModified)
        }));
      setMessages(convertedMessages);
    } else {
      // Clear messages for new conversation
      setMessages([]);
    }
  }, [currentConversation]);

  const scrollToBottom = () => {
    isScrollingToBottomRef.current = true;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    // Reset the flag after a short delay
    setTimeout(() => {
      isScrollingToBottomRef.current = false;
    }, 100);
  };

  const scrollToLastMessage = () => {
    isScrollingToBottomRef.current = true;
    if (lastMessageRef.current && messagesContainerRef.current) {
      // Get the position of the last message relative to the container
      const messageRect = lastMessageRef.current.getBoundingClientRect();
      const containerRect = messagesContainerRef.current.getBoundingClientRect();
      
      // Calculate the scroll position to show the message with 16px padding at the top
      const scrollTop = messagesContainerRef.current.scrollTop + (messageRect.top - containerRect.top) - 16;
      
      // Scroll to the calculated position
      messagesContainerRef.current.scrollTo({
        top: scrollTop,
        behavior: 'smooth'
      });
    } else {
      // Fallback to original behavior if refs are not available
      lastMessageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    // Reset the flag after a short delay
    setTimeout(() => {
      isScrollingToBottomRef.current = false;
    }, 100);
  };

  // Scroll to bottom when user sends message or when AI responds
  useEffect(() => {
    // Scroll whenever messages change (user sends message or AI responds)
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      
      // Use setTimeout to ensure DOM has updated
      setTimeout(() => {
        if (lastMessage.role === 'assistant') {
          // For AI messages, scroll to the top of the message
          scrollToLastMessage();
        } else {
          // For user messages, scroll to bottom
          scrollToBottom();
        }
      }, 0);
    }
  }, [messages]);

  // Scroll to bottom when loading state changes (to show thinking indicator)
  useEffect(() => {
    if (isLoading) {
      // Use setTimeout to ensure DOM has updated
      setTimeout(() => scrollToBottom(), 0);
    }
  }, [isLoading]);

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Store the current height to detect if it changed
      const currentHeight = textarea.style.height;
      
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto';
      
      // Count the number of line breaks in the text
      const lineBreaks = (inputValue.match(/\n/g) || []).length;
      
      // If there are explicit line breaks, let it grow
      if (lineBreaks > 0) {
        textarea.style.height = `${textarea.scrollHeight}px`;
      } else {
        // Measure actual text width to determine if it needs to wrap
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        if (context) {
          // Get the computed font style from the textarea
          const computedStyle = window.getComputedStyle(textarea);
          const font = `${computedStyle.fontWeight} ${computedStyle.fontSize} ${computedStyle.fontFamily}`;
          context.font = font;
          
          // Calculate available width for text (accounting for padding)
          const textareaWidth = textarea.clientWidth;
          const horizontalPadding = 24; // px-3 = 12px on each side
          const availableWidth = textareaWidth - horizontalPadding;
          
          // Measure the actual text width
          const textMetrics = context.measureText(inputValue);
          const textWidth = textMetrics.width;
          
          // Only grow if the text width exceeds the available width
          // Add a small buffer (5px) to prevent premature wrapping
          if (textWidth > availableWidth + 5) {
            textarea.style.height = `${textarea.scrollHeight}px`;
          } else {
            // Keep it at minimum height for single line
            textarea.style.height = '40px';
          }
        } else {
          // Fallback to character count if canvas is not available
          const textareaWidth = textarea.clientWidth;
          const horizontalPadding = 24;
          const availableWidth = textareaWidth - horizontalPadding;
          const averageCharWidth = 9.5;
          const charsPerLine = Math.floor(availableWidth / averageCharWidth);
          
          if (inputValue.length > charsPerLine + 10) {
            textarea.style.height = `${textarea.scrollHeight}px`;
          } else {
            textarea.style.height = '40px';
          }
        }
      }
      
      // If the height changed and we're at the bottom, scroll to maintain bottom position
      if (textarea.style.height !== currentHeight) {
        const container = messagesContainerRef.current;
        if (container) {
          const { scrollTop, scrollHeight, clientHeight } = container;
          const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10; // 10px tolerance
          
          if (isAtBottom) {
            // Use setTimeout to ensure the height change has been applied
            setTimeout(() => {
              container.scrollTop = container.scrollHeight;
            }, 0);
          }
        }
      }
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [inputValue]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue('');
    setIsLoading(true);

    // Scroll to bottom immediately after adding user message
    setTimeout(() => scrollToBottom(), 0);

    try {
      // Get encryption key from environment
      const encryptionKey = process.env.NEXT_PUBLIC_CLIENT_ENCRYPTION_KEY || process.env.NEXT_PUBLIC_ENCRYPTION_KEY || '';
      
      if (!encryptionKey) {
        throw new Error('Encryption key not found');
      }

      // Encrypt the current message, conversation history, and system prompt for API
      const { encryptClientSide } = await import('@/utils/encryption');
      const encryptedPrompt = await encryptClientSide(inputValue, encryptionKey);
      const encryptedSystemPrompt = await encryptClientSide(systemPrompt, encryptionKey);
      const encryptedMessages = await Promise.all(
        messages.map(async (msg) => ({
          role: msg.role,
          content: await encryptClientSide(msg.content, encryptionKey)
        }))
      );

      const response = await fetch('/api/healing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: JSON.stringify({
          prompt: encryptedPrompt,
          systemPrompt: encryptedSystemPrompt,
          messages: encryptedMessages,
          model: selectedModel
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to send message';
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If we can't parse the error, use the raw text
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      // Decrypt the API response
      const { decryptClientSide } = await import('@/utils/encryption');
      const decryptedResponse = await decryptClientSide(data.response, encryptionKey);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: decryptedResponse,
        timestamp: new Date(),
      };

      const updatedMessages = [...newMessages, assistantMessage];
      setMessages(updatedMessages);

      // Scroll to top of assistant message immediately after adding it
      setTimeout(() => scrollToLastMessage(), 0);

      // Update conversation in parent component
      const updatedConversation: Conversation = {
        id: currentConversation?.id || `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: currentConversation?.title || 'New Conversation',
        created: currentConversation?.created || new Date().toISOString(),
        lastModified: new Date().toISOString(),
        messages: updatedMessages.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      };
      onConversationUpdate(updatedConversation);

    } catch (error) {
      // Silent error handling for privacy
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleSystemPromptSave = (newPrompt: string) => {
    onSystemPromptChange(newPrompt);
  };

  const renderMessage = (message: Message, index: number) => {
    const isAssistant = message.role === 'assistant';
    const isLastMessage = index === messages.length - 1;
    
    // Parse message content for thinking process
    const parts: Array<{ type: 'text' | 'think'; content: string }> = [];
    
    // Check if message contains thinking process using <think> tags
    const thinkRegex = /<think>([\s\S]*?)<\/think>/i;
    const match = message.content.match(thinkRegex);
    
    if (match) {
      const fullMatch = match[0];
      const thinkingContent = match[1].trim();
      const beforeThinking = message.content.substring(0, match.index).trim();
      const afterThinking = message.content.substring((match.index || 0) + fullMatch.length).trim();

      // Add text before thinking process
      if (beforeThinking) {
        parts.push({
          type: 'text',
          content: beforeThinking
        });
      }
      
      // Add thinking process
      parts.push({
        type: 'think',
        content: thinkingContent
      });

      // Add text after thinking process
      if (afterThinking) {
        parts.push({
          type: 'text',
          content: afterThinking
        });
      }
    } else {
      // No thinking tags found, treat entire content as text
      parts.push({
        type: 'text',
        content: message.content
      });
    }
    
    return (
      <div
        key={message.id}
        ref={isLastMessage ? lastMessageRef : null}
        className={`chat-message ${isLastMessage ? '' : 'mb-4'}`}
      >
        {/* Message Header */}
        <div className="flex items-center justify-between mb-2 chat-message-header pl-4 pr-4">
          <div className="text-sm font-medium text-gray-300">
            {isAssistant ? 'AI' : 'You'}
          </div>
          <span className="text-sm text-gray-400">
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        
        {/* Message Content */}
        <div
          className={`rounded-lg px-4 py-3 chat-message-content ${
            isAssistant
              ? 'text-white/95'
              : 'text-white/95'
          }`}
        >
          {parts.map((part, index) => {
            if (part.type === 'think') {
              return (
                <details key={index} className="mb-4">
                  <summary className="cursor-pointer inline-flex items-center gap-2 px-3 py-1 bg-white/10 hover:bg-white/20 text-white/40 hover:text-white/60 font-medium text-sm rounded-full transition-colors">
                    <span>Thinking Process</span>
                  </summary>
                  <div className="mt-2 px-6 pt-1 pb-1 bg-white/10 rounded-lg text-sm">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={thinkingMarkdownComponents}
                    >
                      {part.content}
                    </ReactMarkdown>
                  </div>
                </details>
              );
            } else {
              return (
                <ReactMarkdown
                  key={index}
                  remarkPlugins={[remarkGfm]}
                  components={markdownComponents}
                >
                  {part.content}
                </ReactMarkdown>
              );
            }
          })}
        </div>
      </div>
    );
  };

  const availableModels = [
    { id: 'r1-1776', name: 'R1-1776', description: 'Fast and efficient' },
    { id: 'sonar-pro', name: 'Sonar Pro', description: 'Advanced reasoning' }
  ];

  return (
    <>
      <div className="h-full flex flex-col bg-[#141414]">
        {/* Messages - Takes remaining space and scrolls */}
        <div className="flex-1 overflow-hidden min-h-0 relative">
          <div 
            ref={messagesContainerRef}
            className="absolute inset-0 overflow-y-auto pt-4 pr-4 pl-4 pb-0 space-y-4 messages-container"
            onKeyDown={(e) => {
              // Cmd+K (Mac) or Ctrl+K (Windows/Linux) to add selected text to narrative
              if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                
                const selection = window.getSelection();
                if (!selection || selection.rangeCount === 0) return;
                
                // Get the selected text with preserved paragraph breaks
                let selectedText = '';
                
                if (selection.rangeCount > 0) {
                  const range = selection.getRangeAt(0);
                  const fragment = range.cloneContents();
                  
                  // Convert the fragment to HTML and then process it
                  const tempDiv = document.createElement('div');
                  tempDiv.appendChild(fragment);
                  
                  // Get the HTML content
                  const htmlContent = tempDiv.innerHTML;
                  
                  // Convert HTML to text while preserving paragraph breaks
                  selectedText = htmlContent
                    .replace(/<br\s*\/?>/gi, '\n') // Convert <br> tags to newlines
                    .replace(/<\/p>/gi, '\n') // Convert closing </p> tags to newlines
                    .replace(/<p[^>]*>/gi, '') // Remove opening <p> tags
                    .replace(/<[^>]*>/g, '') // Remove any other HTML tags
                    .replace(/\n\s*\n/g, '\n') // Remove extra blank lines
                    .trim();
                }
                
                if (selectedText.length > 0 && onAddToNarrative) {
                  onAddToNarrative(selectedText);
                  // Don't clear selection - let user keep their selection
                }
              }
            }}
            tabIndex={0} // Make the container focusable for keyboard events
          >
            {messages.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
              </div>
            ) : (
              messages.map((message, index) => renderMessage(message, index))
            )}
            
            {isLoading && (
              <div className="chat-message">
                {/* Loading Header */}
                <div className="flex items-center justify-between mb-2 chat-message-header pl-4 pr-4">
                  <div className="text-sm font-medium text-gray-300">
                    AI
                  </div>
                  <span className="text-sm text-gray-400">
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                
                {/* Loading Content */}
                <div className="text-white/95 rounded-lg px-4 py-3 chat-message-content">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                    <span className="text-sm">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input - Fixed at bottom */}
        <div className="border-t border-white/10 p-4 flex-shrink-0">
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            {/* Background container with rounded corners */}
            <div className="bg-white/10 rounded-lg overflow-hidden">
              {/* Textarea container - let it grow naturally */}
              <div className="pt-2 px-1">
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message..."
                  className="w-full text-white/95 resize-none focus:outline-none min-h-[40px] px-3 py-2"
                  style={{ lineHeight: '24px', maxHeight: '240px' }}
                  disabled={isLoading}
                />
              </div>
            </div>
            <div className="flex justify-between items-center flex-shrink-0">
              <div className="relative">
                <select
                  value={selectedModel}
                  onChange={(e) => onModelChange?.(e.target.value)}
                  className="px-3 py-1 text-xs bg-white/10 text-white/95 rounded hover:bg-white/20 transition-colors appearance-none cursor-pointer border-none focus:outline-none focus:ring-0 text-center"
                  style={{
                    backgroundImage: 'none',
                    paddingRight: '12px',
                    textAlign: 'center'
                  }}
                  disabled={isLoading}
                >
                  {availableModels.map((model) => (
                    <option key={model.id} value={model.id} className="bg-gray-800 text-white text-center">
                      {model.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                {systemPromptTitle && (
                  <span className="mr-1 text-xs text-white/60 max-w-[120px] truncate align-middle" title={systemPromptTitle}>
                    {systemPromptTitle}
                  </span>
                )}
                <button
                  type="button"
                  onClick={onOpenSystemPrompts}
                  className="w-8 h-8 bg-white/10 text-white/60 hover:text-white hover:bg-white/20 rounded-full transition-colors flex items-center justify-center"
                  title="System Prompts"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                  </svg>
                </button>
                {onOpenConversations && (
                  <button
                    type="button"
                    onClick={onOpenConversations}
                    className="w-8 h-8 bg-white/10 text-white/60 hover:text-white hover:bg-white/20 rounded-full transition-colors flex items-center justify-center"
                    title="Conversations"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
                    </svg>
                  </button>
                )}
                <button
                  type="submit"
                  disabled={!inputValue.trim() || isLoading}
                  className={`w-8 h-8 text-xs rounded-full transition-colors flex items-center justify-center ${
                    !inputValue.trim() || isLoading 
                      ? 'bg-white/10 text-white/40 cursor-not-allowed'
                      : 'bg-white/10 text-white/60 hover:text-white hover:bg-white/20'
                  }`}
                  title="Send message"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
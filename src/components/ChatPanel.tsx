'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { encryptClientSide, decryptClientSide } from '@/utils/encryption';
import ThinkingMessage from './ThinkingMessage';
import { DEFAULT_SYSTEM_PROMPT } from '@/utils/constants';
import SystemPromptsList from './SystemPromptsList';
import TextareaAutosize from 'react-textarea-autosize';


// Helper functions to detect if content should be treated as code
const isCodeContent = (content: string): boolean => {
  if (!content) return false;
  
  // Check for common code patterns
  const codePatterns = [
    /[{}()[\]<>]/g, // Brackets and parentheses
    /[;=+\-*/%&|^~!]/g, // Common programming operators
    /\b(if|else|for|while|function|var|let|const|return|class|import|export|console|log)\b/g, // Common keywords
    /\b\d+\.\d+/g, // Numbers with decimals
    /[A-Z_][A-Z0-9_]*/g, // Constants or class names
  ];
  
  const codeScore = codePatterns.reduce((score, pattern) => {
    const matches = content.match(pattern);
    return score + (matches ? matches.length : 0);
  }, 0);
  
  // Also check for indentation patterns
  const lines = content.split('\n');
  const indentedLines = lines.filter(line => line.startsWith('  ') || line.startsWith('\t')).length;
  
  // Consider it code if it has significant code patterns or is mostly indented
  return codeScore > 2 || (indentedLines > 0 && indentedLines / lines.length > 0.3);
};

const isInlineCode = (content: string): boolean => {
  if (!content) return false;
  
  // Check for inline code patterns
  const inlineCodePatterns = [
    /[{}()[\]<>]/g, // Brackets
    /[;=+\-*/%&|^~!]/g, // Operators
    /\b(if|else|for|while|function|var|let|const|return|class|import|export)\b/g, // Keywords
    /[A-Z_][A-Z0-9_]*/g, // Constants
  ];
  
  const codeScore = inlineCodePatterns.reduce((score, pattern) => {
    const matches = content.match(pattern);
    return score + (matches ? matches.length : 0);
  }, 0);
  
  // For inline code, be more strict - needs clear code indicators
  return codeScore > 1 && content.length < 50;
};

// Markdown components for chat messages
const markdownComponents = {
  h1: ({children}: any) => <h1 className="text-lg font-bold text-gray-100 mb-2 mt-3">{children}</h1>,
  h2: ({children}: any) => <h2 className="text-base font-bold text-gray-100 mb-2 mt-2">{children}</h2>,
  h3: ({children}: any) => <h3 className="text-xl font-bold text-gray-100 mb-1 mt-2">{children}</h3>,
  p: ({children}: any) => <p className="text-gray-100 leading-relaxed [&:last-child]:mb-0 [li>&]:mt-0 whitespace-pre-wrap">{children}</p>,
  strong: ({children}: any) => <strong className="font-bold text-gray-50">{children}</strong>,
  em: ({children}: any) => <em className="italic text-gray-200">{children}</em>,
  // Handle plain text content that doesn't get parsed as markdown
  text: ({children}: any) => {
    if (typeof children === 'string') {
      // Split by newlines and create paragraphs for each line
      const lines = children.split('\n');
      if (lines.length > 1) {
        return (
          <>
            {lines.map((line, index) => (
              <p key={index} className="text-gray-100 leading-relaxed [&:last-child]:mb-0 [li>&]:mt-0 whitespace-pre-wrap">
                {line}
              </p>
            ))}
          </>
        );
      }
    }
    return <span className="text-gray-100">{children}</span>;
  },
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
        <span className="mr-2 flex-shrink-0 min-w-[1.5rem] text-left leading-none">
          {isOrdered ? `${(index || 0) + 1}.` : '•'}
        </span>
        <span className="flex-1 leading-relaxed">{children}</span>
      </li>
    );
  },
  code: ({children, className}: any) => {
    const content = typeof children === 'string' ? children : '';
    const shouldStyleAsCode = isInlineCode(content);
    
    return shouldStyleAsCode ? (
      <code className="bg-gray-600 px-1 py-0.5 rounded text-xs font-mono text-gray-100">{children}</code>
    ) : (
      <span className="text-gray-100">{children}</span>
    );
  },
  pre: ({children}: any) => {
    const content = typeof children === 'string' ? children : '';
    const shouldStyleAsCode = isCodeContent(content);
    
    return shouldStyleAsCode ? (
      <pre className="bg-gray-600 p-2 rounded overflow-x-auto mb-2 text-xs">{children}</pre>
    ) : (
      <span className="text-gray-100 whitespace-pre-wrap">{children}</span>
    );
  },
  blockquote: ({children}: any) => <blockquote className="border-l-4 border-white/10 pl-3 italic text-gray-300 mb-2">{children}</blockquote>,
};

// Thinking content markdown components (smaller text)
const thinkingMarkdownComponents = {
  h1: ({children}: any) => <h1 className="text-lg font-bold text-gray-200 mb-2 mt-3">{children}</h1>,
  h2: ({children}: any) => <h2 className="text-base font-bold text-gray-200 mb-2 mt-2">{children}</h2>,
  h3: ({children}: any) => <h3 className="text-xl font-bold text-gray-200 mb-1 mt-2">{children}</h3>,
  p: ({children}: any) => <p className="text-gray-300 text-sm leading-relaxed [&:last-child]:mb-0 [li>&]:mt-0 whitespace-pre-wrap">{children}</p>,
  strong: ({children}: any) => <strong className="font-bold text-gray-200">{children}</strong>,
  em: ({children}: any) => <em className="italic text-gray-300">{children}</em>,
  // Handle plain text content that doesn't get parsed as markdown
  text: ({children}: any) => {
    if (typeof children === 'string') {
      // Split by newlines and create paragraphs for each line
      const lines = children.split('\n');
      if (lines.length > 1) {
        return (
          <>
            {lines.map((line, index) => (
              <p key={index} className="text-gray-300 text-sm leading-relaxed [&:last-child]:mb-0 [li>&]:mt-0 whitespace-pre-wrap">
                {line}
              </p>
            ))}
          </>
        );
      }
    }
    return <span className="text-gray-300 text-sm">{children}</span>;
  },
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
        <span className="mr-2 flex-shrink-0 min-w-[1.5rem] text-left leading-none">
          {isOrdered ? `${(index || 0) + 1}.` : '•'}
        </span>
        <span className="flex-1 leading-relaxed">{children}</span>
      </li>
    );
  },
  code: ({children, className}: any) => {
    const content = typeof children === 'string' ? children : '';
    const shouldStyleAsCode = isInlineCode(content);
    
    return shouldStyleAsCode ? (
      <code className="bg-gray-700 px-1 py-0.5 rounded text-xs font-mono text-gray-200">{children}</code>
    ) : (
      <span className="text-gray-200">{children}</span>
    );
  },
  pre: ({children}: any) => {
    const content = typeof children === 'string' ? children : '';
    const shouldStyleAsCode = isCodeContent(content);
    
    return shouldStyleAsCode ? (
      <pre className="bg-gray-700 p-2 rounded overflow-x-auto mb-2 text-xs">{children}</pre>
    ) : (
      <span className="text-gray-200 whitespace-pre-wrap text-sm">{children}</span>
    );
  },
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



  // Scroll to top of the latest message
  const scrollToLatestMessage = useCallback(() => {
    if (messagesContainerRef.current && messages.length > 0) {
      // Find the latest message element
      const messageElements = messagesContainerRef.current.querySelectorAll('.chat-message');
      const latestMessageElement = messageElements[messageElements.length - 1] as HTMLElement;
      
      if (latestMessageElement) {
        // Get the current scroll position
        const container = messagesContainerRef.current;
        const messageTop = latestMessageElement.offsetTop;
        
        // Scroll to the message with 24px offset from the top
        container.scrollTop = messageTop - 24;
      }
    }
  }, [messages.length]);

  // Load messages when conversation changes
  useEffect(() => {
    if (currentConversation) {
      const loadedMessages = currentConversation.messages.map((msg, index) => ({
        id: `${currentConversation.id}_${index}`,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(currentConversation.lastModified)
      }));
      setMessages(loadedMessages);
    } else {
      setMessages([]);
    }
  }, [currentConversation]);

  // Auto-scroll when new messages are added
  useEffect(() => {
    if (messages.length > 0) {
      requestAnimationFrame(scrollToLatestMessage);
    }
  }, [messages.length, scrollToLatestMessage]);

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
      handleSubmit(e as any);
    }
  };

  const handleSystemPromptSave = (newPrompt: string) => {
    onSystemPromptChange(newPrompt);
  };

  // Memoized message rendering for better performance
  const renderMessage = useCallback((message: Message, index: number) => {
    const isAssistant = message.role === 'assistant';
    const isLastMessage = index === messages.length - 1;

    return (
      <div
        key={message.id}
        className={`chat-message ${isLastMessage ? '' : 'mb-4'}`}
      >
        {/* Message Header */}
        <div className="flex items-center justify-between mb-2 chat-message-header pl-4 pr-4">
          <div className="text-sm font-surt-medium text-gray-300">
            {isAssistant ? 'AI' : 'You'}
          </div>
          <span className="text-sm text-gray-400">
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        
        {/* Message Content */}
        <div
          className={`rounded-lg px-4 pt-3 pb-1 chat-message-content ${
            isAssistant
              ? 'text-white/95'
              : 'text-white/95'
          }`}
        >
          <div className="prose prose-invert max-w-none">
            {isAssistant ? (
              <ThinkingMessage content={message.content} />
            ) : (
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={markdownComponents}
              >
                {message.content}
              </ReactMarkdown>
            )}
          </div>
        </div>
      </div>
    );
  }, [messages.length]);

  // Memoized available models
  const availableModels = useMemo(() => [
    { id: 'r1-1776', name: 'R1-1776', description: 'Fast and efficient' },
    { id: 'sonar-pro', name: 'Sonar Pro', description: 'Advanced reasoning' },
    { id: 'grok-3', name: 'Grok 3', description: 'xAI\'s powerful model' },
    { id: 'grok-4-0709', name: 'Grok 4', description: 'xAI\'s latest model' }
  ], []);

  // Memoized rendered messages
  const renderedMessages = useMemo(() => {
    return messages.map((message, index) => renderMessage(message, index));
  }, [messages, renderMessage]);

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
                  
                  // Convert HTML to text while preserving paragraph breaks and bullet points
                  selectedText = htmlContent
                    .replace(/<br\s*\/?>/gi, '\n') // Convert <br> tags to newlines
                    .replace(/<\/p>/gi, '\n\n') // Convert closing </p> tags to double newlines (paragraph breaks)
                    .replace(/<p[^>]*>/gi, '') // Remove opening <p> tags
                    .replace(/<\/li>/gi, '\n') // Convert closing </li> tags to newlines
                    .replace(/<li[^>]*>/gi, '• ') // Convert <li> tags to bullet points
                    .replace(/<\/ul>/gi, '\n\n') // Convert closing </ul> tags to double newlines
                    .replace(/<ul[^>]*>/gi, '') // Remove opening <ul> tags
                    .replace(/<\/ol>/gi, '\n\n') // Convert closing </ol> tags to double newlines
                    .replace(/<ol[^>]*>/gi, '') // Remove opening <ol> tags
                    .replace(/<[^>]*>/g, '') // Remove any other HTML tags
                    .replace(/\n{3,}/g, '\n\n') // Normalize multiple newlines to double newlines
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
                <p className="text-sm leading-relaxed max-w-md mx-auto">
                  Begin your healing journey here
                </p>
              </div>
            ) : (
              renderedMessages
            )}
            
            {isLoading && (
              <div className="chat-message">
                {/* Loading Content - Show only the spinner without header */}
                <div className="text-white/95 rounded-lg px-4 pt-3 pb-1 chat-message-content">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
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
                <TextareaAutosize
                  ref={textareaRef as any}
                  value={inputValue || ''}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message..."
                  className="w-full text-white/95 focus:outline-none px-3 pt-2 pb-3.5 font-surt-medium placeholder:text-gray-400"
                  style={{ 
                    lineHeight: '1.5',
                    resize: 'none'
                  }}
                  disabled={isLoading}
                  minRows={2}
                  maxRows={10}
                />
              </div>
            </div>
                          <div className="flex justify-between items-center flex-shrink-0">
                <div className="relative">
                  <select
                    value={selectedModel}
                    onChange={(e) => onModelChange?.(e.target.value)}
                    className="px-3 py-1 text-xs font-surt-medium bg-white/10 text-white/60 rounded hover:bg-white/20 transition-colors appearance-none cursor-pointer border-none focus:outline-none focus:ring-0 text-center"
                    style={{
                      backgroundImage: 'none',
                      paddingRight: '12px',
                      textAlign: 'center'
                    }}
                    disabled={isLoading}
                  >
                    {availableModels.map((model) => (
                      <option key={model.id} value={model.id} className="bg-gray-800 text-white text-center font-surt-medium">
                        {model.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  {systemPromptTitle && (
                    <span className="mr-1 text-xs font-surt-medium text-white/60 max-w-[120px] truncate align-middle" title={systemPromptTitle}>
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
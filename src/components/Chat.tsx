'use client';

import { useState, FormEvent, useEffect, useRef } from 'react';
import { encryptClientSide, decryptClientSide } from '@/utils/encryption';
import ConversationList from './ConversationList';
import ThinkingMessage from './ThinkingMessage';
import SystemPromptModal from './SystemPromptModal';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export default function Chat() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const [currentConversation, setCurrentConversation] = useState<any>(null);
  const [showConversations, setShowConversations] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('You are a Jungian therapeutic assistant, helping users explore their psyche through the lens of analytical psychology. Respond with depth, empathy, and wisdom.');
  const [showSystemPromptModal, setShowSystemPromptModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Get encryption key from environment
  const encryptionKey = process.env.NEXT_PUBLIC_CLIENT_ENCRYPTION_KEY || process.env.NEXT_PUBLIC_ENCRYPTION_KEY || '';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToAssistantMessage = () => {
    const assistantMessages = document.querySelectorAll('.assistant-message');
    if (assistantMessages.length > 0) {
      const lastAssistantMessage = assistantMessages[assistantMessages.length - 1];
      lastAssistantMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const response = await fetch('/api/conversations');
      const data = await response.json();
      if (data.conversations) {
        setConversations(data.conversations);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const handleConversationSelect = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.conversation) {
          setCurrentConversation(data.conversation);
          setMessages(data.conversation.messages);
        }
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
    setShowConversations(false);
  };

  const handleNewConversation = () => {
    setCurrentConversation(null);
    setMessages([]);
    setShowConversations(false);
  };

  const handleDeleteConversation = (deletedConversationId: string) => {
    if (currentConversation?.id === deletedConversationId) {
      setCurrentConversation(null);
      setMessages([]);
    }
    setConversations(prev => prev.filter(c => c.id !== deletedConversationId));
  };

  const handleConversationUpdate = async (updatedConversation: any) => {
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !encryptionKey) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    // Add user message to chat (unencrypted for display)
    const newUserMessage: Message = { role: 'user', content: userMessage };
    setMessages(prev => [...prev, newUserMessage]);

    // Scroll to bottom after user message is added
    setTimeout(scrollToBottom, 100);

    try {
      // Encrypt the current message, conversation history, and system prompt for API
      const encryptedPrompt = await encryptClientSide(userMessage, encryptionKey);
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
          messages: encryptedMessages
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Decrypt the API response
      const decryptedResponse = await decryptClientSide(data.response, encryptionKey);

      // Add assistant response to chat (unencrypted for display)
      const assistantMessage: Message = { role: 'assistant', content: decryptedResponse };
      setMessages(prev => [...prev, assistantMessage]);

      // Scroll to the assistant message after it's added
      setTimeout(scrollToAssistantMessage, 100);

      // Update conversation
      const updatedConversation = {
        id: currentConversation?.id || `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: currentConversation?.title || generateTitle([newUserMessage, assistantMessage]),
        created: currentConversation?.created || new Date().toISOString(),
        lastModified: new Date().toISOString(),
        messages: [...messages, newUserMessage, assistantMessage]
      };

      setCurrentConversation(updatedConversation);
      await handleConversationUpdate(updatedConversation);

    } catch (error) {
      console.error('Error sending message:', error);
      // Add error message to chat
      const errorMessage: Message = { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateTitle = (messages: Message[]): string => {
    const firstUserMessage = messages.find(m => m.role === 'user');
    if (firstUserMessage) {
      const content = firstUserMessage.content.slice(0, 50);
      return content.length === 50 ? content + '...' : content;
    }
    return 'New Conversation';
  };

  const adjustTextareaHeight = () => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [input]);

  return (
    <div className="flex h-full">
      {/* Conversations Sidebar */}
      <div className={`w-80 bg-gray-900 border-r border-white/10 flex flex-col transition-transform duration-300 ${showConversations ? 'translate-x-0' : '-translate-x-full'}`}>
        <ConversationList
          isOpen={showConversations}
          onClose={() => setShowConversations(false)}
          currentConversationId={currentConversation?.id}
          onConversationSelect={handleConversationSelect}
          onNewConversation={handleNewConversation}
          onDeleteConversation={handleDeleteConversation}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-gray-900">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              <div className="text-6xl mb-4">🧘‍♀️</div>
              <h2 className="text-xl font-semibold mb-2">Welcome to Temenos</h2>
              <p className="text-gray-400">Begin your journey of self-discovery and healing.</p>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-3xl px-4 py-2 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-100 assistant-message'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                </div>
              </div>
            ))
          )}
          
          {isLoading && <ThinkingMessage content="Thinking..." />}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-white/10 p-4 bg-gray-900">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Share your thoughts..."
              className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-gray-100 placeholder-gray-400 resize-none focus:outline-none focus:border-blue-500"
              rows={1}
              disabled={isLoading || !encryptionKey}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading || !encryptionKey}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Send
            </button>
            <button
              type="button"
              onClick={() => setShowSystemPromptModal(true)}
              className="w-10 h-10 bg-gray-700 text-gray-400 hover:text-white hover:bg-gray-600 rounded-full transition-colors flex items-center justify-center"
              title="System Prompt"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </form>
          
          {!encryptionKey && (
            <div className="mt-2 text-red-400 text-sm">
              ⚠️ Encryption key not configured. Chat functionality disabled.
            </div>
          )}
        </div>
      </div>

      {/* System Prompt Modal */}
      <SystemPromptModal
        isOpen={showSystemPromptModal}
        onClose={() => setShowSystemPromptModal(false)}
        currentPrompt={systemPrompt}
        onSave={setSystemPrompt}
      />
    </div>
  );
} 
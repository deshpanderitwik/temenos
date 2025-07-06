'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkSmartypants from 'remark-smartypants';

interface ThinkingMessageProps {
  content: string;
  className?: string;
}

interface ParsedMessage {
  beforeThinking: string;
  thinkingContent: string;
  afterThinking: string;
  hasThinking: boolean;
}

export default function ThinkingMessage({ content, className = '' }: ThinkingMessageProps) {
  const [showThinking, setShowThinking] = useState(false);

  // Common markdown components for main content
  const mainMarkdownComponents = {
    h1: ({children}: any) => <h1 className="text-lg font-bold text-gray-100 mb-2 mt-3">{children}</h1>,
    h2: ({children}: any) => <h2 className="text-base font-bold text-gray-100 mb-2 mt-2">{children}</h2>,
    h3: ({children}: any) => <h3 className="text-xl font-bold text-gray-100 mb-1 mt-2">{children}</h3>,
    p: ({children}: any) => <p className="text-gray-100 mb-6 leading-relaxed [&:last-child]:mb-0 [li>&]:mt-0">{children}</p>,
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
    blockquote: ({children}: any) => <blockquote className="border-l-4 border-white/10 pl-3 italic text-gray-300 mb-2 text-sm">{children}</blockquote>,
  };

  // Smaller markdown components for thinking content
  const thinkingMarkdownComponents = {
    h1: ({children}: any) => <h1 className="text-lg font-bold text-gray-200 mb-2 mt-0">{children}</h1>,
    h2: ({children}: any) => <h2 className="text-base font-bold text-gray-200 mb-2 mt-0">{children}</h2>,
    h3: ({children}: any) => <h3 className="text-sm font-bold text-gray-200 mb-1 mt-0">{children}</h3>,
    p: ({children}: any) => <p className="text-gray-300 text-sm mb-4 leading-relaxed [&:last-child]:mb-0 [li>&]:mt-0">{children}</p>,
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

  // Parse the message to extract thinking content
  const parseMessage = (text: string): ParsedMessage => {
    const thinkRegex = /<think>([\s\S]*?)<\/think>/i;
    const match = text.match(thinkRegex);
    
    if (!match) {
      return {
        beforeThinking: text,
        thinkingContent: '',
        afterThinking: '',
        hasThinking: false
      };
    }

    const fullMatch = match[0];
    const thinkingContent = match[1].trim();
    const beforeThinking = text.substring(0, match.index).trim();
    const afterThinking = text.substring((match.index || 0) + fullMatch.length).trim();

    return {
      beforeThinking,
      thinkingContent,
      afterThinking,
      hasThinking: true
    };
  };

  const parsed = parseMessage(content);

  if (!parsed.hasThinking) {
    // No thinking content, display normally with markdown
    return (
      <div className={className}>
        <ReactMarkdown 
          remarkPlugins={[remarkGfm, remarkSmartypants]}
          components={mainMarkdownComponents}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Content before thinking */}
      {parsed.beforeThinking && (
        <div className="mb-3">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm, remarkSmartypants]}
            components={mainMarkdownComponents}
          >
            {parsed.beforeThinking}
          </ReactMarkdown>
        </div>
      )}

      {/* Thinking toggle button */}
      {parsed.thinkingContent && (
        <div className="my-3">
          <button
            onClick={() => setShowThinking(!showThinking)}
            className="px-3 py-1 text-xs bg-white/10 text-white/60 hover:text-white hover:bg-white/20 transition-colors rounded-full"
          >
            {showThinking ? 'Hide' : 'Show'} Thinking
          </button>

          {/* Thinking content (collapsible) */}
          {showThinking && (
            <section className="mt-3 bg-white/10 rounded-lg px-[20px] py-2 pb-4 [&>*]:m-0">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm, remarkSmartypants]}
                components={thinkingMarkdownComponents}
              >
                {parsed.thinkingContent}
              </ReactMarkdown>
            </section>
          )}
        </div>
      )}

      {/* Content after thinking */}
      {parsed.afterThinking && (
        <div>
          <ReactMarkdown 
            remarkPlugins={[remarkGfm, remarkSmartypants]}
            components={mainMarkdownComponents}
          >
            {parsed.afterThinking}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
} 
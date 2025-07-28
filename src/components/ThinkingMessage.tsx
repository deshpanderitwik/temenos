'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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

  // Common markdown components for main content
  const mainMarkdownComponents = {
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
    blockquote: ({children}: any) => <blockquote className="border-l-4 border-white/10 pl-3 italic text-gray-300 mb-2 text-base">{children}</blockquote>,
  };

  // Smaller markdown components for thinking content
  const thinkingMarkdownComponents = {
    h1: ({children}: any) => <h1 className="text-lg font-bold text-gray-200 mb-2 mt-0">{children}</h1>,
    h2: ({children}: any) => <h2 className="text-base font-bold text-gray-200 mb-2 mt-0">{children}</h2>,
    h3: ({children}: any) => <h3 className="text-sm font-bold text-gray-200 mb-1 mt-0">{children}</h3>,
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
          remarkPlugins={[remarkGfm]}
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
        <div>
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={mainMarkdownComponents}
          >
            {parsed.beforeThinking}
          </ReactMarkdown>
        </div>
      )}

      {/* Thinking toggle button */}
      {parsed.thinkingContent && (
        <div>
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
                remarkPlugins={[remarkGfm]}
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
            remarkPlugins={[remarkGfm]}
            components={mainMarkdownComponents}
          >
            {parsed.afterThinking}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
} 
'use client';

import { useMemo } from 'react';
import { getTokenInfo, formatTokenCount, getModelContextWindow, estimateTokens } from '@/utils/tokenCount';

interface TokenCountDisplayProps {
  messages: Array<{ role: string; content: string; usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number } }>;
  systemPrompt: string;
  selectedModel: string;
  className?: string;
}

export default function TokenCountDisplay({ 
  messages, 
  systemPrompt, 
  selectedModel, 
  className = ''
}: TokenCountDisplayProps) {
  const tokenInfo = useMemo(() => {
    const maxTokens = getModelContextWindow(selectedModel);
    
    // Calculate cumulative tokens from all messages
    let cumulativeTokens = 0;
    
    // Add system prompt tokens with role overhead
    if (systemPrompt) {
      cumulativeTokens += 2; // Role overhead for system message
      cumulativeTokens += estimateTokens(systemPrompt);
    }
    
    // Add tokens from all messages in the conversation
    // Always use our estimation for consistency
    for (const message of messages) {
      // Add role overhead based on message role
      if (message.role === 'user') {
        cumulativeTokens += 2; // User role overhead
      } else if (message.role === 'assistant') {
        cumulativeTokens += 2; // Assistant role overhead
      } else {
        cumulativeTokens += 3; // Other roles overhead
      }
      // Add content tokens
      cumulativeTokens += estimateTokens(message.content);
    }
    
    const percentageUsed = (cumulativeTokens / maxTokens) * 100;
    const isNearLimit = percentageUsed > 80;
    
    return {
      estimatedTokens: cumulativeTokens,
      maxTokens,
      percentageUsed,
      isNearLimit
    };
  }, [messages, systemPrompt, selectedModel]);

  if (tokenInfo.estimatedTokens === 0) {
    return null;
  }

  return (
    <div className={`text-xs text-gray-400 mt-4 ${className}`}>
      <span className={`${tokenInfo.isNearLimit ? 'text-orange-400' : 'text-gray-400'}`}>
        {formatTokenCount(tokenInfo.estimatedTokens)} (estimated)
        {tokenInfo.isNearLimit && ' (near limit)'}
      </span>
    </div>
  );
} 
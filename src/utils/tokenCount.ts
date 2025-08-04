// Simple token estimation utility
// This is a rough approximation - actual token counts may vary by model

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface ConversationTokenInfo {
  estimatedTokens: number;
  maxTokens: number;
  percentageUsed: number;
  isNearLimit: boolean;
}

// More accurate token estimation based on actual tokenizer behavior
// This better approximates how real tokenizers work
export function estimateTokens(text: string): number {
  if (!text) return 0;
  
  // Use a more sophisticated approach that better matches actual tokenizer behavior
  return estimateTokensAdvanced(text);
}

// Advanced token estimation that better matches actual tokenizer behavior
function estimateTokensAdvanced(text: string): number {
  // Split into words and handle each word more accurately
  const words = text.split(/\s+/);
  let tokenCount = 0;
  
  for (const word of words) {
    if (!word) continue;
    
    // Handle different word types - more generous estimation
    if (word.match(/^[a-zA-Z]+$/)) {
      // Pure English word - more generous estimation
      // Most English words are 1 token, with longer words being split less aggressively
      if (word.length <= 6) {
        tokenCount += 1;
      } else if (word.length <= 10) {
        tokenCount += 1.2;
      } else if (word.length <= 15) {
        tokenCount += 1.5;
      } else {
        tokenCount += Math.ceil(word.length / 8); // More generous for longer words
      }
    } else if (word.match(/^[0-9]+$/)) {
      // Pure numbers - often 1 token
      tokenCount += 1;
    } else if (word.match(/^[a-zA-Z0-9]+$/)) {
      // Alphanumeric - more generous estimation
      tokenCount += Math.ceil(word.length / 6);
    } else if (word.match(/[\u4e00-\u9fff]/)) {
      // Contains Chinese characters
      const chineseChars = word.match(/[\u4e00-\u9fff]/g) || [];
      const otherChars = word.replace(/[\u4e00-\u9fff]/g, '');
      
      tokenCount += chineseChars.length; // 1 token per Chinese character
      if (otherChars) {
        tokenCount += Math.ceil(otherChars.length / 5); // More generous
      }
    } else {
      // Mixed content - more generous character-based estimation
      tokenCount += Math.ceil(word.length / 5);
    }
  }
  
  // Add tokens for special characters and formatting - more conservative
  const specialChars = text.match(/[^\w\s]/g) || [];
  for (const char of specialChars) {
    if (char.match(/[.,!?;:]/)) {
      tokenCount += 0.2; // Less aggressive for punctuation
    } else if (char.match(/["'`]/)) {
      tokenCount += 0.3; // Less aggressive for quotes
    } else if (char.match(/[()[\]{}]/)) {
      tokenCount += 0.3; // Less aggressive for brackets
    } else {
      tokenCount += 0.3; // Less aggressive for other special characters
    }
  }
  
  // Add tokens for newlines and paragraph breaks - more conservative
  const newlines = (text.match(/\n/g) || []).length;
  tokenCount += newlines * 0.3; // Less aggressive for newlines
  
  return Math.ceil(tokenCount);
}



// Calculate total tokens for a conversation
export function calculateConversationTokens(
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string = ''
): number {
  let totalTokens = 0;
  
  // Add system prompt tokens with role overhead - more conservative
  if (systemPrompt) {
    totalTokens += 2; // Reduced role overhead for system message
    totalTokens += estimateTokens(systemPrompt);
  }
  
  // Add message tokens
  for (const message of messages) {
    // Add role overhead - more conservative estimates
    if (message.role === 'user') {
      totalTokens += 2; // Reduced user role overhead
    } else if (message.role === 'assistant') {
      totalTokens += 2; // Reduced assistant role overhead
    } else {
      totalTokens += 3; // Reduced other roles overhead
    }
    
    // Add content tokens
    totalTokens += estimateTokens(message.content);
  }
  
  return totalTokens;
}

// Get token usage information for display
export function getTokenInfo(
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string = '',
  maxTokens: number = 32000 // Default context window
): ConversationTokenInfo {
  const estimatedTokens = calculateConversationTokens(messages, systemPrompt);
  const percentageUsed = (estimatedTokens / maxTokens) * 100;
  const isNearLimit = percentageUsed > 80;
  
  return {
    estimatedTokens,
    maxTokens,
    percentageUsed,
    isNearLimit
  };
}

// Format token count for display
export function formatTokenCount(tokens: number): string {
  if (tokens < 1000) {
    return `${tokens} tokens`;
  } else if (tokens < 1000000) {
    return `${(tokens / 1000).toFixed(1)}k tokens`;
  } else {
    return `${(tokens / 1000000).toFixed(1)}M tokens`;
  }
}

// Get context window size for different models
export function getModelContextWindow(model: string): number {
  const contextWindows: Record<string, number> = {
    'grok-3': 8192,
    'grok-4-0709': 256000,
    'default': 256000
  };
  
  return contextWindows[model] || contextWindows.default;
} 
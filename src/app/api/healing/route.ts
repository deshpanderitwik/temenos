import { NextResponse } from 'next/server';
import { DEFAULT_SYSTEM_PROMPT } from '@/utils/constants';

// Types for our request body
interface HealingRequest {
  prompt: string;
  systemPrompt?: string;
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  model?: string;
}

export async function POST(request: Request) {
  try {
    // Get the API keys from environment variables
    const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
    const XAI_API_KEY = process.env.XAI_API_KEY;
    const ENCRYPTION_KEY = process.env.NEXT_PUBLIC_CLIENT_ENCRYPTION_KEY;
    
    if (!ENCRYPTION_KEY) {
      return NextResponse.json(
        { error: 'Encryption key not configured' },
        { status: 500 }
      );
    }

    // Parse the request body
    const body: HealingRequest = await request.json();
    
    // Use the provided model or default to r1-1776
    const modelToUse = body.model || 'r1-1776';
    
    // Check if we need xAI API key for Grok models
    if (modelToUse === 'grok-4-0709' || modelToUse === 'grok-3') {
      if (!XAI_API_KEY) {
        return NextResponse.json(
          { error: 'xAI API key not configured' },
          { status: 500 }
        );
      }
    } else {
      // For Perplexity models
      if (!PERPLEXITY_API_KEY) {
        return NextResponse.json(
          { error: 'Perplexity API key not configured' },
          { status: 500 }
        );
      }
    }
    
    if (!body.prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    try {
      // Decrypt the incoming prompt and messages using client-side decryption
      const { decryptClientSide } = await import('@/utils/encryption');
      const decryptedPrompt = await decryptClientSide(body.prompt, ENCRYPTION_KEY);
      const decryptedMessages = await Promise.all(
        body.messages.map(async (msg) => ({
          role: msg.role,
          content: await decryptClientSide(msg.content, ENCRYPTION_KEY)
        }))
      );

      // Decrypt the system prompt if provided, otherwise use default
      let systemPromptContent = DEFAULT_SYSTEM_PROMPT;
      if (body.systemPrompt) {
        systemPromptContent = await decryptClientSide(body.systemPrompt, ENCRYPTION_KEY);
      }

      // Build a clean message array with proper alternation
      let messages = [
        {
          role: 'system',
          content: systemPromptContent
        }
      ];

      // Only send the most recent messages to avoid issues with long conversation history
      // Take the last 10 messages to keep the context manageable
      const recentMessages = decryptedMessages.slice(-10);
      
      // Filter out system messages and build alternating conversation
      const conversationMessages = recentMessages.filter(msg => msg.role !== 'system');
      
      // Build alternating message sequence
      let currentRole = 'user'; // Start with user after system
      for (let i = 0; i < conversationMessages.length; i++) {
        const msg = conversationMessages[i];
        
        // Only add messages that match the expected alternation pattern
        if (msg.role === currentRole) {
          messages.push(msg);
          // Switch to the opposite role for next message
          currentRole = currentRole === 'user' ? 'assistant' : 'user';
        }
      }

      // Always add the new user prompt as a separate message
      // If the last message was already from user, this will create consecutive user messages
      // So we need to check and handle this case
      if (messages.length > 0 && messages[messages.length - 1].role === 'user') {
        // If last message is user, we need to either:
        // 1. Append to the last user message, or
        // 2. Skip the last user message and add this one
        // Let's append to maintain conversation flow
        messages[messages.length - 1].content += '\n\n' + decryptedPrompt;
      } else {
        // Add as new user message
        messages.push({
          role: 'user',
          content: decryptedPrompt
        });
      }

      // Validate message format before sending to API

      // Validate message format before sending to API
      if (messages.length < 2) {
        return NextResponse.json(
          { error: 'Invalid message format: need at least system and user messages' },
          { status: 400 }
        );
      }

      // Ensure proper alternation after system message
      const messagesAfterSystem = messages.slice(1);
      for (let i = 1; i < messagesAfterSystem.length; i++) {
        if (messagesAfterSystem[i].role === messagesAfterSystem[i-1].role) {
          return NextResponse.json(
            { error: 'Invalid message format: consecutive messages of same role' },
            { status: 400 }
          );
        }
      }

      // Check message sizes and truncate if necessary
      const maxMessageLength = 4000; // Perplexity has limits on message length
      messages = messages.map(msg => ({
        ...msg,
        content: msg.content.length > maxMessageLength 
          ? msg.content.substring(0, maxMessageLength) + '...'
          : msg.content
      }));

      // Call the appropriate API based on the selected model
      let response;
      const apiStartTime = Date.now();
      
      if (modelToUse === 'grok-4-0709' || modelToUse === 'grok-3') {
        // Call xAI API for Grok models
        console.log(`[xAI API] Sending request to ${modelToUse} at ${new Date().toISOString()}`);
        response = await fetch('https://api.x.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${XAI_API_KEY}`
          },
          body: JSON.stringify({
            model: modelToUse,
            messages,
            stream: false,
            temperature: 0.6
          })
        });
        const apiEndTime = Date.now();
        const apiDuration = apiEndTime - apiStartTime;
        console.log(`[xAI API] Response received from ${modelToUse} in ${apiDuration}ms at ${new Date().toISOString()}`);
      } else {
        // Call Perplexity API for other models
        console.log(`[Perplexity API] Sending request to ${modelToUse} at ${new Date().toISOString()}`);
        response = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${PERPLEXITY_API_KEY}`
          },
          body: JSON.stringify({
            model: modelToUse,
            messages,
            max_tokens: 10000,
            temperature: 0.6   // Slightly creative but focused responses
          })
        });
        const apiEndTime = Date.now();
        const apiDuration = apiEndTime - apiStartTime;
        console.log(`[Perplexity API] Response received from ${modelToUse} in ${apiDuration}ms at ${new Date().toISOString()}`);
      }

      if (!response.ok) {
        const error = await response.text();
        const apiName = (modelToUse === 'grok-4-0709' || modelToUse === 'grok-3') ? 'xAI' : 'Perplexity';
        return NextResponse.json(
          { error: `${apiName} API error: ${error}` },
          { status: response.status }
        );
      }

      const data = await response.json();
      
      // Encrypt the response using client-side encryption
      const { encryptClientSide } = await import('@/utils/encryption');
      const aiResponse = data.choices[0].message.content;
      const encryptedResponse = await encryptClientSide(aiResponse, ENCRYPTION_KEY);
      
      return NextResponse.json({
        response: encryptedResponse,
        usage: data.usage
      });
    } catch (decryptionError) {
      return NextResponse.json(
        { error: 'Failed to decrypt request data' },
        { status: 400 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
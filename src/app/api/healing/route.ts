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
    const XAI_API_KEY = process.env.XAI_API_KEY;

    // Parse the request body
    const body: HealingRequest = await request.json();
    
    // Use the provided model or default to grok-4-0709
    const modelToUse = body.model || 'grok-4-0709';
    
    // Check if xAI API key is configured
    if (!XAI_API_KEY) {
      return NextResponse.json(
        { error: 'xAI API key not configured' },
        { status: 500 }
      );
    }
    
    if (!body.prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    try {
      // Data is now received as plain text - no decryption needed
      const decryptedPrompt = body.prompt;
      const decryptedMessages = body.messages;

      // Use provided system prompt or default
      let systemPromptContent = body.systemPrompt || DEFAULT_SYSTEM_PROMPT;

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

      // Call xAI API
      const apiStartTime = Date.now();
      const response = await fetch('https://api.x.ai/v1/chat/completions', {
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

      const apiDuration = Date.now() - apiStartTime;

      if (!response.ok) {
        const error = await response.text();
        return NextResponse.json(
          { error: `xAI API error: ${error}` },
          { status: response.status }
        );
      }

      const data = await response.json();
      
      // Return plain text response
      const aiResponse = data.choices[0].message.content;
      
      return NextResponse.json({
        response: aiResponse,
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
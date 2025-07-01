import { NextResponse } from 'next/server';
import { encrypt, decrypt } from '@/utils/encryption';

// Types for our request body
interface HealingRequest {
  prompt: string;
  systemPrompt?: string;
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
}

export async function POST(request: Request) {
  try {
    console.log('Healing API called');
    
    // Get the API keys from environment variables
    const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
    const ENCRYPTION_KEY = process.env.NEXT_PUBLIC_CLIENT_ENCRYPTION_KEY;
    
    if (!PERPLEXITY_API_KEY) {
      return NextResponse.json(
        { error: 'Perplexity API key not configured' },
        { status: 500 }
      );
    }

    if (!ENCRYPTION_KEY) {
      return NextResponse.json(
        { error: 'Encryption key not configured' },
        { status: 500 }
      );
    }

    console.log('API keys found, parsing request body');

    // Parse the request body
    const body: HealingRequest = await request.json();
    
    if (!body.prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    console.log('Request body parsed, starting decryption');

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

      console.log('Processing request with', decryptedMessages.length, 'messages');

      // Decrypt the system prompt if provided, otherwise use default
      let systemPromptContent = 'You are a Jungian therapeutic assistant, helping users explore their psyche through the lens of analytical psychology. Respond with depth, empathy, and wisdom.';
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
      
      // Log the roles from conversation history for debugging
      const historyRoles = recentMessages.map(msg => msg.role);
      console.log('Roles from conversation history:', historyRoles);
      
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
        } else {
          console.log(`Skipping ${msg.role} message - expected ${currentRole} for alternation`);
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
        console.log('Appended new prompt to existing user message');
      } else {
        // Add as new user message
        messages.push({
          role: 'user',
          content: decryptedPrompt
        });
        console.log('Added new user message');
      }

      // Log only the message structure (roles) for debugging, not content
      const messageRoles = messages.map(msg => msg.role);
      console.log('Message roles being sent:', messageRoles);
      
      // Additional debugging: count each role type
      const roleCounts = messageRoles.reduce((acc, role) => {
        acc[role] = (acc[role] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log('Role counts:', roleCounts);
      
      // Temporary debugging: log the actual messages being sent
      console.log('DEBUG: Messages being sent to API:');
      messages.forEach((msg, index) => {
        console.log(`  ${index}: role=${msg.role}, content_length=${msg.content.length}`);
      });

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
          console.error('Invalid message format: consecutive messages of same role detected');
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

      // Call Perplexity API with decrypted data
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${PERPLEXITY_API_KEY}`
        },
        body: JSON.stringify({
          model: 'r1-1776',
          messages,
          max_tokens: 10000,
          temperature: 0.6   // Slightly creative but focused responses
        })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Perplexity API error:', error);
        return NextResponse.json(
          { error: `Perplexity API error: ${error}` },
          { status: response.status }
        );
      }

      const data = await response.json();
      
      // Encrypt the response using client-side encryption
      const { encryptClientSide } = await import('@/utils/encryption');
      const aiResponse = data.choices[0].message.content;
      const encryptedResponse = await encryptClientSide(aiResponse, ENCRYPTION_KEY);
      
      return NextResponse.json({
        response: encryptedResponse
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'X-XSS-Protection': '1; mode=block'
        }
      });

    } catch (encryptionError) {
      console.error('Encryption/Decryption error:', encryptionError);
      return NextResponse.json(
        { error: 'Failed to process encrypted data' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
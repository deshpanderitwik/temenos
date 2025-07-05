import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { encrypt, validateEncryptionKey } from '@/utils/encryption';
import { smartDecrypt } from '@/utils/migration';

const CONVERSATIONS_DIR = path.join(process.cwd(), 'data', 'conversations');

interface Conversation {
  id: string;
  title: string;
  created: string;
  lastModified: string;
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
}

interface ConversationMetadata {
  id: string;
  title: string;
  created: string;
  lastModified: string;
  messageCount: number;
}

// Ensure conversations directory exists
async function ensureConversationsDir() {
  try {
    await fs.access(CONVERSATIONS_DIR);
  } catch {
    await fs.mkdir(CONVERSATIONS_DIR, { recursive: true });
  }
}

// Generate a title from the first user message
function generateTitle(messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>): string {
  const firstUserMessage = messages.find(msg => msg.role === 'user');
  if (firstUserMessage) {
    const content = firstUserMessage.content.trim();
    if (content.length <= 50) {
      return content;
    }
    return content.substring(0, 47) + '...';
  }
  return 'New Conversation';
}

// GET /api/conversations - List all conversations
export async function GET() {
  try {
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
    if (!ENCRYPTION_KEY) {
      return NextResponse.json({ error: 'Encryption key not configured' }, { status: 500 });
    }

    // Validate encryption key format
    if (!validateEncryptionKey(ENCRYPTION_KEY)) {
      return NextResponse.json({ error: 'Invalid encryption key format' }, { status: 500 });
    }

    await ensureConversationsDir();

    const files = await fs.readdir(CONVERSATIONS_DIR);
    const conversationFiles = files.filter(file => file.endsWith('.enc'));

    const conversations = await Promise.all(
      conversationFiles.map(async (filename) => {
        try {
          const filePath = path.join(CONVERSATIONS_DIR, filename);
          const encryptedContent = await fs.readFile(filePath, 'utf-8');
          const decryptedContent = await smartDecrypt(encryptedContent, ENCRYPTION_KEY);
          const conversation: Conversation = JSON.parse(decryptedContent);
          
          return {
            id: conversation.id,
            title: conversation.title,
            created: conversation.created,
            lastModified: conversation.lastModified,
            messageCount: conversation.messages.length
          };
        } catch (error) {
          // Silent error handling for privacy
          return null;
        }
      })
    );

    const validConversations = conversations.filter((c): c is NonNullable<typeof c> => c !== null).sort((a, b) => 
      new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
    );

    return NextResponse.json({ conversations: validConversations });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to list conversations' }, { status: 500 });
  }
}

// POST /api/conversations - Create or update a conversation
export async function POST(request: Request) {
  try {
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
    if (!ENCRYPTION_KEY) {
      return NextResponse.json({ error: 'Encryption key not configured' }, { status: 500 });
    }

    // Validate encryption key format
    if (!validateEncryptionKey(ENCRYPTION_KEY)) {
      return NextResponse.json({ error: 'Invalid encryption key format' }, { status: 500 });
    }

    const body = await request.json();
    const { id, messages } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
    }

    await ensureConversationsDir();

    const conversationId = id || `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    const conversation: Conversation = {
      id: conversationId,
      title: generateTitle(messages),
      created: id ? (await getExistingCreatedDate(conversationId)) || now : now,
      lastModified: now,
      messages
    };

    const encryptedContent = await encrypt(JSON.stringify(conversation), ENCRYPTION_KEY);
    const filePath = path.join(CONVERSATIONS_DIR, `${conversationId}.enc`);
    
    await fs.writeFile(filePath, encryptedContent, 'utf-8');

    return NextResponse.json({ 
      success: true, 
      conversationId,
      title: conversation.title 
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save conversation' }, { status: 500 });
  }
}

// Helper function to get existing creation date
async function getExistingCreatedDate(conversationId: string): Promise<string | null> {
  try {
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
    if (!ENCRYPTION_KEY) return null;

    const filePath = path.join(CONVERSATIONS_DIR, `${conversationId}.enc`);
    const encryptedContent = await fs.readFile(filePath, 'utf-8');
    const decryptedContent = await smartDecrypt(encryptedContent, ENCRYPTION_KEY);
    const conversation: Conversation = JSON.parse(decryptedContent);
    return conversation.created;
  } catch {
    return null;
  }
} 
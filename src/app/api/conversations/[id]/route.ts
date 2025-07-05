import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { validateEncryptionKey } from '@/utils/encryption';
import { smartDecrypt } from '@/utils/migration';

const CONVERSATIONS_DIR = path.join(process.cwd(), 'data', 'conversations');

interface Conversation {
  id: string;
  title: string;
  created: string;
  lastModified: string;
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
}

// GET /api/conversations/[id] - Load specific conversation
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
    if (!ENCRYPTION_KEY) {
      return NextResponse.json({ error: 'Encryption key not configured' }, { status: 500 });
    }

    // Validate encryption key format
    if (!validateEncryptionKey(ENCRYPTION_KEY)) {
      return NextResponse.json({ error: 'Invalid encryption key format' }, { status: 500 });
    }

    const { id: conversationId } = await params;
    const filePath = path.join(CONVERSATIONS_DIR, `${conversationId}.enc`);

    try {
      const encryptedContent = await fs.readFile(filePath, 'utf-8');
      const decryptedContent = await smartDecrypt(encryptedContent, ENCRYPTION_KEY);
      const conversation: Conversation = JSON.parse(decryptedContent);

      return NextResponse.json({ conversation });
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      }
      throw error;
    }
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load conversation' }, { status: 500 });
  }
}

// DELETE /api/conversations/[id] - Delete a conversation
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
    const filePath = path.join(CONVERSATIONS_DIR, `${conversationId}.enc`);

    try {
      await fs.unlink(filePath);
      return NextResponse.json({ success: true });
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      }
      throw error;
    }
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete conversation' }, { status: 500 });
  }
} 
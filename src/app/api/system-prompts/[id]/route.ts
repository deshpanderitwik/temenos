import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { validateEncryptionKey } from '@/utils/encryption';
import { smartDecrypt } from '@/utils/migration';

const SYSTEM_PROMPTS_DIR = path.join(process.cwd(), 'data', 'system-prompts');

interface SystemPrompt {
  id: string;
  name: string;
  prompt: string;
  created: string;
  lastModified: string;
  characterCount: number;
}

// GET /api/system-prompts/[id] - Get a specific system prompt
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

    const { id } = await params;
    const filePath = path.join(SYSTEM_PROMPTS_DIR, `${id}.enc`);

    try {
      const encryptedContent = await fs.readFile(filePath, 'utf-8');
      const decryptedContent = await smartDecrypt(encryptedContent, ENCRYPTION_KEY);
      const systemPrompt: SystemPrompt = JSON.parse(decryptedContent);

      return NextResponse.json({ systemPrompt });
    } catch (fileError) {
      return NextResponse.json({ error: 'System prompt not found' }, { status: 404 });
    }
  } catch (error) {
    console.error('Error retrieving system prompt');
    return NextResponse.json({ error: 'Failed to retrieve system prompt' }, { status: 500 });
  }
}

// DELETE /api/system-prompts/[id] - Delete a system prompt
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const filePath = path.join(SYSTEM_PROMPTS_DIR, `${id}.enc`);

    try {
      await fs.unlink(filePath);
      return NextResponse.json({ success: true });
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return NextResponse.json({ error: 'System prompt not found' }, { status: 404 });
      }
      throw error;
    }
  } catch (error) {
    console.error('Error deleting system prompt');
    return NextResponse.json({ error: 'Failed to delete system prompt' }, { status: 500 });
  }
} 
import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { validateEncryptionKey } from '@/utils/encryption';
import { smartDecrypt } from '@/utils/migration';
import { NextRequest } from 'next/server';

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
    return NextResponse.json({ error: 'Failed to retrieve system prompt' }, { status: 500 });
  }
}

// Ensure global in-memory prompts array exists
if (!(globalThis as any).__systemPrompts) {
  (globalThis as any).__systemPrompts = [];
}
const prompts: any[] = (globalThis as any).__systemPrompts;

// DELETE /api/system-prompts/[id] - Delete a system prompt
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const index = prompts.findIndex((p: any) => p.id === id);
  if (index === -1) {
    return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
  }
  prompts.splice(index, 1);
  return NextResponse.json({ success: true });
} 
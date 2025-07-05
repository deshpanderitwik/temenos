import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { validateEncryptionKey, encrypt } from '@/utils/encryption';
import { smartDecrypt } from '@/utils/migration';
import { NextRequest } from 'next/server';

const SYSTEM_PROMPTS_DIR = path.join(process.cwd(), 'data', 'system-prompts');

interface SystemPrompt {
  id: string;
  title: string;
  body: string;
  created: string;
  lastModified: string;
}

// Ensure system prompts directory exists
async function ensureSystemPromptsDir() {
  try {
    await fs.access(SYSTEM_PROMPTS_DIR);
  } catch {
    await fs.mkdir(SYSTEM_PROMPTS_DIR, { recursive: true });
  }
}

// Save system prompt to encrypted file
async function saveSystemPromptToFile(prompt: SystemPrompt): Promise<void> {
  try {
    await ensureSystemPromptsDir();
    
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
    if (!ENCRYPTION_KEY || !validateEncryptionKey(ENCRYPTION_KEY)) {
      throw new Error('Encryption key not configured or invalid');
    }

    const filePath = path.join(SYSTEM_PROMPTS_DIR, `${prompt.id}.enc`);
    const encryptedContent = await encrypt(JSON.stringify(prompt), ENCRYPTION_KEY);
    await fs.writeFile(filePath, encryptedContent, 'utf-8');
  } catch (error) {
    console.error('Error saving system prompt to file:', error);
    throw error;
  }
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

// PUT /api/system-prompts/[id] - Update a system prompt
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { title, body } = await request.json();
    
    if (!title || !body) {
      return NextResponse.json({ error: 'Title and body are required.' }, { status: 400 });
    }

    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
    if (!ENCRYPTION_KEY || !validateEncryptionKey(ENCRYPTION_KEY)) {
      return NextResponse.json({ error: 'Encryption key not configured' }, { status: 500 });
    }

    const filePath = path.join(SYSTEM_PROMPTS_DIR, `${id}.enc`);

    try {
      // Read existing prompt to preserve created date
      const encryptedContent = await fs.readFile(filePath, 'utf-8');
      const decryptedContent = await smartDecrypt(encryptedContent, ENCRYPTION_KEY);
      const existingPrompt: SystemPrompt = JSON.parse(decryptedContent);

      // Update the prompt
      const updatedPrompt: SystemPrompt = {
        ...existingPrompt,
        title,
        body,
        lastModified: new Date().toISOString(),
      };

      // Save to file
      await saveSystemPromptToFile(updatedPrompt);

      // Update in-memory array if it exists
      if ((globalThis as any).__systemPrompts) {
        const prompts: SystemPrompt[] = (globalThis as any).__systemPrompts;
        const index = prompts.findIndex(p => p.id === id);
        if (index !== -1) {
          prompts[index] = updatedPrompt;
        }
      }

      return NextResponse.json({ prompt: updatedPrompt });
    } catch (fileError) {
      return NextResponse.json({ error: 'System prompt not found' }, { status: 404 });
    }
  } catch (error) {
    console.error('Error updating system prompt:', error);
    return NextResponse.json({ error: 'Failed to update system prompt' }, { status: 500 });
  }
}

// Ensure global in-memory prompts array exists
if (!(globalThis as any).__systemPrompts) {
  (globalThis as any).__systemPrompts = [];
}
const prompts: any[] = (globalThis as any).__systemPrompts;

// DELETE /api/system-prompts/[id] - Delete a system prompt
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    
    // Remove from in-memory array
    const index = prompts.findIndex((p: any) => p.id === id);
    if (index === -1) {
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
    }
    prompts.splice(index, 1);
    
    // Also delete the encrypted file from filesystem
    const filePath = path.join(SYSTEM_PROMPTS_DIR, `${id}.enc`);
    try {
      await fs.unlink(filePath);
    } catch (fileError) {
      // File might not exist, which is fine
      console.log(`File ${filePath} not found for deletion`);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting system prompt:', error);
    return NextResponse.json({ error: 'Failed to delete system prompt' }, { status: 500 });
  }
} 
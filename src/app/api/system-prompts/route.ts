import { NextResponse, NextRequest } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { encrypt, validateEncryptionKey } from '@/utils/encryption';
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

interface SystemPromptMetadata {
  id: string;
  name: string;
  created: string;
  lastModified: string;
  characterCount: number;
}

// Ensure system prompts directory exists
async function ensureSystemPromptsDir() {
  try {
    await fs.access(SYSTEM_PROMPTS_DIR);
  } catch {
    await fs.mkdir(SYSTEM_PROMPTS_DIR, { recursive: true });
  }
}

// Ensure global in-memory prompts array exists
if (!(globalThis as any).__systemPrompts) {
  (globalThis as any).__systemPrompts = [];
}
const prompts: any[] = (globalThis as any).__systemPrompts;

// GET /api/system-prompts - List all system prompts
export async function GET() {
  return NextResponse.json({ prompts });
}

// POST /api/system-prompts - Create or update system prompt
export async function POST(req: NextRequest) {
  try {
    const { title, body } = await req.json();
    if (!title || !body) {
      return NextResponse.json({ error: 'Title and body are required.' }, { status: 400 });
    }
    const now = new Date().toISOString();
    const prompt = {
      id: Math.random().toString(36).slice(2),
      title,
      body,
      created: now,
      lastModified: now,
    };
    prompts.push(prompt);
    return NextResponse.json({ prompt });
  } catch (e) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
} 
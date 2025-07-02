import { NextResponse } from 'next/server';
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

// GET /api/system-prompts - List all system prompts
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

    await ensureSystemPromptsDir();

    const files = await fs.readdir(SYSTEM_PROMPTS_DIR);
    const promptFiles = files.filter(file => file.endsWith('.enc'));

    const systemPrompts = await Promise.all(
      promptFiles.map(async (filename) => {
        try {
          const filePath = path.join(SYSTEM_PROMPTS_DIR, filename);
          const encryptedContent = await fs.readFile(filePath, 'utf-8');
          const decryptedContent = await smartDecrypt(encryptedContent, ENCRYPTION_KEY);
          const systemPrompt: SystemPrompt = JSON.parse(decryptedContent);
          
          return {
            id: systemPrompt.id,
            name: systemPrompt.name,
            created: systemPrompt.created,
            lastModified: systemPrompt.lastModified,
            characterCount: systemPrompt.characterCount
          };
        } catch (error) {
          console.error(`Error reading system prompt file ${filename}`);
          return null;
        }
      })
    );

    const validSystemPrompts = systemPrompts.filter((p): p is NonNullable<typeof p> => p !== null).sort((a, b) => 
      new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
    );

    return NextResponse.json({ systemPrompts: validSystemPrompts });
  } catch (error) {
    console.error('Error listing system prompts');
    return NextResponse.json({ error: 'Failed to list system prompts' }, { status: 500 });
  }
}

// POST /api/system-prompts - Create or update system prompt
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

    await ensureSystemPromptsDir();

    const { id, name, prompt } = await request.json();

    if (!name || !prompt) {
      return NextResponse.json({ error: 'Name and prompt are required' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const promptId = id || `prompt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    let createdDate = now;
    
    // If updating existing prompt, preserve the created date
    if (id) {
      try {
        const existingFilePath = path.join(SYSTEM_PROMPTS_DIR, `${id}.enc`);
        const existingEncryptedContent = await fs.readFile(existingFilePath, 'utf-8');
        const existingPrompt: SystemPrompt = JSON.parse(await smartDecrypt(existingEncryptedContent, ENCRYPTION_KEY));
        createdDate = existingPrompt.created;
      } catch (error) {
        // If file doesn't exist, treat as new prompt
        createdDate = now;
      }
    }
    
    const systemPrompt: SystemPrompt = {
      id: promptId,
      name: name.trim(),
      prompt,
      created: createdDate,
      lastModified: now,
      characterCount: prompt.length
    };

    const encryptedContent = await encrypt(JSON.stringify(systemPrompt), ENCRYPTION_KEY);
    const filePath = path.join(SYSTEM_PROMPTS_DIR, `${promptId}.enc`);
    
    await fs.writeFile(filePath, encryptedContent, 'utf-8');

    return NextResponse.json({ 
      success: true, 
      promptId,
      name: systemPrompt.name,
      created: systemPrompt.created,
      lastModified: systemPrompt.lastModified,
      characterCount: systemPrompt.characterCount
    });
  } catch (error) {
    console.error('Error saving system prompt');
    return NextResponse.json({ error: 'Failed to save system prompt' }, { status: 500 });
  }
} 
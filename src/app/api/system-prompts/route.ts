import { NextResponse, NextRequest } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { encrypt, validateEncryptionKey } from '@/utils/encryption';
import { smartDecrypt } from '@/utils/migration';

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

// Load system prompts from encrypted files
async function loadSystemPromptsFromFiles(): Promise<SystemPrompt[]> {
  try {
    await ensureSystemPromptsDir();
    
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
    if (!ENCRYPTION_KEY || !validateEncryptionKey(ENCRYPTION_KEY)) {
      console.error('Encryption key not configured or invalid');
      return [];
    }

    const files = await fs.readdir(SYSTEM_PROMPTS_DIR);
    const promptFiles = files.filter(file => file.endsWith('.enc'));
    
    const prompts: SystemPrompt[] = [];
    
    for (const file of promptFiles) {
      try {
        const filePath = path.join(SYSTEM_PROMPTS_DIR, file);
        const encryptedContent = await fs.readFile(filePath, 'utf-8');
        const decryptedContent = await smartDecrypt(encryptedContent, ENCRYPTION_KEY);
        const prompt = JSON.parse(decryptedContent);
        
        // Ensure the prompt has the expected structure
        if (prompt.id && prompt.title && prompt.body) {
          prompts.push({
            id: prompt.id,
            title: prompt.title,
            body: prompt.body,
            created: prompt.created || new Date().toISOString(),
            lastModified: prompt.lastModified || new Date().toISOString(),
          });
        }
      } catch (error) {
        console.error(`Error loading prompt from ${file}:`, error);
      }
    }
    
    return prompts;
  } catch (error) {
    console.error('Error loading system prompts from files:', error);
    return [];
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

// Ensure global in-memory prompts array exists and is loaded from files
if (!(globalThis as any).__systemPrompts) {
  (globalThis as any).__systemPrompts = [];
}
const prompts: SystemPrompt[] = (globalThis as any).__systemPrompts;

// Initialize prompts from files on first load
let isInitialized = false;
async function initializePrompts() {
  if (!isInitialized) {
    const filePrompts = await loadSystemPromptsFromFiles();
    prompts.length = 0; // Clear existing prompts
    prompts.push(...filePrompts);
    isInitialized = true;
  }
}

// GET /api/system-prompts - List all system prompts
export async function GET() {
  await initializePrompts();
  // Sort prompts by lastModified date (newest first)
  const sortedPrompts = [...prompts].sort((a, b) => 
    new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
  );
  return NextResponse.json({ prompts: sortedPrompts });
}

// POST /api/system-prompts - Create or update system prompt
export async function POST(req: NextRequest) {
  try {
    await initializePrompts();
    
    const { title, body } = await req.json();
    if (!title || !body) {
      return NextResponse.json({ error: 'Title and body are required.' }, { status: 400 });
    }
    
    const now = new Date().toISOString();
    const prompt: SystemPrompt = {
      id: Math.random().toString(36).slice(2),
      title,
      body,
      created: now,
      lastModified: now,
    };
    
    // Save to file
    await saveSystemPromptToFile(prompt);
    
    // Add to in-memory array
    prompts.push(prompt);
    
    return NextResponse.json({ prompt });
  } catch (e) {
    console.error('Error creating system prompt:', e);
    return NextResponse.json({ error: 'Failed to create system prompt.' }, { status: 500 });
  }
} 
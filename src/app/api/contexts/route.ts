import { NextResponse, NextRequest } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { encrypt, validateEncryptionKey } from '@/utils/encryption';
import { smartDecrypt } from '@/utils/migration';

const CONTEXTS_DIR = path.join(process.cwd(), 'data', 'contexts');

interface Context {
  id: string;
  title: string;
  body: string;
  created: string;
  lastModified: string;
}

// Ensure contexts directory exists
async function ensureContextsDir() {
  try {
    await fs.access(CONTEXTS_DIR);
  } catch {
    await fs.mkdir(CONTEXTS_DIR, { recursive: true });
  }
}

// Load contexts from encrypted files
async function loadContextsFromFiles(): Promise<Context[]> {
  try {
    await ensureContextsDir();
    
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
    if (!ENCRYPTION_KEY || !validateEncryptionKey(ENCRYPTION_KEY)) {
      return [];
    }

    const files = await fs.readdir(CONTEXTS_DIR);
    const contextFiles = files.filter(file => file.endsWith('.enc'));
    
    const contexts: Context[] = [];
    
    for (const file of contextFiles) {
      try {
        const filePath = path.join(CONTEXTS_DIR, file);
        const encryptedContent = await fs.readFile(filePath, 'utf-8');
        const decryptedContent = await smartDecrypt(encryptedContent, ENCRYPTION_KEY);
        const context = JSON.parse(decryptedContent);
        
        // Ensure the context has the expected structure
        if (context.id && context.title && context.body) {
          contexts.push({
            id: context.id,
            title: context.title,
            body: context.body,
            created: context.created || new Date().toISOString(),
            lastModified: context.lastModified || new Date().toISOString(),
          });
        }
      } catch (error) {
        // Silent error handling for privacy
      }
    }
    
    return contexts;
  } catch (error) {
    // Silent error handling for privacy
    return [];
  }
}

// Save context to encrypted file
async function saveContextToFile(context: Context): Promise<void> {
  try {
    await ensureContextsDir();
    
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
    if (!ENCRYPTION_KEY || !validateEncryptionKey(ENCRYPTION_KEY)) {
      throw new Error('Encryption key not configured or invalid');
    }

    const filePath = path.join(CONTEXTS_DIR, `${context.id}.enc`);
    const encryptedContent = await encrypt(JSON.stringify(context), ENCRYPTION_KEY);
    await fs.writeFile(filePath, encryptedContent, 'utf-8');
  } catch (error) {
    // Silent error handling for privacy
    throw error;
  }
}

// Ensure global in-memory contexts array exists and is loaded from files
if (!(globalThis as any).__contexts) {
  (globalThis as any).__contexts = [];
}
const contexts: Context[] = (globalThis as any).__contexts;

// Initialize contexts from files on first load
let isInitialized = false;
async function initializeContexts() {
  if (!isInitialized) {
    const fileContexts = await loadContextsFromFiles();
    contexts.length = 0; // Clear existing contexts
    contexts.push(...fileContexts);
    isInitialized = true;
  }
}

// GET /api/contexts - List all contexts
export async function GET() {
  await initializeContexts();
  // Sort contexts by lastModified date (newest first)
  const sortedContexts = [...contexts].sort((a, b) => 
    new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
  );
  return NextResponse.json({ contexts: sortedContexts });
}

// POST /api/contexts - Create or update context
export async function POST(req: NextRequest) {
  try {
    await initializeContexts();
    
    const { title, body } = await req.json();
    if (!title || !body) {
      return NextResponse.json({ error: 'Title and body are required.' }, { status: 400 });
    }
    
    const now = new Date().toISOString();
    const context: Context = {
      id: Math.random().toString(36).slice(2),
      title,
      body,
      created: now,
      lastModified: now,
    };
    
    // Save to file
    await saveContextToFile(context);
    
    // Add to in-memory array
    contexts.push(context);
    
    return NextResponse.json({ context });
  } catch (e) {
    // Silent error handling for privacy
    return NextResponse.json({ error: 'Failed to create context.' }, { status: 500 });
  }
} 
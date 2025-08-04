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

// Load context from encrypted file
async function loadContextFromFile(id: string): Promise<Context | null> {
  try {
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
    if (!ENCRYPTION_KEY || !validateEncryptionKey(ENCRYPTION_KEY)) {
      return null;
    }

    const filePath = path.join(CONTEXTS_DIR, `${id}.enc`);
    const encryptedContent = await fs.readFile(filePath, 'utf-8');
    const decryptedContent = await smartDecrypt(encryptedContent, ENCRYPTION_KEY);
    const context = JSON.parse(decryptedContent);
    
    if (context.id && context.title && context.body) {
      return {
        id: context.id,
        title: context.title,
        body: context.body,
        created: context.created || new Date().toISOString(),
        lastModified: context.lastModified || new Date().toISOString(),
      };
    }
    return null;
  } catch (error) {
    // Silent error handling for privacy
    return null;
  }
}

// Save context to encrypted file
async function saveContextToFile(context: Context): Promise<void> {
  try {
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

// Delete context file
async function deleteContextFile(id: string): Promise<void> {
  try {
    const filePath = path.join(CONTEXTS_DIR, `${id}.enc`);
    await fs.unlink(filePath);
  } catch (error) {
    // Silent error handling for privacy
    throw error;
  }
}

// GET /api/contexts/[id] - Get specific context
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const context = await loadContextFromFile(params.id);
    if (!context) {
      return NextResponse.json({ error: 'Context not found.' }, { status: 404 });
    }
    return NextResponse.json({ context });
  } catch (error) {
    // Silent error handling for privacy
    return NextResponse.json({ error: 'Failed to load context.' }, { status: 500 });
  }
}

// PUT /api/contexts/[id] - Update specific context
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { title, body } = await req.json();
    if (!title || !body) {
      return NextResponse.json({ error: 'Title and body are required.' }, { status: 400 });
    }

    const existingContext = await loadContextFromFile(params.id);
    if (!existingContext) {
      return NextResponse.json({ error: 'Context not found.' }, { status: 404 });
    }

    const updatedContext: Context = {
      ...existingContext,
      title,
      body,
      lastModified: new Date().toISOString(),
    };

    await saveContextToFile(updatedContext);

    // Update in-memory array if it exists
    if ((globalThis as any).__contexts) {
      const contexts = (globalThis as any).__contexts;
      const index = contexts.findIndex((c: Context) => c.id === params.id);
      if (index !== -1) {
        contexts[index] = updatedContext;
      }
    }

    return NextResponse.json({ context: updatedContext });
  } catch (error) {
    // Silent error handling for privacy
    return NextResponse.json({ error: 'Failed to update context.' }, { status: 500 });
  }
}

// DELETE /api/contexts/[id] - Delete specific context
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const existingContext = await loadContextFromFile(params.id);
    if (!existingContext) {
      return NextResponse.json({ error: 'Context not found.' }, { status: 404 });
    }

    await deleteContextFile(params.id);

    // Remove from in-memory array if it exists
    if ((globalThis as any).__contexts) {
      const contexts = (globalThis as any).__contexts;
      const index = contexts.findIndex((c: Context) => c.id === params.id);
      if (index !== -1) {
        contexts.splice(index, 1);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    // Silent error handling for privacy
    return NextResponse.json({ error: 'Failed to delete context.' }, { status: 500 });
  }
} 
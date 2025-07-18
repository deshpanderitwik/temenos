import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { validateEncryptionKey } from '@/utils/encryption';
import { smartDecrypt } from '@/utils/migration';

const NARRATIVES_DIR = path.join(process.cwd(), 'data', 'narratives');

interface Narrative {
  id: string;
  title: string;
  content: string;
  draftContent?: string; // Optional main content stored at the bottom
  created: string;
  lastModified: string;
  characterCount: number;
}

// GET /api/narratives/[id] - Load specific narrative
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

    const { id: narrativeId } = await params;
    const filePath = path.join(NARRATIVES_DIR, `${narrativeId}.enc`);

    try {
      const encryptedContent = await fs.readFile(filePath, 'utf-8');
      const decryptedContent = await smartDecrypt(encryptedContent, ENCRYPTION_KEY);
      const narrative: Narrative = JSON.parse(decryptedContent);

      return NextResponse.json({ narrative });
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return NextResponse.json({ error: 'Narrative not found' }, { status: 404 });
      }
      throw error;
    }
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load narrative' }, { status: 500 });
  }
}

// DELETE /api/narratives/[id] - Delete specific narrative
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: narrativeId } = await params;
    const filePath = path.join(NARRATIVES_DIR, `${narrativeId}.enc`);

    try {
      await fs.unlink(filePath);
      return NextResponse.json({ success: true });
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return NextResponse.json({ error: 'Narrative not found' }, { status: 404 });
      }
      throw error;
    }
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete narrative' }, { status: 500 });
  }
} 
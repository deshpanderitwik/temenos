import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { encrypt, validateEncryptionKey } from '@/utils/encryption';
import { smartDecrypt } from '@/utils/migration';

const NARRATIVES_DIR = path.join(process.cwd(), 'data', 'narratives');

interface Narrative {
  id: string;
  title: string;
  content: string;
  draftContent?: string; // Optional draft content stored at the bottom
  created: string;
  lastModified: string;
  characterCount: number;
}

// Ensure narratives directory exists
async function ensureNarrativesDir() {
  try {
    await fs.access(NARRATIVES_DIR);
  } catch {
    await fs.mkdir(NARRATIVES_DIR, { recursive: true });
  }
}

// GET /api/narratives - List all narratives
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

    await ensureNarrativesDir();

    const files = await fs.readdir(NARRATIVES_DIR);
    const narrativeFiles = files.filter(file => file.endsWith('.enc'));

    const narratives = await Promise.all(
      narrativeFiles.map(async (filename) => {
        try {
          const filePath = path.join(NARRATIVES_DIR, filename);
          const encryptedContent = await fs.readFile(filePath, 'utf-8');
          const decryptedContent = await smartDecrypt(encryptedContent, ENCRYPTION_KEY);
          const narrative: Narrative = JSON.parse(decryptedContent);
          
          return {
            id: narrative.id,
            title: narrative.title,
            created: narrative.created,
            lastModified: narrative.lastModified,
            characterCount: narrative.characterCount
          };
        } catch (error) {
          console.error(`Error reading narrative file ${filename}:`, error);
          return null;
        }
      })
    );

    const validNarratives = narratives.filter((n): n is NonNullable<typeof n> => n !== null).sort((a, b) => 
      new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
    );

    return NextResponse.json({ narratives: validNarratives });
  } catch (error) {
    console.error('Error listing narratives:', error);
    return NextResponse.json({ error: 'Failed to list narratives' }, { status: 500 });
  }
}

// POST /api/narratives - Create or update narrative
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

    await ensureNarrativesDir();

    const { id, title, content, draftContent } = await request.json();

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const narrativeId = id || `narrative_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    let createdDate = now;
    let existingDraftContent = '';
    
    // If updating existing narrative, preserve the created date and existing draft content
    if (id) {
      try {
        const existingFilePath = path.join(NARRATIVES_DIR, `${id}.enc`);
        const existingEncryptedContent = await fs.readFile(existingFilePath, 'utf-8');
        const existingNarrative: Narrative = JSON.parse(await smartDecrypt(existingEncryptedContent, ENCRYPTION_KEY));
        createdDate = existingNarrative.created;
        existingDraftContent = existingNarrative.draftContent || '';
      } catch {
        // If file doesn't exist, treat as new narrative
        createdDate = now;
      }
    }
    
    // Use provided draft content or preserve existing
    const finalDraftContent = draftContent !== undefined ? draftContent : existingDraftContent;
    
    const narrative: Narrative = {
      id: narrativeId,
      title: title.trim(),
      content,
      draftContent: finalDraftContent,
      created: createdDate,
      lastModified: now,
      characterCount: content.length
    };

    const encryptedContent = await encrypt(JSON.stringify(narrative), ENCRYPTION_KEY);
    const filePath = path.join(NARRATIVES_DIR, `${narrativeId}.enc`);
    
    await fs.writeFile(filePath, encryptedContent, 'utf-8');

    return NextResponse.json({ 
      success: true, 
      narrativeId,
      title: narrative.title,
      created: narrative.created,
      lastModified: narrative.lastModified,
      characterCount: narrative.characterCount
    });
  } catch (error) {
    console.error('Error saving narrative:', error);
    return NextResponse.json({ error: 'Failed to save narrative' }, { status: 500 });
  }
} 
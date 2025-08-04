import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { decrypt } from '@/utils/encryption';

const IMAGES_DIR = path.join(process.cwd(), 'data', 'images');
const METADATA_FILE = path.join(process.cwd(), 'data', 'images.json');

interface ImageMetadata {
  id: string;
  title: string;
  filename: string;
  created: string;
  lastModified: string;
  size: number;
  mimeType: string;
}

// Get encryption key from environment
const getEncryptionKey = (): string => {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }
  return key;
};

// Load metadata to find image by ID
async function loadMetadata(): Promise<ImageMetadata[]> {
  try {
    if (!existsSync(METADATA_FILE)) {
      return [];
    }
    const data = await readFile(METADATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: imageId } = await params;

    if (!imageId) {
      return NextResponse.json({ error: 'Image ID is required' }, { status: 400 });
    }

    // Load metadata to find the image
    const metadata = await loadMetadata();
    const imageMeta = metadata.find(img => img.id === imageId);

    if (!imageMeta) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Check if encrypted file exists
    const filePath = path.join(IMAGES_DIR, imageMeta.filename);
    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'Image file not found' }, { status: 404 });
    }

    // Read encrypted file
    const encryptedData = await readFile(filePath, 'utf-8');

    // Decrypt the image data (new format only)
    const decryptedBase64 = await decrypt(encryptedData, getEncryptionKey());
    
    // Convert base64 back to buffer
    const buffer = Buffer.from(decryptedBase64, 'base64');

    // Return the decrypted image with proper headers
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': imageMeta.mimeType,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      },
    });

  } catch (error) {
    console.error('Error serving image:', error);
    return NextResponse.json({ error: 'Failed to serve image' }, { status: 500 });
  }
} 
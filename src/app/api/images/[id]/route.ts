import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

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

// Load existing metadata
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

// Save metadata
async function saveMetadata(metadata: ImageMetadata[]): Promise<void> {
  await writeFile(METADATA_FILE, JSON.stringify(metadata, null, 2));
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const imageId = params.id;

    if (!imageId) {
      return NextResponse.json({ error: 'Image ID is required' }, { status: 400 });
    }

    const metadata = await loadMetadata();
    const imageMeta = metadata.find(img => img.id === imageId);

    if (!imageMeta) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Return image metadata
    return NextResponse.json({
      image: {
        id: imageMeta.id,
        title: imageMeta.title,
        created: imageMeta.created,
        lastModified: imageMeta.lastModified,
        url: `/api/images/${imageMeta.id}/content`,
        size: imageMeta.size,
        mimeType: imageMeta.mimeType,
      }
    });

  } catch (error) {
    console.error('Error getting image:', error);
    return NextResponse.json({ error: 'Failed to get image' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const imageId = params.id;

    if (!imageId) {
      return NextResponse.json({ error: 'Image ID is required' }, { status: 400 });
    }

    const metadata = await loadMetadata();
    const imageIndex = metadata.findIndex(img => img.id === imageId);

    if (imageIndex === -1) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    const imageMeta = metadata[imageIndex];

    // Delete the encrypted file
    const filePath = path.join(IMAGES_DIR, imageMeta.filename);
    if (existsSync(filePath)) {
      await unlink(filePath);
    }

    // Remove from metadata
    metadata.splice(imageIndex, 1);
    await saveMetadata(metadata);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting image:', error);
    return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 });
  }
} 
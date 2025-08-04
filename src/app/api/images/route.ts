import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, readFile, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { encrypt } from '@/utils/encryption';

// Ensure the images directory exists
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
  // Ensure directory exists
  await mkdir(path.dirname(METADATA_FILE), { recursive: true });
  await writeFile(METADATA_FILE, JSON.stringify(metadata, null, 2));
}

// Generate unique filename
function generateFilename(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const ext = path.extname(originalName);
  return `${timestamp}_${random}${ext}`;
}

// Download image from URL
async function downloadImageFromUrl(url: string): Promise<{ buffer: Buffer; mimeType: string; size: number }> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Temenos/1.0)',
      },
      // Add timeout to prevent hanging
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) {
      throw new Error('URL does not point to a valid image');
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Validate file size (10MB limit)
    if (buffer.length > 10 * 1024 * 1024) {
      throw new Error('Image file size must be less than 10MB');
    }

    return {
      buffer,
      mimeType: contentType,
      size: buffer.length,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to download image from URL: ${error.message}`);
    }
    throw new Error('Failed to download image from URL');
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const title = formData.get('title') as string;
    const imageFile = formData.get('image') as File;
    const imageUrl = formData.get('imageUrl') as string;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    if (!imageFile && !imageUrl) {
      return NextResponse.json({ error: 'Either image file or image URL is required' }, { status: 400 });
    }

    if (imageFile && imageUrl) {
      return NextResponse.json({ error: 'Please provide either an image file or a URL, not both' }, { status: 400 });
    }

    let buffer: Buffer;
    let mimeType: string;
    let size: number;
    let originalName: string;

    if (imageFile) {
      // Handle file upload
      if (!imageFile.type.startsWith('image/')) {
        return NextResponse.json({ error: 'Invalid file type. Only images are allowed.' }, { status: 400 });
      }

      if (imageFile.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: 'File size must be less than 10MB.' }, { status: 400 });
      }

      buffer = Buffer.from(await imageFile.arrayBuffer());
      mimeType = imageFile.type;
      size = imageFile.size;
      originalName = imageFile.name;
    } else {
      // Handle URL download
      try {
        const downloadedImage = await downloadImageFromUrl(imageUrl);
        buffer = downloadedImage.buffer;
        mimeType = downloadedImage.mimeType;
        size = downloadedImage.size;
        // Generate a filename based on the URL
        const urlObj = new URL(imageUrl);
        const pathname = urlObj.pathname;
        originalName = pathname.split('/').pop() || 'image.jpg';
        // Ensure the filename has an extension
        if (!path.extname(originalName)) {
          const ext = mimeType.split('/')[1] || 'jpg';
          originalName = `${originalName}.${ext}`;
        }
      } catch (error) {
        return NextResponse.json({ 
          error: error instanceof Error ? error.message : 'Failed to download image from URL' 
        }, { status: 400 });
      }
    }

    // Ensure images directory exists
    await mkdir(IMAGES_DIR, { recursive: true });

    // Generate unique filename
    const filename = generateFilename(originalName);
    const filePath = path.join(IMAGES_DIR, filename);

    // Encrypt the image data
    const encryptedData = await encrypt(buffer.toString('base64'), getEncryptionKey());

    // Save encrypted file
    await writeFile(filePath, encryptedData);

    // Create metadata
    const now = new Date().toISOString();
    const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newImage: ImageMetadata = {
      id: imageId,
      title: title.trim(),
      filename,
      created: now,
      lastModified: now,
      size,
      mimeType,
    };

    // Load existing metadata and add new image
    const metadata = await loadMetadata();
    metadata.push(newImage);
    await saveMetadata(metadata);

    // Return the image data (without the encrypted content)
    return NextResponse.json({
      image: {
        id: newImage.id,
        title: newImage.title,
        created: newImage.created,
        lastModified: newImage.lastModified,
        url: `/api/images/${newImage.id}/content`,
        size: newImage.size,
        mimeType: newImage.mimeType,
      }
    });

  } catch (error) {
    console.error('Error uploading image:', error);
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const metadata = await loadMetadata();
    
    // Return list of images without the encrypted content, sorted by creation date (newest first)
    const images = metadata
      .map(img => ({
        id: img.id,
        title: img.title,
        created: img.created,
        lastModified: img.lastModified,
        url: `/api/images/${img.id}/content`,
        size: img.size,
        mimeType: img.mimeType,
      }))
      .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

    return NextResponse.json({ images });
  } catch (error) {
    console.error('Error loading images:', error);
    return NextResponse.json({ error: 'Failed to load images' }, { status: 500 });
  }
} 
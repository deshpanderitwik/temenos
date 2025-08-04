import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { encrypt, decrypt } from '@/utils/encryption';
import { decryptLegacy, isLegacyFormat } from '@/utils/migration';

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
  encryptionVersion?: number;
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
  await writeFile(METADATA_FILE, JSON.stringify(metadata, null, 2));
}

export async function GET() {
  try {
    const metadata = await loadMetadata();
    
    const totalImages = metadata.length;
    const migratedImages = metadata.filter(img => img.encryptionVersion === 2).length;
    const legacyImages = metadata.filter(img => img.encryptionVersion === 1 || !img.encryptionVersion).length;
    
    return NextResponse.json({
      totalImages,
      migratedImages,
      legacyImages,
      migrationComplete: legacyImages === 0,
      migrationProgress: totalImages > 0 ? (migratedImages / totalImages) * 100 : 100
    });
  } catch (error) {
    console.error('Error checking migration status:', error);
    return NextResponse.json({ 
      error: 'Failed to check migration status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const encryptionKey = getEncryptionKey();
    const metadata = await loadMetadata();
    
    let migratedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const image of metadata) {
      try {
        const filePath = path.join(IMAGES_DIR, image.filename);
        
        // Skip if file doesn't exist
        if (!existsSync(filePath)) {
          errors.push(`Image file not found: ${image.filename}`);
          errorCount++;
          continue;
        }

        // Skip if already migrated
        if (image.encryptionVersion === 2) {
          continue;
        }

        // Read encrypted file
        const encryptedData = await readFile(filePath, 'utf-8');

        // Check if it's legacy format
        if (isLegacyFormat(encryptedData)) {
          // Decrypt with legacy format
          const decryptedBase64 = await decryptLegacy(encryptedData, encryptionKey);
          
          // Re-encrypt with new format
          const newEncryptedData = await encrypt(decryptedBase64, encryptionKey);
          
          // Write back the migrated data
          await writeFile(filePath, newEncryptedData);
          
          // Update metadata
          image.encryptionVersion = 2;
          image.lastModified = new Date().toISOString();
          
          migratedCount++;
        } else {
          // Assume it's already new format
          image.encryptionVersion = 2;
        }
      } catch (error) {
        const errorMsg = `Failed to migrate image ${image.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        errorCount++;
      }
    }

    // Save updated metadata
    await saveMetadata(metadata);

    return NextResponse.json({
      success: true,
      migratedCount,
      errorCount,
      totalImages: metadata.length,
      errors: errors.slice(0, 10) // Limit error output
    });

  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({ 
      error: 'Failed to migrate images',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 
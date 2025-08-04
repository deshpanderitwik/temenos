import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, unlink } from 'fs/promises';
import { existsSync, readdir } from 'fs';
import path from 'path';

const IMAGES_DIR = path.join(process.cwd(), 'data', 'images');
const METADATA_FILE = path.join(process.cwd(), 'data', 'images.json');

export async function POST(request: NextRequest) {
  try {
    let deletedFiles = 0;
    let deletedMetadata = 0;
    const errors: string[] = [];

    // Delete all image files
    if (existsSync(IMAGES_DIR)) {
      try {
        const files = await readdir(IMAGES_DIR);
        for (const file of files) {
          if (file !== '.DS_Store') { // Skip system files
            try {
              await unlink(path.join(IMAGES_DIR, file));
              deletedFiles++;
            } catch (error) {
              errors.push(`Failed to delete file ${file}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }
      } catch (error) {
        errors.push(`Failed to read images directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Reset metadata file
    try {
      await writeFile(METADATA_FILE, JSON.stringify([], null, 2));
      deletedMetadata = 1;
    } catch (error) {
      errors.push(`Failed to reset metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return NextResponse.json({
      success: true,
      deletedFiles,
      deletedMetadata,
      errors: errors.slice(0, 10) // Limit error output
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json({ 
      error: 'Failed to cleanup images',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    let fileCount = 0;
    let metadataCount = 0;

    // Count image files
    if (existsSync(IMAGES_DIR)) {
      try {
        const files = await readdir(IMAGES_DIR);
        fileCount = files.filter(file => file !== '.DS_Store').length;
      } catch (error) {
        console.error('Error reading images directory:', error);
      }
    }

    // Count metadata entries
    if (existsSync(METADATA_FILE)) {
      try {
        const data = await readFile(METADATA_FILE, 'utf-8');
        const metadata = JSON.parse(data);
        metadataCount = metadata.length;
      } catch (error) {
        console.error('Error reading metadata:', error);
      }
    }

    return NextResponse.json({
      fileCount,
      metadataCount,
      hasData: fileCount > 0 || metadataCount > 0
    });

  } catch (error) {
    console.error('Error checking cleanup status:', error);
    return NextResponse.json({ 
      error: 'Failed to check cleanup status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 
import path from 'path';
import fs from 'fs';
import { execFile } from 'child_process';
import sharp from 'sharp';

export interface ThumbnailResult {
  width: number | null;
  height: number | null;
  thumbnailFilename: string | null;
}

export async function processAttachment(
  filePath: string,
  filename: string,
  mimeType: string,
  uploadDir: string
): Promise<ThumbnailResult> {
  const thumbnailsDir = path.join(uploadDir, 'thumbnails');
  if (!fs.existsSync(thumbnailsDir)) {
    fs.mkdirSync(thumbnailsDir, { recursive: true });
  }

  const ext = path.extname(filename);
  const baseName = path.basename(filename, ext);
  const thumbnailFilename = `thumb-${baseName}.webp`;
  const thumbnailPath = path.join(thumbnailsDir, thumbnailFilename);

  // 1. Process Images
  if (mimeType.startsWith('image/')) {
    try {
      const image = sharp(filePath);
      const metadata = await image.metadata();

      // Create a high-quality thumbnail (max 800x800 bounding box, preserving aspect ratio)
      await image
        .rotate() // auto-orient based on EXIF
        .resize({
          width: 800,
          height: 800,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 85 })
        .toFile(thumbnailPath);

      return {
        width: metadata.width || null,
        height: metadata.height || null,
        thumbnailFilename,
      };
    } catch (error) {
      console.error(`Failed to generate image thumbnail for ${filename}:`, error);
      return {
        width: null,
        height: null,
        thumbnailFilename: null,
      };
    }
  }

  // 2. Process Videos (extract frame at 1s or 0s)
  if (mimeType.startsWith('video/')) {
    try {
      await new Promise<void>((resolve, reject) => {
        execFile(
          'ffmpeg',
          [
            '-y',
            '-ss',
            '00:00:01',
            '-i',
            filePath,
            '-vframes',
            '1',
            '-vf',
            'scale=800:-1',
            thumbnailPath,
          ],
          (error) => {
            if (error) {
              // Try fallback at 0s if video is shorter than 1s
              execFile(
                'ffmpeg',
                [
                  '-y',
                  '-ss',
                  '00:00:00',
                  '-i',
                  filePath,
                  '-vframes',
                  '1',
                  '-vf',
                  'scale=800:-1',
                  thumbnailPath,
                ],
                (err2) => {
                  if (err2) reject(err2);
                  else resolve();
                }
              );
            } else {
              resolve();
            }
          }
        );
      });

      return {
        width: null,
        height: null,
        thumbnailFilename,
      };
    } catch (error) {
      console.warn(`Failed to generate video thumbnail with ffmpeg for ${filename}:`, error);
      return {
        width: null,
        height: null,
        thumbnailFilename: null,
      };
    }
  }

  return {
    width: null,
    height: null,
    thumbnailFilename: null,
  };
}

export default {
  processAttachment,
};

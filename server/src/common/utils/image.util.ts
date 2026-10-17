import { BadRequestException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { unlink } from 'fs/promises';
import { basename, join } from 'path';
import sharp from 'sharp';
import { UPLOAD_DIR, publicUrlFor } from '../../config/multer.config';
import { UPLOAD_MESSAGES } from '../messages';

export interface WebpOptions {
  quality?: number;
  width?: number;
  height?: number;
}

export const saveAsWebp = async (
  file: Express.Multer.File,
  options: WebpOptions = {},
): Promise<string> => {
  const filename = `${randomBytes(16).toString('hex')}.webp`;

  // autoOrient first: phone photos carry an EXIF rotation tag that sharp strips
  // on output, so without it a portrait photo comes out sideways.
  let image = sharp(file.buffer).autoOrient();

  if (options.width || options.height) {
    image = image.resize({
      width: options.width,
      height: options.height,
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  try {
    await image
      .webp({ quality: options.quality ?? 80 })
      .toFile(join(UPLOAD_DIR, filename));
  } catch {
    // The mime type multer checked is a client-sent header. A .png that is
    // really a zip only fails here.
    throw new BadRequestException(UPLOAD_MESSAGES.INVALID_TYPE);
  }

  return publicUrlFor(filename);
};

// Capped at 1600px wide: plenty for a zoomed product page, and a phone photo
// straight off the camera would otherwise be several megabytes per view.
export const saveProductImage = (file: Express.Multer.File): Promise<string> =>
  saveAsWebp(file, { quality: 80, width: 1600 });

// Takes the public url stored in the DB. basename() keeps it inside UPLOAD_DIR
// even if a url was ever tampered with ("../../.env"). A file that is already
// gone is fine — the goal is only that it does not exist afterwards.
export const deleteUploadedFile = async (url: string): Promise<void> => {
  try {
    await unlink(join(UPLOAD_DIR, basename(url)));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
};

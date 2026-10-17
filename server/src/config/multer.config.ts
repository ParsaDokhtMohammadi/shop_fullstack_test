import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { memoryStorage } from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { env } from './env.config';
import { UPLOAD_MESSAGES } from '../common/messages';

// resolve() rather than join(), so UPLOAD_DIR can be an absolute path. In a
// container the uploads folder has to live on a mounted volume — the image's
// own filesystem is discarded on every redeploy, which would take the files
// while leaving the product_image rows pointing at them. join() would have
// turned a volume at /data/uploads into /app/data/uploads, back inside the
// container, with no error to notice. A relative value still resolves against
// the project root exactly as before.
export const UPLOAD_DIR = resolve(process.cwd(), env.upload.dir);

if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
];

export const imageMulterOptions: MulterOptions = {
  storage: memoryStorage(),
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return callback(
        new BadRequestException(UPLOAD_MESSAGES.INVALID_TYPE),
        false,
      );
    }
    callback(null, true);
  },

  limits: {
    fileSize: env.upload.maxSizeBytes,
    files: 1,
    fields: 20,
  },
};

// Per product, not per request — the service also checks the running total.
export const MAX_PRODUCT_IMAGES = 10;

// Same rules as a single image, but several files in one request.
export const productImagesMulterOptions: MulterOptions = {
  ...imageMulterOptions,
  limits: { ...imageMulterOptions.limits, files: MAX_PRODUCT_IMAGES },
};

export const publicUrlFor = (filename: string): string =>
  `${env.upload.publicPath}/${filename}`;

import {
  BadRequestException,
  UploadedFile,
  ParseFilePipe,
} from '@nestjs/common';
import { UPLOAD_MESSAGES } from '../messages';

// Companion to @UploadImage(). Type and size are already enforced by multer
// before anything touches the disk, so the only thing left to check here is
// that a file was actually sent — with a Persian message like the rest of the
// API, instead of Nest's default English one.
export const UploadedImageFile = () =>
  UploadedFile(
    new ParseFilePipe({
      validators: [],
      exceptionFactory: () =>
        new BadRequestException(UPLOAD_MESSAGES.FILE_REQUIRED),
    }),
  );

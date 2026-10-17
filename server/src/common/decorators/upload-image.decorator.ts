import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiConsumes } from '@nestjs/swagger';
import {
  imageMulterOptions,
  MAX_PRODUCT_IMAGES,
  productImagesMulterOptions,
} from '../../config/multer.config';

// Multer + the multipart content type. The file picker in Swagger comes from
// the DTO's own binary @ApiProperty, so the body stays documented in one place.
export const UploadImage = (field = 'image') =>
  applyDecorators(
    UseInterceptors(FileInterceptor(field, imageMulterOptions)),
    ApiConsumes('multipart/form-data'),
  );

// Several files under one field name, e.g. images[] from an <input multiple>.
export const UploadImages = (field = 'images') =>
  applyDecorators(
    UseInterceptors(
      FilesInterceptor(field, MAX_PRODUCT_IMAGES, productImagesMulterOptions),
    ),
    ApiConsumes('multipart/form-data'),
  );

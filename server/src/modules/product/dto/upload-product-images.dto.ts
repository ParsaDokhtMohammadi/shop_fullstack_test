import { ApiProperty } from '@nestjs/swagger';

// Swagger only: gives the endpoint a multi-file picker. The files are read
// with @UploadedFiles(), not from the body, so there is nothing to validate.
export class UploadProductImagesDto {
  @ApiProperty({
    type: 'array',
    items: { type: 'string', format: 'binary' },
    description: 'Up to 10 per product. JPEG, PNG, WebP or AVIF.',
  })
  images!: unknown[];
}

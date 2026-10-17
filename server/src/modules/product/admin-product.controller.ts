import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { AdminProductQueryDto } from './dto/admin-product-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateVarientDto } from './dto/create-varient.dto';
import { UploadProductImagesDto } from './dto/upload-product-images.dto';
import { ReorderImagesDto } from './dto/reorder-images.dto';
import { UploadImages } from '../../common/decorators/upload-image.decorator';
import { AdminGuard } from '../../common/guards/admin.guard';
import { AUTH_COOKIE } from '../../common/utils/cookie.util';

@ApiTags('Admin · Products')
@Controller('admin/products')
// Every route here is admin-only, so the guard belongs on the class.
@ApiCookieAuth(AUTH_COOKIE)
@UseGuards(AdminGuard)
export class AdminProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a product',
    description:
      'Send at least one variant. A product with no options gets a single variant with no colour and no size. Images are uploaded separately.',
  })
  create(@Body() dto: CreateProductDto) {
    return this.productService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Product list including inactive ones',
    description:
      'Paginated, newest first. Each product comes with its category, all variants and all images (cover first).',
  })
  findAll(@Query() dto: AdminProductQueryDto) {
    return this.productService.findAllForAdmin(dto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'One product for the edit page',
    description:
      'Works for inactive products too. Includes the category, all variants (inactive ones too) and all images, cover first.',
  })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productService.findOneForAdmin(id);
  }

  // Declared above @Patch(':id') so the static segment is matched first.
  @Patch(':id/toggle')
  @ApiOperation({
    summary: 'Publish or unpublish a product',
    description:
      'Flips isActive. This is the soft delete. Publishing is refused when the product has no active variant.',
  })
  toggle(@Param('id', ParseUUIDPipe) id: string) {
    return this.productService.toggleActive(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Edit a product',
    description:
      'Send only the fields you are changing. Renaming does not change the slug; send a slug to change it. Variants and isActive have their own routes.',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productService.update(id, dto);
  }

  @Post(':id/varients')
  @ApiOperation({
    summary: 'Add a variant to an existing product',
    description:
      'Refused with 409 when the product already has a variant with the same colour and size, inactive ones included.',
  })
  createVarient(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateVarientDto,
  ) {
    return this.productService.createVarient(id, dto);
  }

  @Post(':id/images')
  @UploadImages()
  @ApiBody({ type: UploadProductImagesDto })
  @ApiOperation({
    summary: 'Upload product images',
    description:
      'Multipart, field name "images", several files at once. Added after the existing images, so the cover does not change. Max 10 per product.',
  })
  addImages(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.productService.addImages(id, files);
  }

  @Patch(':id/images/order')
  @ApiOperation({
    summary: 'Reorder product images',
    description:
      'Send every image id of the product in display order. The first one becomes the cover.',
  })
  reorderImages(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReorderImagesDto,
  ) {
    return this.productService.reorderImages(id, dto);
  }

  @Delete(':id/images/:imageId')
  @ApiOperation({
    summary: 'Delete a product image',
    description: 'Removes the row and the file on disk.',
  })
  deleteImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
  ) {
    return this.productService.deleteImage(id, imageId);
  }
}

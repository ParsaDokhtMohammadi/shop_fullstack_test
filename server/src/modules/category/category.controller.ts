import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CategoryService } from './category.service';

@ApiTags('Categories')
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  @ApiOperation({
    summary: 'Category tree',
    description:
      'Active categories only, with subcategories nested under "children".',
  })
  findAll() {
    return this.categoryService.findAll();
  }

  @Get(':slug')
  @ApiOperation({
    summary: 'One category by slug',
    description:
      'Public: the category and its active subcategories. 404 if it is deactivated.',
  })
  findOne(@Param('slug') slug: string) {
    return this.categoryService.findOne(slug);
  }
}

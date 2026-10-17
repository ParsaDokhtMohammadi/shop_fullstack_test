import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { AUTH_COOKIE } from 'src/common/utils/cookie.util';
import { AdminGuard } from 'src/common/guards/admin.guard';

@ApiTags('Admin · Categories')
@Controller('admin/categories')
// Every route here is admin-only, so the guard belongs on the class.
@ApiCookieAuth(AUTH_COOKIE)
@UseGuards(AdminGuard)
export class AdminCategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a category',
    description:
      'JSON, not multipart — a category has no image to upload. Omit parentId for a root category.',
  })
  create(@Body() dto: CreateCategoryDto) {
    return this.categoryService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Category tree including deactivated ones',
    description: 'Same shape as the public tree, but nothing is filtered out.',
  })
  findAll() {
    return this.categoryService.findAll(true);
  }

  @Get('parents')
  @ApiOperation({
    summary: 'Root categories as id + name',
    description:
      'Only categories with no parent, and only the two fields a parent select box needs.',
  })
  findParents() {
    return this.categoryService.findParents();
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Activate or deactivate a category' })
  toggle(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoryService.toggleActive(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Edit a category',
    description:
      'JSON, not multipart. Send only the fields you are changing. Send parentId null to promote it back to a root.',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoryService.update(id, dto);
  }
}

import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryQueryDto,
  UpdateCategoryStatusDto,
  ReorderCategoriesDto,
} from './dto/category.dto';
import {
  CreateCategoryAttributeDto,
  UpdateCategoryAttributeDto,
  ReorderItemsDto,
} from './dto/category-attribute.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionKeys } from '../../common/enums/permission-keys.enum';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentLocale } from '../../common/i18n/i18n.decorator';

@ApiTags('Categories')
@Controller('v1')
export class CategoriesController {
  constructor(private readonly service: CategoriesService) {}

  /** Public: used by customer app & marketplace */
  @Get('categories')
  @Public()
  @ApiOperation({
    summary: 'List all active top-level categories (public, localized)',
    description:
      'Returns top-level categories with their subcategories localized in user language based on Accept-Language or ?lang=hi',
  })
  async listPublic(@CurrentLocale() locale: string) {
    const data = await this.service.findAllPublic(locale);
    return { message: 'Categories retrieved', data };
  }

  @Get('categories/:id/subcategories')
  @Public()
  @ApiOperation({
    summary: 'List active subcategories of a category (public, localized)',
  })
  @ApiParam({ name: 'id', type: String })
  async listSubcategories(
    @Param('id') id: string,
    @CurrentLocale() locale: string,
  ) {
    const data = await this.service.findSubcategories(id, true, locale);
    return { message: 'Subcategories retrieved', data };
  }

  @Get('categories/:id/attributes')
  @Public()
  @ApiOperation({
    summary: 'Get category dynamic attribute schema (public)',
    description:
      'Used by vendor Add Product form to render dynamic fields and marketplace browse sidebar to build filter options',
  })
  @ApiParam({ name: 'id', type: String })
  async getAttributes(@Param('id') id: string) {
    const data = await this.service.findAttributes(id);
    return { message: 'Category attributes retrieved', data };
  }
}

@ApiTags('Admin Categories & Attributes Master')
@Controller('v1/admin/categories')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class AdminCategoriesController {
  constructor(private readonly service: CategoriesService) {}

  // -------------------------------------------------------------
  // CATEGORIES
  // -------------------------------------------------------------

  @Get()
  @Permissions(PermissionKeys.CATEGORIES_READ)
  @ApiOperation({ summary: 'List categories/subcategories with pagination (admin)' })
  async findAll(
    @Query() query: CategoryQueryDto,
    @CurrentLocale() locale: string,
  ) {
    return this.service.findAll(query, locale);
  }

  @Patch('reorder')
  @Permissions(PermissionKeys.CATEGORIES_UPDATE)
  @ApiOperation({ summary: 'Reorder categories display order' })
  async reorder(@Body() dto: ReorderCategoriesDto) {
    await this.service.reorderCategories(dto);
    return { message: 'Categories reordered successfully' };
  }

  @Get(':id')
  @Permissions(PermissionKeys.CATEGORIES_READ)
  @ApiOperation({ summary: 'Get category by ID with subcategories and attributes (admin)' })
  @ApiParam({ name: 'id', type: String })
  async findOne(@Param('id') id: string, @CurrentLocale() locale: string) {
    return this.service.findOne(id, locale);
  }

  @Post()
  @Permissions(PermissionKeys.CATEGORIES_CREATE)
  @ApiOperation({ summary: 'Create category or subcategory' })
  async create(@Body() dto: CreateCategoryDto) {
    const cat = await this.service.create(dto);
    return { message: 'Category created successfully', data: cat };
  }

  @Patch(':id')
  @Permissions(PermissionKeys.CATEGORIES_UPDATE)
  @ApiOperation({ summary: 'Update a category' })
  @ApiParam({ name: 'id', type: String })
  async update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    const cat = await this.service.update(id, dto);
    return { message: 'Category updated successfully', data: cat };
  }

  @Patch(':id/status')
  @Permissions(PermissionKeys.CATEGORIES_UPDATE)
  @ApiOperation({ summary: 'Toggle category active status' })
  @ApiParam({ name: 'id', type: String })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryStatusDto,
  ) {
    const cat = await this.service.updateStatus(id, dto.isActive);
    return { message: 'Category status updated successfully', data: cat };
  }

  @Delete(':id')
  @Permissions(PermissionKeys.CATEGORIES_DELETE)
  @ApiOperation({ summary: 'Delete a category or subcategory' })
  @ApiParam({ name: 'id', type: String })
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    await this.service.remove(id);
    return { message: 'Category deleted successfully' };
  }

  // -------------------------------------------------------------
  // SUBCATEGORIES UNDER A CATEGORY
  // -------------------------------------------------------------

  @Get(':id/subcategories')
  @Permissions(PermissionKeys.CATEGORIES_READ)
  @ApiOperation({ summary: 'List subcategories of a category (admin)' })
  @ApiParam({ name: 'id', type: String })
  async getSubcategories(
    @Param('id') id: string,
    @CurrentLocale() locale: string,
  ) {
    const data = await this.service.findSubcategories(id, false, locale);
    return { message: 'Subcategories retrieved successfully', data };
  }

  @Post(':id/subcategories')
  @Permissions(PermissionKeys.CATEGORIES_CREATE)
  @ApiOperation({ summary: 'Add a new subcategory under category' })
  @ApiParam({ name: 'id', type: String })
  async createSubcategory(
    @Param('id') parentId: string,
    @Body() dto: CreateCategoryDto,
  ) {
    dto.parentId = parentId;
    const sub = await this.service.create(dto);
    return { message: 'Subcategory created successfully', data: sub };
  }

  @Patch(':id/subcategories/reorder')
  @Permissions(PermissionKeys.CATEGORIES_UPDATE)
  @ApiOperation({ summary: 'Reorder subcategories' })
  @ApiParam({ name: 'id', type: String })
  async reorderSubcategories(@Body() dto: ReorderCategoriesDto) {
    await this.service.reorderCategories(dto);
    return { message: 'Subcategories reordered successfully' };
  }

  // -------------------------------------------------------------
  // ATTRIBUTES UNDER A CATEGORY (SOW 4a, 5.3, 10.7)
  // -------------------------------------------------------------

  @Get(':id/attributes')
  @Permissions(PermissionKeys.CATEGORIES_READ)
  @ApiOperation({ summary: 'List all dynamic attributes for a category' })
  @ApiParam({ name: 'id', type: String })
  async getCategoryAttributes(@Param('id') id: string) {
    const data = await this.service.findAttributes(id);
    return { message: 'Category attributes retrieved successfully', data };
  }

  @Post(':id/attributes')
  @Permissions(PermissionKeys.CATEGORIES_CREATE)
  @ApiOperation({ summary: 'Add a dynamic attribute to a category' })
  @ApiParam({ name: 'id', type: String })
  async createCategoryAttribute(
    @Param('id') categoryId: string,
    @Body() dto: CreateCategoryAttributeDto,
  ) {
    const data = await this.service.createAttribute(categoryId, dto);
    return { message: 'Category attribute created successfully', data };
  }

  @Put(':id/attributes/:attributeId')
  @Patch(':id/attributes/:attributeId')
  @Permissions(PermissionKeys.CATEGORIES_UPDATE)
  @ApiOperation({ summary: 'Update a dynamic attribute' })
  @ApiParam({ name: 'id', type: String })
  @ApiParam({ name: 'attributeId', type: String })
  async updateCategoryAttribute(
    @Param('id') categoryId: string,
    @Param('attributeId') attributeId: string,
    @Body() dto: UpdateCategoryAttributeDto,
  ) {
    const data = await this.service.updateAttribute(categoryId, attributeId, dto);
    return { message: 'Category attribute updated successfully', data };
  }

  @Patch(':id/attributes/reorder')
  @Permissions(PermissionKeys.CATEGORIES_UPDATE)
  @ApiOperation({ summary: 'Reorder dynamic attributes' })
  @ApiParam({ name: 'id', type: String })
  async reorderAttributes(
    @Param('id') categoryId: string,
    @Body() dto: ReorderItemsDto,
  ) {
    await this.service.reorderAttributes(categoryId, dto);
    return { message: 'Category attributes reordered successfully' };
  }

  @Patch(':id/attributes/:attributeId/filterable')
  @Permissions(PermissionKeys.CATEGORIES_UPDATE)
  @ApiOperation({ summary: 'Toggle attribute filterable flag (auto-updates marketplace filters)' })
  @ApiParam({ name: 'id', type: String })
  @ApiParam({ name: 'attributeId', type: String })
  async toggleFilterable(
    @Param('id') categoryId: string,
    @Param('attributeId') attributeId: string,
    @Body('filterable') filterable?: boolean,
  ) {
    const data = await this.service.toggleAttributeFilterable(
      categoryId,
      attributeId,
      filterable,
    );
    return { message: 'Attribute filterable state updated successfully', data };
  }

  @Delete(':id/attributes/:attributeId')
  @Permissions(PermissionKeys.CATEGORIES_DELETE)
  @ApiOperation({ summary: 'Delete a category attribute' })
  @ApiParam({ name: 'id', type: String })
  @ApiParam({ name: 'attributeId', type: String })
  @HttpCode(HttpStatus.OK)
  async deleteCategoryAttribute(
    @Param('id') categoryId: string,
    @Param('attributeId') attributeId: string,
  ) {
    await this.service.deleteAttribute(categoryId, attributeId);
    return { message: 'Category attribute deleted successfully' };
  }
}

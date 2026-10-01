import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { MasterProductsService } from './master-products.service';
import {
  CreateMasterProductDto,
  UpdateMasterProductDto,
  MasterProductQueryDto,
} from './dto/master-product.dto';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentLocale } from '../../common/i18n/i18n.decorator';

@ApiTags('Master Products')
@Controller('v1/master-products')
export class MasterProductsController {
  constructor(private readonly service: MasterProductsService) {}

  @Get('search')
  @Public()
  @ApiOperation({
    summary:
      'Autosuggest / typeahead search for plant items in Master Catalog (multilingual)',
    description:
      'Search plants by English or Hindi name/synonym. Returns results localized according to Accept-Language or ?lang=hi',
  })
  async search(
    @Query('q') q: string,
    @CurrentLocale() locale: string,
    @Query('limit') limit?: number,
  ) {
    return this.service.search(q, limit ? Number(limit) : 10, locale);
  }

  @Get(':id')
  @Public()
  @ApiOperation({
    summary: 'Get full botanical specs & care guide for autofill (localized)',
  })
  @ApiParam({ name: 'id', type: String })
  async findOne(@Param('id') id: string, @CurrentLocale() locale: string) {
    return this.service.findOne(id, locale);
  }
}

@ApiTags('Admin Master Products')
@Controller('v1/admin/master-products')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class AdminMasterProductsController {
  constructor(private readonly service: MasterProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List master catalog entries with filters & pagination' })
  async findAll(
    @Query() query: MasterProductQueryDto,
    @CurrentLocale() locale: string,
  ) {
    return this.service.findAllAdmin(query, locale);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new canonical Master Catalog entry' })
  async create(
    @Body() dto: CreateMasterProductDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.service.create(dto, adminId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Edit Master Catalog entry details' })
  @ApiParam({ name: 'id', type: String })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateMasterProductDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate Master Catalog entry' })
  @ApiParam({ name: 'id', type: String })
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Post('bulk-import')
  @ApiOperation({ summary: 'Bulk import master catalog entries from CSV/JSON' })
  async bulkImport(
    @Body() items: CreateMasterProductDto[],
    @CurrentUser('id') adminId: string,
  ) {
    return this.service.bulkImport(items, adminId);
  }

  @Post(':id/merge/:duplicateId')
  @ApiOperation({
    summary:
      'Merge duplicate vendor-added entry into canonical master entry and re-link products',
  })
  @ApiParam({ name: 'id', description: 'Canonical Master Product ID' })
  @ApiParam({ name: 'duplicateId', description: 'Duplicate entry to merge and deactivate' })
  async mergeDuplicates(
    @Param('id') canonicalId: string,
    @Param('duplicateId') duplicateId: string,
  ) {
    return this.service.mergeDuplicates(canonicalId, duplicateId);
  }
}

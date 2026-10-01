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
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { VendorsService } from '../vendors/vendors.service';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductQueryDto,
} from './dto/product.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentLocale } from '../../common/i18n/i18n.decorator';

@ApiTags('Vendor Products')
@Controller('v1/vendor/products')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class VendorProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly vendorsService: VendorsService,
  ) {}

  @Post()
  @ApiOperation({
    summary:
      'Add product to vendor nursery (integrates master autosuggest & auto-cataloging)',
  })
  async createProduct(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateProductDto,
  ) {
    const vendor = await this.vendorsService.getVendorByUserId(userId);
    return this.productsService.createProduct(vendor.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List vendor nursery products with pagination' })
  async findVendorProducts(
    @CurrentUser('id') userId: string,
    @Query() query: ProductQueryDto,
  ) {
    const vendor = await this.vendorsService.getVendorByUserId(userId);
    return this.productsService.findVendorProducts(vendor.id, query);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update vendor product pricing, stock, or details' })
  @ApiParam({ name: 'id', type: String })
  async updateProduct(
    @CurrentUser('id') userId: string,
    @Param('id') productId: string,
    @Body() dto: UpdateProductDto,
  ) {
    const vendor = await this.vendorsService.getVendorByUserId(userId);
    return this.productsService.updateProduct(vendor.id, productId, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Toggle product active / inactive visibility' })
  @ApiParam({ name: 'id', type: String })
  async toggleStatus(
    @CurrentUser('id') userId: string,
    @Param('id') productId: string,
  ) {
    const vendor = await this.vendorsService.getVendorByUserId(userId);
    return this.productsService.toggleProductStatus(vendor.id, productId);
  }
}

@ApiTags('Marketplace Products')
@Controller('v1/products')
export class MarketplaceProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Browse and search public marketplace products with filters (multilingual)',
    description:
      'Returns plants/products localized in the requested language (e.g. English, Hindi) and supports search in English and Hindi',
  })
  async findAll(
    @Query() query: ProductQueryDto,
    @CurrentLocale() locale: string,
  ) {
    return this.productsService.findAllMarketplace(query, locale);
  }

  @Get(':id')
  @Public()
  @ApiOperation({
    summary: 'Get detailed product info with nursery specs (localized)',
    description:
      'Returns product details localized in user language according to Accept-Language or ?lang=hi',
  })
  @ApiParam({ name: 'id', type: String })
  async findOne(@Param('id') id: string, @CurrentLocale() locale: string) {
    return this.productsService.findProductDetail(id, locale);
  }
}

@ApiTags('Admin Vendor Products')
@Controller('v1/admin/vendors/:vendorId/products')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class AdminVendorProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Admin: List products of a specific vendor' })
  @ApiParam({ name: 'vendorId', type: String })
  async getVendorProducts(
    @Param('vendorId') vendorId: string,
    @Query() query: ProductQueryDto,
  ) {
    return this.productsService.findVendorProductsAdmin(vendorId, query);
  }

  @Post()
  @ApiOperation({
    summary:
      'Admin: Add product on behalf of a vendor with master catalog linking',
  })
  @ApiParam({ name: 'vendorId', type: String })
  async createProduct(
    @Param('vendorId') vendorId: string,
    @Body() dto: CreateProductDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.productsService.createProductOnVendorBehalf(
      vendorId,
      dto,
      adminId,
    );
  }

  @Put(':productId')
  @ApiOperation({
    summary:
      'Admin: Directly edit vendor product price, discount price, stock, images, details',
  })
  @ApiParam({ name: 'vendorId', type: String })
  @ApiParam({ name: 'productId', type: String })
  async updateProduct(
    @Param('vendorId') vendorId: string,
    @Param('productId') productId: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.productsService.updateVendorProductAdmin(
      vendorId,
      productId,
      dto,
      adminId,
    );
  }

  @Patch(':productId/status')
  @ApiOperation({ summary: 'Admin: Toggle vendor product status' })
  @ApiParam({ name: 'vendorId', type: String })
  @ApiParam({ name: 'productId', type: String })
  async toggleStatus(
    @Param('vendorId') vendorId: string,
    @Param('productId') productId: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.productsService.toggleProductStatusAdmin(
      vendorId,
      productId,
      adminId,
    );
  }

  @Delete(':productId')
  @ApiOperation({ summary: 'Admin: Delete product from vendor nursery' })
  @ApiParam({ name: 'vendorId', type: String })
  @ApiParam({ name: 'productId', type: String })
  async deleteProduct(
    @Param('vendorId') vendorId: string,
    @Param('productId') productId: string,
  ) {
    return this.productsService.deleteVendorProductAdmin(vendorId, productId);
  }
}

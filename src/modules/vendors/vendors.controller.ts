import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
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
import { VendorsService } from './vendors.service';
import {
  UpdateVendorStoreDto,
  AdminUpdateVendorDto,
  VendorApprovalDto,
  VendorQueryDto,
} from './dto/vendor.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Vendor Store')
@Controller('v1/vendor')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class VendorsController {
  constructor(private readonly service: VendorsService) {}

  @Post('store')
  @ApiOperation({ summary: 'Create or update vendor store profile' })
  async createOrUpdateStore(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateVendorStoreDto,
  ) {
    return this.service.createOrUpdateStore(userId, dto);
  }

  @Get('dashboard')
  @ApiOperation({
    summary:
      'Get vendor dashboard metrics (revenue, orders, product counters)',
  })
  async getDashboard(@CurrentUser('id') userId: string) {
    const vendor = await this.service.getVendorByUserId(userId);
    return this.service.getDashboard(vendor.id);
  }
}

@ApiTags('Admin Vendors')
@Controller('v1/admin/vendors')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class AdminVendorsController {
  constructor(private readonly service: VendorsService) {}

  @Get()
  @ApiOperation({ summary: 'List all vendors with KYC status and pagination' })
  async findAll(@Query() query: VendorQueryDto) {
    return this.service.findAllAdmin(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single vendor details by ID' })
  @ApiParam({ name: 'id', type: String })
  async findOne(@Param('id') vendorId: string) {
    return this.service.findOneAdmin(vendorId);
  }

  @Patch(':id/approval')
  @ApiOperation({ summary: 'Approve or reject vendor KYC application' })
  @ApiParam({ name: 'id', type: String })
  async updateApproval(
    @Param('id') vendorId: string,
    @Body() dto: VendorApprovalDto,
  ) {
    return this.service.updateApprovalAdmin(vendorId, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Toggle vendor active / inactive status' })
  @ApiParam({ name: 'id', type: String })
  async toggleActive(@Param('id') vendorId: string) {
    return this.service.toggleActiveAdmin(vendorId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Admin: Update complete vendor profile & KYC settings' })
  @ApiParam({ name: 'id', type: String })
  async updateVendor(
    @Param('id') vendorId: string,
    @Body() dto: AdminUpdateVendorDto,
  ) {
    return this.service.updateVendorAdmin(vendorId, dto);
  }
}

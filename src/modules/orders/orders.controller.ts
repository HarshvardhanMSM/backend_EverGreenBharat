import {
  Controller,
  Get,
  Post,
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
import { OrdersService } from './orders.service';
import { VendorsService } from '../vendors/vendors.service';
import {
  PlaceOrderDto,
  UpdateOrderStatusDto,
  VerifyDeliveryOtpDto,
  OrderQueryDto,
} from './dto/order.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Orders')
@Controller('v1/orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  @Post()
  @ApiOperation({
    summary: 'Place order with multi-vendor split fulfillment (COD or Razorpay)',
  })
  async placeOrder(
    @CurrentUser('id') userId: string,
    @Body() dto: PlaceOrderDto,
  ) {
    return this.service.placeOrder(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get current customer order history' })
  async getCustomerOrders(@CurrentUser('id') userId: string) {
    return this.service.getCustomerOrders(userId);
  }

  @Get(':id')
  @ApiOperation({
    summary:
      'Get order tracking detail (surfaces plaintext OTP to customer only while Out for Delivery)',
  })
  @ApiParam({ name: 'id', type: String })
  async getCustomerOrderDetail(
    @CurrentUser('id') userId: string,
    @Param('id') orderId: string,
  ) {
    return this.service.getCustomerOrderDetail(userId, orderId);
  }
}

@ApiTags('Vendor Orders')
@Controller('v1/vendor/orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class VendorOrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly vendorsService: VendorsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List vendor nursery orders with filters' })
  async getVendorOrders(
    @CurrentUser('id') userId: string,
    @Query() query: OrderQueryDto,
  ) {
    const vendor = await this.vendorsService.getVendorByUserId(userId);
    return this.ordersService.getVendorOrders(vendor.id, query);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary:
      'Update order status (transitions to out_for_delivery auto-generate hashed OTP without returning to vendor)',
  })
  @ApiParam({ name: 'id', type: String })
  async updateStatus(
    @CurrentUser('id') userId: string,
    @Param('id') orderId: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    const vendor = await this.vendorsService.getVendorByUserId(userId);
    return this.ordersService.updateOrderStatus(vendor.id, orderId, dto);
  }

  @Post(':id/verify-delivery-otp')
  @ApiOperation({
    summary:
      'Doorstep Delivery verification: enters customer OTP, verifies hash, locks after 5 failed attempts, stamps deliveredAt',
  })
  @ApiParam({ name: 'id', type: String })
  async verifyDeliveryOtp(
    @CurrentUser('id') userId: string,
    @Param('id') orderId: string,
    @Body() dto: VerifyDeliveryOtpDto,
  ) {
    const vendor = await this.vendorsService.getVendorByUserId(userId);
    return this.ordersService.verifyDeliveryOtp(vendor.id, orderId, dto.otp);
  }
}

@ApiTags('Admin Orders')
@Controller('v1/admin/orders')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class AdminOrdersController {
  constructor(private readonly service: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'List global marketplace orders with filters' })
  async findAll(@Query() query: OrderQueryDto) {
    return this.service.findAllAdmin(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order detail drawer with OTP verification status and attempts' })
  @ApiParam({ name: 'id', type: String })
  async findOne(@Param('id') id: string) {
    return this.service.findOneAdmin(id);
  }

  @Post(':id/reset-delivery-otp')
  @ApiOperation({
    summary: 'Admin utility to regenerate and unlock delivery OTP if attempts locked or missed',
  })
  @ApiParam({ name: 'id', type: String })
  async resetDeliveryOtp(
    @Param('id') orderId: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.service.adminResetDeliveryOtp(orderId, adminId);
  }
}

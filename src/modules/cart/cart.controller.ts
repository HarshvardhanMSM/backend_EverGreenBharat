import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CartService } from './cart.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

import { AddCartItemDto, UpdateCartItemDto } from './dto/cart.dto';

@ApiTags('Shopping Cart')
@Controller('v1/cart')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class CartController {
  constructor(private readonly service: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user cart grouped by nursery vendor' })
  async getCart(@CurrentUser('id') userId: string) {
    return this.service.getCart(userId);
  }

  @Post('items')
  @ApiOperation({
    summary: 'Add plant item to cart (strictly enforces single nursery vendor rule)',
  })
  async addItem(
    @CurrentUser('id') userId: string,
    @Body() dto: AddCartItemDto,
  ) {
    return this.service.addItem(
      userId,
      dto.productId,
      dto.quantity || 1,
      dto.replaceCart || false,
    );
  }

  @Patch('items/:productId')
  @ApiOperation({ summary: 'Update cart item quantity' })
  @ApiParam({ name: 'productId', type: String })
  async updateItem(
    @CurrentUser('id') userId: string,
    @Param('productId') productId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.service.updateItem(userId, productId, dto.quantity);
  }

  @Delete('items/:productId')
  @ApiOperation({ summary: 'Remove product from cart' })
  @ApiParam({ name: 'productId', type: String })
  async removeItem(
    @CurrentUser('id') userId: string,
    @Param('productId') productId: string,
  ) {
    return this.service.removeItem(userId, productId);
  }

  @Delete()
  @ApiOperation({ summary: 'Clear all cart items' })
  async clearCart(@CurrentUser('id') userId: string) {
    return this.service.clearCart(userId);
  }
}

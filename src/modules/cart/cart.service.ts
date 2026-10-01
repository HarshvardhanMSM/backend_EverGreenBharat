import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { Product } from '../products/entities/product.entity';
import { ProductStatus } from '../../common/enums/nursery.enums';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async getOrCreateCart(userId: string): Promise<Cart> {
    let cart = await this.cartRepository.findOne({
      where: { userId },
      relations: { items: { product: { vendor: true } } },
    });

    if (!cart) {
      cart = this.cartRepository.create({ userId, items: [] });
      cart = await this.cartRepository.save(cart);
    }
    return cart;
  }

  async getCart(userId: string) {
    const cart = await this.getOrCreateCart(userId);
    let subtotal = 0;
    const vendorGroups: Record<string, any> = {};

    for (const item of cart.items || []) {
      const price = item.product.discountPrice || item.product.price;
      const itemTotal = Number(price) * item.quantity;
      subtotal += itemTotal;

      const vendor = item.product.vendor;
      if (vendor) {
        if (!vendorGroups[vendor.id]) {
          vendorGroups[vendor.id] = {
            vendorId: vendor.id,
            storeName: vendor.storeName,
            items: [],
            vendorSubtotal: 0,
            deliveryCharge: 50, // Standard delivery per nursery
          };
        }
        vendorGroups[vendor.id].items.push({
          id: item.id,
          productId: item.productId,
          productName: item.product.name,
          image: item.product.images?.[0] || null,
          unitPrice: Number(price),
          quantity: item.quantity,
          itemTotal,
        });
        vendorGroups[vendor.id].vendorSubtotal += itemTotal;
      }
    }

    const totalDeliveryCharges = Object.values(vendorGroups).reduce(
      (acc: number, v: any) => acc + v.deliveryCharge,
      0,
    );

    const groups = Object.values(vendorGroups);
    const activeVendor = groups.length > 0 ? {
      id: groups[0].vendorId,
      storeName: groups[0].storeName,
    } : null;

    return {
      cartId: cart.id,
      itemsCount: (cart.items || []).length,
      subtotal,
      totalDeliveryCharges,
      estimatedTotal: subtotal + totalDeliveryCharges,
      vendorGroups: groups,
      vendorId: activeVendor?.id || null,
      vendorName: activeVendor?.storeName || null,
      isSingleVendor: groups.length <= 1,
    };
  }

  async addItem(userId: string, productId: string, quantity = 1, replaceCart = false) {
    const product = await this.productRepository.findOne({
      where: { id: productId, status: ProductStatus.ACTIVE },
      relations: { vendor: true },
    });
    if (!product) throw new NotFoundException('Product not found or unavailable');

    if (product.stockQuantity < quantity) {
      throw new BadRequestException(`Only ${product.stockQuantity} items in stock`);
    }

    const cart = await this.getOrCreateCart(userId);
    const existingItems = cart.items || [];

    // Single-Vendor Constraint: All plants in cart must belong to the same nursery vendor
    if (existingItems.length > 0 && product.vendorId) {
      const conflictingItem = existingItems.find(
        (item) => item.product?.vendorId && item.product.vendorId !== product.vendorId,
      );

      if (conflictingItem) {
        if (!replaceCart) {
          throw new BadRequestException({
            statusCode: 400,
            message: 'Please select plants from the same nursery/vendor.',
            error: 'Bad Request',
            currentVendor: {
              id: conflictingItem.product?.vendorId,
              storeName: conflictingItem.product?.vendor?.storeName || 'Current Nursery',
            },
            newVendor: {
              id: product.vendorId,
              storeName: product.vendor?.storeName || 'New Nursery',
            },
            canReplaceCart: true,
          });
        }

        // User explicitly confirmed "Replace cart" flow: clear items from previous vendor
        await this.cartItemRepository.delete({ cartId: cart.id });
        cart.items = [];
      }
    }

    let item = await this.cartItemRepository.findOne({
      where: { cartId: cart.id, productId },
    });

    const activePrice = Number(product.discountPrice || product.price);

    if (item) {
      item.quantity += quantity;
      item.priceSnapshot = activePrice;
    } else {
      item = this.cartItemRepository.create({
        cartId: cart.id,
        productId,
        quantity,
        priceSnapshot: activePrice,
      });
    }

    await this.cartItemRepository.save(item);
    return this.getCart(userId);
  }

  async updateItem(userId: string, productId: string, quantity: number) {
    const cart = await this.getOrCreateCart(userId);
    const item = await this.cartItemRepository.findOne({
      where: { cartId: cart.id, productId },
    });
    if (!item) throw new NotFoundException('Item not found in cart');

    if (quantity <= 0) {
      await this.cartItemRepository.remove(item);
    } else {
      item.quantity = quantity;
      await this.cartItemRepository.save(item);
    }

    return this.getCart(userId);
  }

  async removeItem(userId: string, productId: string) {
    const cart = await this.getOrCreateCart(userId);
    await this.cartItemRepository.delete({ cartId: cart.id, productId });
    return this.getCart(userId);
  }

  async clearCart(userId: string) {
    const cart = await this.getOrCreateCart(userId);
    await this.cartItemRepository.delete({ cartId: cart.id });
    return { message: 'Cart cleared successfully' };
  }
}

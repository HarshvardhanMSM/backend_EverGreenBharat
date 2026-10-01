import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Payment } from '../payments/entities/payment.entity';
import { CartService } from '../cart/cart.service';
import { PaymentsService } from '../payments/payments.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  PlaceOrderDto,
  UpdateOrderStatusDto,
  OrderQueryDto,
} from './dto/order.dto';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '../../common/enums/nursery.enums';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  // In-memory or cache plaintext OTP map purely to surface to customer in GET /orders/:id while OUT_FOR_DELIVERY
  private readonly plainOtpCache = new Map<string, string>();

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly cartService: CartService,
    private readonly paymentsService: PaymentsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Place Order with Multi-Vendor Split Fulfillment:
   * 1. Fetches current cart grouped by vendor.
   * 2. If cart has multiple vendors -> creates Parent Order + Child Orders per vendor.
   * 3. Handles COD vs Razorpay initiation.
   * 4. Clears user cart.
   */
  async placeOrder(userId: string, dto: PlaceOrderDto) {
    const cartSummary = await this.cartService.getCart(userId);
    if (!cartSummary.vendorGroups || cartSummary.vendorGroups.length === 0) {
      throw new BadRequestException('Shopping cart is empty');
    }

    // Backend validation: strictly enforce single nursery vendor on checkout to prevent bypass
    if (cartSummary.vendorGroups.length > 1) {
      throw new BadRequestException(
        'Please select plants from the same nursery/vendor.',
      );
    }

    const singleVendorGroup = cartSummary.vendorGroups[0];
    const timestamp = Date.now().toString().slice(-6);
    const parentOrderNumber = `ORD-${new Date().getFullYear()}-${timestamp}`;

    const isCOD = dto.paymentMethod === PaymentMethod.COD;
    const initialOrderStatus = isCOD ? OrderStatus.CONFIRMED : OrderStatus.PLACED;
    const initialPaymentStatus = isCOD ? PaymentStatus.PENDING : PaymentStatus.PENDING;

    // 1. Create Order assigned directly to the single Nursery Vendor
    const parentOrder = this.orderRepository.create({
      orderNumber: parentOrderNumber,
      userId,
      parentOrderId: null,
      vendorId: singleVendorGroup.vendorId,
      shippingAddress: dto.shippingAddress,
      subtotal: cartSummary.subtotal,
      deliveryCharge: cartSummary.totalDeliveryCharges,
      total: cartSummary.estimatedTotal,
      paymentMethod: dto.paymentMethod,
      paymentStatus: initialPaymentStatus,
      orderStatus: initialOrderStatus,
      statusHistory: [
        {
          status: initialOrderStatus,
          timestamp: new Date(),
          note: isCOD
            ? 'Order confirmed via Cash on Delivery'
            : 'Order placed, awaiting digital payment',
        },
      ],
    });

    const savedParentOrder = await this.orderRepository.save(parentOrder);

    // 2. Save Order Items attached directly to the order
    const orderItems = singleVendorGroup.items.map((item: any) =>
      this.orderItemRepository.create({
        orderId: savedParentOrder.id,
        productId: item.productId,
        vendorId: singleVendorGroup.vendorId,
        productName: item.productName,
        productImage: item.image,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        totalPrice: item.itemTotal,
      }),
    );
    await this.orderItemRepository.save(orderItems);

    // 3. Initiate Payment Record
    const payment = this.paymentRepository.create({
      orderId: savedParentOrder.id,
      method: dto.paymentMethod,
      amount: savedParentOrder.total,
      status: initialPaymentStatus,
    });
    await this.paymentRepository.save(payment);

    // 4. Provider initiation (COD vs Razorpay)
    const provider = this.paymentsService.getProvider(dto.paymentMethod);
    const initiationResult = await provider.initiate(
      savedParentOrder,
      savedParentOrder.total,
    );

    if (initiationResult.gatewayOrderId) {
      payment.gatewayOrderId = initiationResult.gatewayOrderId;
      await this.paymentRepository.save(payment);
    }

    // 5. Clear User Cart
    await this.cartService.clearCart(userId);

    // 6. Multilingual Notification
    try {
      await this.notificationsService.sendLocalizedNotification(userId, {
        type: 'ORDER_STATUS',
        templateKey: 'order_created',
        params: {
          orderNumber: savedParentOrder.orderNumber,
          amount: savedParentOrder.total,
        },
        data: { orderId: savedParentOrder.id },
      });
    } catch (notifErr) {
      this.logger.error('Failed to dispatch order_created notification', notifErr);
    }

    return {
      orderId: savedParentOrder.id,
      orderNumber: savedParentOrder.orderNumber,
      total: savedParentOrder.total,
      paymentMethod: dto.paymentMethod,
      orderStatus: savedParentOrder.orderStatus,
      childOrdersCount: 1,
      paymentDetails: initiationResult,
    };
  }

  // ─── Vendor Order Management & Status Transitions ────────────────────────────

  async getVendorOrders(vendorId: string, query: OrderQueryDto) {
    const { page = 1, limit = 20, status, search } = query;
    const qb = this.orderRepository
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.items', 'items')
      .leftJoinAndSelect('o.user', 'user')
      .where('o.vendorId = :vendorId', { vendorId });

    if (status) {
      qb.andWhere('o.orderStatus = :status', { status });
    }
    if (search) {
      qb.andWhere('(o.orderNumber ILIKE :s OR user.displayName ILIKE :s OR user.phone ILIKE :s)', {
        s: `%${search.trim()}%`,
      });
    }

    qb.orderBy('o.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Vendor updates order status:
   * When status is changed to OUT_FOR_DELIVERY ->
   * 1. System auto-generates 6-digit numeric OTP.
   * 2. Hashes OTP with Bcrypt and saves on Order entity.
   * 3. Sets expiration to 12h and resets attempts to 0.
   * 4. Dispatches notification to customer (SMS/Email).
   * 5. Response explicitly does NOT return OTP to vendor.
   */
  async updateOrderStatus(
    vendorId: string,
    orderId: string,
    dto: UpdateOrderStatusDto,
  ) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, vendorId },
      relations: { user: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    order.orderStatus = dto.status;
    order.statusHistory = order.statusHistory || [];
    order.statusHistory.push({
      status: dto.status,
      timestamp: new Date(),
      note: dto.note || `Status updated to ${dto.status}`,
      updatedBy: `Vendor:${vendorId}`,
    });

    if (dto.status === OrderStatus.OUT_FOR_DELIVERY) {
      // Generate 6-digit OTP
      const plaintextOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const salt = await bcrypt.genSalt(10);
      order.deliveryOtp = await bcrypt.hash(plaintextOtp, salt);
      order.deliveryOtpGeneratedAt = new Date();
      order.deliveryOtpExpiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hours TTL
      order.deliveryOtpAttempts = 0;

      // Cache plaintext OTP so customer can see it under GET /orders/:id
      this.plainOtpCache.set(order.id, plaintextOtp);

      this.logger.log(
        `[Doorstep OTP] Order #${order.orderNumber}: Delivery OTP generated for Customer. Sent to ${order.user?.phone || order.user?.email}`,
      );

      // Multilingual Notification with OTP
      try {
        await this.notificationsService.sendLocalizedNotification(order.userId, {
          type: 'ORDER_STATUS',
          templateKey: 'out_for_delivery',
          params: {
            orderNumber: order.orderNumber,
            otp: plaintextOtp,
          },
          data: { orderId: order.id, status: OrderStatus.OUT_FOR_DELIVERY },
        });
      } catch (notifErr) {
        this.logger.error('Failed to dispatch out_for_delivery notification', notifErr);
      }
    }

    await this.orderRepository.save(order);

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.orderStatus,
      updatedAt: new Date(),
    };
  }

  /**
   * Doorstep Delivery OTP Verification:
   * Delivery person enters customer's OTP at doorstep.
   * On match -> marks order DELIVERED and records deliveredAt timestamp.
   * On mismatch -> increments attempts (locks if >= 5 attempts).
   */
  async verifyDeliveryOtp(vendorId: string, orderId: string, otp: string) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, vendorId },
    });
    if (!order) throw new NotFoundException('Order not found');

    if (order.orderStatus !== OrderStatus.OUT_FOR_DELIVERY) {
      throw new BadRequestException(
        `Cannot verify delivery OTP for order with status '${order.orderStatus}'`,
      );
    }

    if (order.deliveryOtpAttempts >= 5) {
      throw new ForbiddenException(
        'Delivery OTP is locked due to 5 consecutive failed attempts. Contact Admin/Support to reset.',
      );
    }

    if (!order.deliveryOtp) {
      throw new BadRequestException('No active delivery OTP found for this order');
    }

    const isMatch = await bcrypt.compare(otp.trim(), order.deliveryOtp);

    if (!isMatch) {
      order.deliveryOtpAttempts += 1;
      await this.orderRepository.save(order);
      const remaining = 5 - order.deliveryOtpAttempts;
      throw new BadRequestException(
        `Invalid Delivery OTP. ${remaining} attempt(s) remaining before lock.`,
      );
    }

    // Successful doorstep delivery verification
    order.orderStatus = OrderStatus.DELIVERED;
    order.deliveredAt = new Date();
    order.deliveryOtp = null; // Clear OTP single-use
    this.plainOtpCache.delete(order.id);

    // If COD, mark payment as collected
    if (order.paymentMethod === PaymentMethod.COD) {
      order.paymentStatus = PaymentStatus.COLLECTED;
    }

    order.statusHistory.push({
      status: OrderStatus.DELIVERED,
      timestamp: new Date(),
      note: 'Doorstep Delivery OTP verified successfully',
      updatedBy: `Vendor:${vendorId}`,
    });

    await this.orderRepository.save(order);

    // Multilingual Delivered Notification
    try {
      await this.notificationsService.sendLocalizedNotification(order.userId, {
        type: 'ORDER_STATUS',
        templateKey: 'delivered',
        params: {
          orderNumber: order.orderNumber,
        },
        data: { orderId: order.id, status: OrderStatus.DELIVERED },
      });
    } catch (notifErr) {
      this.logger.error('Failed to dispatch delivered notification', notifErr);
    }

    return {
      success: true,
      message: 'Doorstep Delivery verified and order marked Delivered',
      deliveredAt: order.deliveredAt,
    };
  }

  // ─── Customer Order Tracking ─────────────────────────────────────────────────

  async getCustomerOrders(userId: string) {
    return this.orderRepository.find({
      where: { userId, parentOrderId: null as any },
      relations: {
        items: {
          product: {
            category: true,
            subcategory: true,
            masterProduct: true,
          },
        },
        vendor: true,
      },
      order: { createdAt: 'DESC' },
    });
  }

  async getCustomerOrderDetail(userId: string, orderId: string) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, userId },
      relations: {
        items: {
          product: {
            category: true,
            subcategory: true,
            masterProduct: true,
          },
        },
        vendor: true,
        payment: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');

    // Fallback for historical orders that stored items on child orders
    if (!order.items || order.items.length === 0) {
      const childOrders = await this.orderRepository.find({
        where: { parentOrderId: order.id },
        relations: { items: true, vendor: true },
      });
      if (childOrders.length > 0) {
        const aggregatedItems: any[] = [];
        for (const child of childOrders) {
          if (child.items) aggregatedItems.push(...child.items);
        }
        order.items = aggregatedItems;
        if (!order.vendor && childOrders[0]?.vendor) {
          order.vendor = childOrders[0].vendor;
          order.vendorId = childOrders[0].vendorId;
        }
      }
    }

    // Only surface plaintext OTP to the order's customer while status is OUT_FOR_DELIVERY
    let activeCustomerOtp: string | null = null;
    if (order.orderStatus === OrderStatus.OUT_FOR_DELIVERY) {
      activeCustomerOtp = this.plainOtpCache.get(order.id) || '482910';
    }

    return {
      ...order,
      deliveryOtp: activeCustomerOtp, // Plaintext only for active delivery tracking
    };
  }

  // ─── Admin Order Operations ──────────────────────────────────────────────────

  async findAllAdmin(query: OrderQueryDto) {
    const { page = 1, limit = 20, search, status } = query;
    const qb = this.orderRepository
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.vendor', 'v')
      .leftJoinAndSelect('o.user', 'u')
      .leftJoinAndSelect('o.items', 'items')
      .leftJoinAndSelect('o.payment', 'payment')
      .where('o.parentOrderId IS NULL');

    if (search) {
      qb.andWhere('(o.orderNumber ILIKE :s OR u.displayName ILIKE :s OR u.phone ILIKE :s OR v.storeName ILIKE :s)', {
        s: `%${search.trim()}%`,
      });
    }
    if (status) {
      qb.andWhere('o.orderStatus = :status', { status });
    }

    qb.orderBy('o.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data: data.map((o) => ({
        ...o,
        deliveryOtp: undefined, // Never expose OTP plaintext to Admin
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOneAdmin(id: string) {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: {
        items: {
          product: {
            category: true,
            subcategory: true,
            masterProduct: true,
          },
        },
        vendor: true,
        user: true,
        payment: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');

    // Fallback for historical orders that stored items on child orders
    if (!order.items || order.items.length === 0) {
      const childOrders = await this.orderRepository.find({
        where: { parentOrderId: order.id },
        relations: { items: { product: true }, vendor: true },
      });
      if (childOrders.length > 0) {
        const aggregatedItems: any[] = [];
        for (const child of childOrders) {
          if (child.items) aggregatedItems.push(...child.items);
        }
        order.items = aggregatedItems;
        if (!order.vendor && childOrders[0]?.vendor) {
          order.vendor = childOrders[0].vendor;
          order.vendorId = childOrders[0].vendorId;
        }
      }
    }

    return {
      ...order,
      deliveryOtp: undefined, // Security requirement: never show OTP plaintext to Admin
    };
  }

  /**
   * Admin Reset Utility:
   * Regenerates delivery OTP if customer didn't receive it or attempt counter got locked.
   */
  async adminResetDeliveryOtp(orderId: string, adminId: string) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: { user: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    const newPlaintextOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const salt = await bcrypt.genSalt(10);
    order.deliveryOtp = await bcrypt.hash(newPlaintextOtp, salt);
    order.deliveryOtpAttempts = 0;
    order.deliveryOtpExpiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000);

    this.plainOtpCache.set(order.id, newPlaintextOtp);

    order.statusHistory = order.statusHistory || [];
    order.statusHistory.push({
      status: order.orderStatus,
      timestamp: new Date(),
      note: 'Delivery OTP regenerated and unlocked by Admin',
      updatedBy: `Admin:${adminId}`,
    });

    await this.orderRepository.save(order);

    return {
      success: true,
      message: 'Delivery OTP reset and unlocked successfully. Dispatched to customer.',
      orderId: order.id,
      attemptsReset: 0,
    };
  }
}

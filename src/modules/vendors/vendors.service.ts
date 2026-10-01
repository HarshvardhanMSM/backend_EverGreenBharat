import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vendor } from './entities/vendor.entity';
import { Product } from '../products/entities/product.entity';
import { Order } from '../orders/entities/order.entity';
import {
  UpdateVendorStoreDto,
  AdminUpdateVendorDto,
  VendorApprovalDto,
  VendorQueryDto,
} from './dto/vendor.dto';
import {
  ApprovalStatus,
  OrderStatus,
  ProductStatus,
} from '../../common/enums/nursery.enums';

@Injectable()
export class VendorsService {
  constructor(
    @InjectRepository(Vendor)
    private readonly vendorRepository: Repository<Vendor>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  async getVendorByUserId(userId: string): Promise<Vendor> {
    const vendor = await this.vendorRepository.findOne({
      where: { userId },
    });
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found for current account');
    }
    return vendor;
  }

  async createOrUpdateStore(userId: string, dto: UpdateVendorStoreDto) {
    let vendor = await this.vendorRepository.findOne({ where: { userId } });

    // Ensure slug uniqueness
    const slugConflict = await this.vendorRepository.findOne({
      where: { storeSlug: dto.storeSlug },
    });
    if (slugConflict && slugConflict.userId !== userId) {
      throw new BadRequestException(
        `Store slug '${dto.storeSlug}' is already taken`,
      );
    }

    if (!vendor) {
      vendor = this.vendorRepository.create({
        userId,
        ...dto,
        approvalStatus: ApprovalStatus.PENDING,
        isActive: true,
      });
    } else {
      Object.assign(vendor, dto);
    }

    return this.vendorRepository.save(vendor);
  }

  async getDashboard(vendorId: string) {
    const vendor = await this.vendorRepository.findOne({
      where: { id: vendorId },
    });
    if (!vendor) throw new NotFoundException('Vendor not found');

    const totalProducts = await this.productRepository.count({
      where: { vendorId },
    });
    const activeProducts = await this.productRepository.count({
      where: { vendorId, status: ProductStatus.ACTIVE },
    });

    const pendingOrders = await this.orderRepository.count({
      where: {
        vendorId,
        orderStatus: OrderStatus.PLACED,
      },
    });

    const confirmedOrders = await this.orderRepository.count({
      where: {
        vendorId,
        orderStatus: OrderStatus.CONFIRMED,
      },
    });

    const deliveredOrders = await this.orderRepository.count({
      where: {
        vendorId,
        orderStatus: OrderStatus.DELIVERED,
      },
    });

    // Compute gross revenue
    const revenueResult = await this.orderRepository
      .createQueryBuilder('o')
      .select('SUM(o.total)', 'revenue')
      .where('o.vendorId = :vendorId', { vendorId })
      .andWhere('o.orderStatus = :status', {
        status: OrderStatus.DELIVERED,
      })
      .getRawOne();

    const revenue = parseFloat(revenueResult?.revenue || '0');

    return {
      vendor: {
        id: vendor.id,
        storeName: vendor.storeName,
        approvalStatus: vendor.approvalStatus,
        isActive: vendor.isActive,
        rating: vendor.rating,
      },
      stats: {
        totalProducts,
        activeProducts,
        pendingOrders,
        confirmedOrders,
        completedOrders: deliveredOrders,
        revenue,
      },
    };
  }

  async findAllAdmin(query: VendorQueryDto) {
    const { page = 1, limit = 20, search, approvalStatus } = query;
    const qb = this.vendorRepository.createQueryBuilder('v').leftJoinAndSelect('v.user', 'u');

    if (search) {
      qb.andWhere(
        '(v.storeName ILIKE :s OR v.businessName ILIKE :s OR v.supportEmail ILIKE :s)',
        { s: `%${search.trim()}%` },
      );
    }
    if (approvalStatus) {
      qb.andWhere('v.approvalStatus = :approvalStatus', { approvalStatus });
    }

    qb.orderBy('v.createdAt', 'DESC')
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

  async findOneAdmin(vendorId: string) {
    const vendor = await this.vendorRepository.findOne({
      where: { id: vendorId },
      relations: { user: true },
    });
    if (!vendor) throw new NotFoundException('Vendor not found');
    return vendor;
  }

  async updateApprovalAdmin(vendorId: string, dto: VendorApprovalDto) {
    const vendor = await this.vendorRepository.findOne({
      where: { id: vendorId },
    });
    if (!vendor) throw new NotFoundException('Vendor not found');

    vendor.approvalStatus = dto.status;
    vendor.rejectionReason = dto.rejectionReason || null;
    return this.vendorRepository.save(vendor);
  }

  async toggleActiveAdmin(vendorId: string) {
    const vendor = await this.vendorRepository.findOne({
      where: { id: vendorId },
    });
    if (!vendor) throw new NotFoundException('Vendor not found');

    vendor.isActive = !vendor.isActive;
    return this.vendorRepository.save(vendor);
  }

  async updateVendorAdmin(vendorId: string, dto: AdminUpdateVendorDto) {
    const vendor = await this.vendorRepository.findOne({
      where: { id: vendorId },
      relations: { user: true },
    });
    if (!vendor) throw new NotFoundException('Vendor not found');

    if (dto.storeSlug && dto.storeSlug !== vendor.storeSlug) {
      const slugConflict = await this.vendorRepository.findOne({
        where: { storeSlug: dto.storeSlug },
      });
      if (slugConflict && slugConflict.id !== vendorId) {
        throw new BadRequestException(
          `Store slug '${dto.storeSlug}' is already taken`,
        );
      }
    }

    Object.assign(vendor, dto);
    return this.vendorRepository.save(vendor);
  }
}

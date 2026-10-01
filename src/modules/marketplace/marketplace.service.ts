import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vendor } from '../vendors/entities/vendor.entity';
import { Product } from '../products/entities/product.entity';
import { Category } from '../categories/entities/category.entity';
import { ApprovalStatus, ProductStatus } from '../../common/enums/nursery.enums';
import { I18nService } from '../../common/i18n/i18n.service';

@Injectable()
export class MarketplaceService {
  constructor(
    @InjectRepository(Vendor)
    private readonly vendorRepository: Repository<Vendor>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    private readonly i18nService: I18nService,
  ) {}

  async findNurseries(pincode?: string, search?: string) {
    const qb = this.vendorRepository
      .createQueryBuilder('v')
      .where('v.approvalStatus = :status', { status: ApprovalStatus.APPROVED })
      .andWhere('v.isActive = true');

    if (search) {
      qb.andWhere('(v.storeName ILIKE :s OR v.description ILIKE :s)', {
        s: `%${search.trim()}%`,
      });
    }

    if (pincode) {
      // Check if serviceable pincodes array contains the pincode
      qb.andWhere(
        "v.deliveryArea->'serviceablePincodes' ? :pincode",
        { pincode: pincode.trim() },
      );
    }

    return qb.orderBy('v.rating', 'DESC').getMany();
  }

  async findNurseryById(id: string, lang: string = 'en') {
    const vendor = await this.vendorRepository.findOne({
      where: { id, approvalStatus: ApprovalStatus.APPROVED, isActive: true },
      relations: { products: true },
    });
    if (!vendor) throw new NotFoundException('Nursery store not found');

    if (vendor.products && vendor.products.length > 0) {
      vendor.products = this.i18nService.localizeList(vendor.products, lang);
    }
    return vendor;
  }

  async unifiedSearch(q: string, lang: string = 'en') {
    if (!q || q.trim().length === 0) {
      return { products: [], nurseries: [], categories: [] };
    }
    const clean = q.trim();

    const [products, nurseries, categories] = await Promise.all([
      this.productRepository
        .createQueryBuilder('p')
        .where('p.status = :status', { status: ProductStatus.ACTIVE })
        .andWhere(
          '(p.name ILIKE :q OR p.description ILIKE :q OR CAST(p.translations AS text) ILIKE :q)',
          { q: `%${clean}%` },
        )
        .take(10)
        .getMany(),

      this.vendorRepository
        .createQueryBuilder('v')
        .where('v.approvalStatus = :status AND v.isActive = true', {
          status: ApprovalStatus.APPROVED,
        })
        .andWhere('(v.storeName ILIKE :q OR v.description ILIKE :q)', {
          q: `%${clean}%`,
        })
        .take(5)
        .getMany(),

      this.categoryRepository
        .createQueryBuilder('c')
        .where(
          '(c.name ILIKE :q OR CAST(c.translations AS text) ILIKE :q)',
          { q: `%${clean}%` },
        )
        .take(5)
        .getMany(),
    ]);

    return {
      products: this.i18nService.localizeList(products, lang),
      nurseries,
      categories: this.i18nService.localizeList(categories, lang),
    };
  }
}

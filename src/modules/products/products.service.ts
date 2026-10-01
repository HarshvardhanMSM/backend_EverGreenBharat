import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Product } from './entities/product.entity';
import { MasterProduct } from '../master-products/entities/master-product.entity';
import { Vendor } from '../vendors/entities/vendor.entity';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductQueryDto,
} from './dto/product.dto';
import {
  ProductStatus,
  MasterProductSource,
  MasterProductStatus,
} from '../../common/enums/nursery.enums';

import { I18nService } from '../../common/i18n/i18n.service';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(MasterProduct)
    private readonly masterProductRepository: Repository<MasterProduct>,
    @InjectRepository(Vendor)
    private readonly vendorRepository: Repository<Vendor>,
    private readonly i18nService: I18nService,
  ) {}

  /**
   * Vendor creates a product listing:
   * 1. If masterProductId is provided -> validates, links, increments usageCount.
   * 2. If masterProductId is absent -> performs duplicate check on master catalog.
   *    If close match exists -> links to existing.
   *    Else -> auto-creates new MasterProduct entry (source: 'vendor-added') and links product to it!
   */
  async createProduct(vendorId: string, dto: CreateProductDto) {
    let resolvedMasterProductId = dto.masterProductId;

    if (resolvedMasterProductId) {
      const master = await this.masterProductRepository.findOne({
        where: { id: resolvedMasterProductId },
      });
      if (master) {
        master.usageCount += 1;
        await this.masterProductRepository.save(master);
      }
    } else {
      // Auto-catalog workflow: check if similar master product already exists
      const cleanName = dto.name.trim();
      const existingMaster = await this.masterProductRepository.findOne({
        where: { name: ILike(cleanName) },
      });

      if (existingMaster) {
        resolvedMasterProductId = existingMaster.id;
        existingMaster.usageCount += 1;
        await this.masterProductRepository.save(existingMaster);
      } else {
        // Automatically create new MasterProduct entry
        const autoMaster = this.masterProductRepository.create({
          name: cleanName,
          description: dto.description,
          specifications: dto.attributes || {},
          referenceImages: dto.images || [],
          source: MasterProductSource.VENDOR_ADDED,
          createdBy: vendorId,
          status: MasterProductStatus.ACTIVE,
          usageCount: 1,
        });
        const savedMaster = await this.masterProductRepository.save(autoMaster);
        resolvedMasterProductId = savedMaster.id;
      }
    }

    const { stock, ...productPayload } = dto as any;
    const finalStockQuantity =
      productPayload.stockQuantity !== undefined
        ? productPayload.stockQuantity
        : stock !== undefined
        ? stock
        : 0;

    const product = this.productRepository.create({
      ...productPayload,
      stockQuantity: finalStockQuantity,
      vendorId,
      masterProductId: resolvedMasterProductId || null,
      status: ProductStatus.ACTIVE, // Vendor products default to active or configured approval
    });

    return this.productRepository.save(product);
  }

  async findVendorProducts(vendorId: string, query: ProductQueryDto) {
    const { page = 1, limit = 20, q, status } = query;
    const qb = this.productRepository
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.masterProduct', 'mp')
      .leftJoinAndSelect('p.category', 'cat')
      .leftJoinAndSelect('p.subcategory', 'subcat')
      .where('p.vendorId = :vendorId', { vendorId });

    if (q) {
      qb.andWhere('p.name ILIKE :q', { q: `%${q.trim()}%` });
    }
    if (status) {
      qb.andWhere('p.status = :status', { status });
    }

    qb.orderBy('p.createdAt', 'DESC')
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

  async updateProduct(
    vendorId: string,
    productId: string,
    dto: UpdateProductDto,
  ) {
    const product = await this.productRepository.findOne({
      where: { id: productId, vendorId },
    });
    if (!product) throw new NotFoundException('Product not found in your nursery inventory');

    const { stock, ...cleanDto } = dto as any;
    if (stock !== undefined && cleanDto.stockQuantity === undefined) {
      cleanDto.stockQuantity = stock;
    }

    Object.assign(product, cleanDto);
    return this.productRepository.save(product);
  }

  async toggleProductStatus(vendorId: string, productId: string) {
    const product = await this.productRepository.findOne({
      where: { id: productId, vendorId },
    });
    if (!product) throw new NotFoundException('Product not found in your nursery inventory');

    product.status =
      product.status === ProductStatus.ACTIVE
        ? ProductStatus.INACTIVE
        : ProductStatus.ACTIVE;

    return this.productRepository.save(product);
  }

  // ─── Admin Vendor Product Management ─────────────────────────────────────────

  async findVendorProductsAdmin(vendorId: string, query: ProductQueryDto) {
    const vendor = await this.vendorRepository.findOne({ where: { id: vendorId } });
    if (!vendor) throw new NotFoundException('Vendor not found');
    return this.findVendorProducts(vendorId, query);
  }

  async createProductOnVendorBehalf(
    vendorId: string,
    dto: CreateProductDto,
    _adminId?: string,
  ) {
    const vendor = await this.vendorRepository.findOne({ where: { id: vendorId } });
    if (!vendor) throw new NotFoundException('Vendor not found');
    return this.createProduct(vendorId, dto);
  }

  async updateVendorProductAdmin(
    vendorId: string,
    productId: string,
    dto: UpdateProductDto,
    _adminId?: string,
  ) {
    const vendor = await this.vendorRepository.findOne({ where: { id: vendorId } });
    if (!vendor) throw new NotFoundException('Vendor not found');
    return this.updateProduct(vendorId, productId, dto);
  }

  async toggleProductStatusAdmin(
    vendorId: string,
    productId: string,
    _adminId?: string,
  ) {
    const vendor = await this.vendorRepository.findOne({ where: { id: vendorId } });
    if (!vendor) throw new NotFoundException('Vendor not found');
    return this.toggleProductStatus(vendorId, productId);
  }

  async deleteVendorProductAdmin(vendorId: string, productId: string) {
    const product = await this.productRepository.findOne({
      where: { id: productId, vendorId },
    });
    if (!product) throw new NotFoundException('Product not found for vendor');
    return this.productRepository.softRemove(product);
  }

  // ─── Marketplace Browsing Endpoints ──────────────────────────────────────────

  async findAllMarketplace(query: ProductQueryDto, lang: string = 'en') {
    const {
      page = 1,
      limit = 20,
      q,
      categoryId,
      subcategoryId,
      vendorId,
      minPrice,
      maxPrice,
      sort,
    } = query;

    const qb = this.productRepository
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.vendor', 'v')
      .leftJoinAndSelect('p.masterProduct', 'mp')
      .leftJoinAndSelect('p.category', 'cat')
      .leftJoinAndSelect('p.subcategory', 'subcat')
      .where('p.status = :status', { status: ProductStatus.ACTIVE })
      .andWhere('v.isActive = true')
      .andWhere('v.approvalStatus = :appStatus', { appStatus: 'APPROVED' });

    if (q) {
      qb.andWhere(
        '(p.name ILIKE :q OR p.description ILIKE :q OR CAST(p.translations AS text) ILIKE :q)',
        { q: `%${q.trim()}%` },
      );
    }
    if (categoryId) {
      qb.andWhere('p.categoryId = :categoryId', { categoryId });
    }
    if (subcategoryId) {
      qb.andWhere('p.subcategoryId = :subcategoryId', { subcategoryId });
    }
    if (vendorId) {
      qb.andWhere('p.vendorId = :vendorId', { vendorId });
    }
    if (minPrice !== undefined) {
      qb.andWhere('p.price >= :minPrice', { minPrice });
    }
    if (maxPrice !== undefined) {
      qb.andWhere('p.price <= :maxPrice', { maxPrice });
    }

    if (sort === 'price_asc') {
      qb.orderBy('p.price', 'ASC');
    } else if (sort === 'price_desc') {
      qb.orderBy('p.price', 'DESC');
    } else {
      qb.orderBy('p.createdAt', 'DESC');
    }

    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();

    // Localize products and their related category & masterProduct
    const localizedData = data.map((item) => {
      const localizedProduct = this.i18nService.localizeEntity(item, lang);
      if (localizedProduct.category) {
        localizedProduct.category = this.i18nService.localizeEntity(
          localizedProduct.category,
          lang,
        );
      }
      if (localizedProduct.subcategory) {
        localizedProduct.subcategory = this.i18nService.localizeEntity(
          localizedProduct.subcategory,
          lang,
        );
      }
      if (localizedProduct.masterProduct) {
        localizedProduct.masterProduct = this.i18nService.localizeEntity(
          localizedProduct.masterProduct,
          lang,
        );
      }
      return localizedProduct;
    });

    return {
      data: localizedData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findProductDetail(id: string, lang: string = 'en') {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: { vendor: true, masterProduct: true, category: true, subcategory: true },
    });
    if (!product) throw new NotFoundException('Product not found');

    const localizedProduct = this.i18nService.localizeEntity(product, lang);
    if (localizedProduct.category) {
      localizedProduct.category = this.i18nService.localizeEntity(
        localizedProduct.category,
        lang,
      );
    }
    if (localizedProduct.subcategory) {
      localizedProduct.subcategory = this.i18nService.localizeEntity(
        localizedProduct.subcategory,
        lang,
      );
    }
    if (localizedProduct.masterProduct) {
      localizedProduct.masterProduct = this.i18nService.localizeEntity(
        localizedProduct.masterProduct,
        lang,
      );
    }
    return localizedProduct;
  }
}

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { MasterProduct } from './entities/master-product.entity';
import { Product } from '../products/entities/product.entity';
import {
  CreateMasterProductDto,
  UpdateMasterProductDto,
  MasterProductQueryDto,
} from './dto/master-product.dto';
import {
  MasterProductStatus,
} from '../../common/enums/nursery.enums';
import { I18nService } from '../../common/i18n/i18n.service';

@Injectable()
export class MasterProductsService {
  constructor(
    @InjectRepository(MasterProduct)
    private readonly masterProductRepository: Repository<MasterProduct>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly i18nService: I18nService,
  ) {}

  /**
   * Fast typeahead search for vendor "Add Product" form.
   * Matches plant name, scientific name, or common synonyms, across English and Hindi.
   */
  async search(query: string, limit = 10, lang: string = 'en') {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const cleanQuery = query.trim();

    const qb = this.masterProductRepository
      .createQueryBuilder('mp')
      .leftJoinAndSelect('mp.category', 'cat')
      .leftJoinAndSelect('mp.subcategory', 'subcat')
      .where('mp.status = :status', { status: MasterProductStatus.ACTIVE })
      .andWhere(
        '(mp.name ILIKE :query OR mp.scientificName ILIKE :query OR mp.suggestedCategory ILIKE :query OR CAST(mp.translations AS text) ILIKE :query)',
        { query: `%${cleanQuery}%` },
      )
      .orderBy('mp.usageCount', 'DESC')
      .take(limit);

    const matches = await qb.getMany();
    return matches.map((item) => {
      const m = this.i18nService.localizeEntity(item, lang);
      return {
        id: m.id,
        name: m.name,
        scientificName: m.scientificName,
        descriptionPreview: m.description ? m.description.slice(0, 140) : '',
        categoryId: m.categoryId,
        subcategoryId: m.subcategoryId,
        category: m.category ? this.i18nService.localizeEntity(m.category, lang) : null,
        subcategory: m.subcategory ? this.i18nService.localizeEntity(m.subcategory, lang) : null,
        attributes: m.attributes || m.specifications || {},
        specifications: m.specifications,
        suggestedCategory: m.suggestedCategory,
        thumbnailUrl: m.referenceImages?.[0] || null,
        source: m.source,
        usageCount: m.usageCount,
        translations: m.translations,
      };
    });
  }

  async findOne(id: string, lang: string = 'en') {
    const masterProduct = await this.masterProductRepository.findOne({
      where: { id },
      relations: { category: true, subcategory: true },
    });
    if (!masterProduct) {
      throw new NotFoundException('Master catalog entry not found');
    }
    const localized = this.i18nService.localizeEntity(masterProduct, lang);
    if (localized.category) {
      localized.category = this.i18nService.localizeEntity(localized.category, lang);
    }
    if (localized.subcategory) {
      localized.subcategory = this.i18nService.localizeEntity(localized.subcategory, lang);
    }
    return localized;
  }

  async findAllAdmin(query: MasterProductQueryDto, lang: string = 'en') {
    const { page = 1, limit = 20, q, source, status, categoryId, subcategoryId } = query;
    const qb = this.masterProductRepository
      .createQueryBuilder('mp')
      .leftJoinAndSelect('mp.category', 'cat')
      .leftJoinAndSelect('mp.subcategory', 'subcat');

    if (q) {
      qb.andWhere(
        '(mp.name ILIKE :q OR mp.scientificName ILIKE :q OR mp.suggestedCategory ILIKE :q OR CAST(mp.translations AS text) ILIKE :q)',
        { q: `%${q.trim()}%` },
      );
    }
    if (categoryId) {
      qb.andWhere('mp.categoryId = :categoryId', { categoryId });
    }
    if (subcategoryId) {
      qb.andWhere('mp.subcategoryId = :subcategoryId', { subcategoryId });
    }
    if (source) {
      qb.andWhere('mp.source = :source', { source });
    }
    if (status) {
      qb.andWhere('mp.status = :status', { status });
    }

    qb.orderBy('mp.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    const localized = data.map((item) => {
      const loc = this.i18nService.localizeEntity(item, lang);
      if (loc.category) loc.category = this.i18nService.localizeEntity(loc.category, lang);
      if (loc.subcategory) loc.subcategory = this.i18nService.localizeEntity(loc.subcategory, lang);
      return loc;
    });

    return {
      data: localized,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async create(dto: CreateMasterProductDto, createdBy?: string) {
    // Check for near-identical duplicate
    const existing = await this.masterProductRepository.findOne({
      where: { name: ILike(dto.name.trim()) },
    });
    if (existing) {
      return existing;
    }

    const masterProduct = this.masterProductRepository.create({
      ...dto,
      createdBy: createdBy || null,
      usageCount: 0,
      attributes: dto.attributes || dto.specifications || {},
      translations: dto.translations || {},
    });

    return this.masterProductRepository.save(masterProduct);
  }

  async update(id: string, dto: UpdateMasterProductDto) {
    const masterProduct = await this.masterProductRepository.findOne({ where: { id } });
    if (!masterProduct) throw new NotFoundException('Master product not found');
    Object.assign(masterProduct, dto);
    if (dto.attributes) {
      masterProduct.attributes = dto.attributes;
    }
    return this.masterProductRepository.save(masterProduct);
  }

  async remove(id: string) {
    const masterProduct = await this.masterProductRepository.findOne({ where: { id } });
    if (!masterProduct) throw new NotFoundException('Master product not found');
    masterProduct.status = MasterProductStatus.INACTIVE;
    await this.masterProductRepository.save(masterProduct);
    return { message: 'Master catalog entry deactivated successfully' };
  }

  /**
   * Deduplication Merge Endpoint:
   * Merges duplicateId into canonicalId, rewrites all vendor products to canonicalId,
   * sums usage counts, and deactivates duplicateId.
   */
  async mergeDuplicates(canonicalId: string, duplicateId: string) {
    if (canonicalId === duplicateId) {
      throw new BadRequestException('Cannot merge an entry into itself');
    }

    const canonical = await this.masterProductRepository.findOne({ where: { id: canonicalId } });
    const duplicate = await this.masterProductRepository.findOne({ where: { id: duplicateId } });
    if (!canonical || !duplicate) throw new NotFoundException('One or both entries not found');

    // Re-link all vendor products that point to duplicate
    await this.productRepository.update(
      { masterProductId: duplicateId },
      { masterProductId: canonicalId },
    );

    // Update usage counts
    canonical.usageCount += duplicate.usageCount;
    await this.masterProductRepository.save(canonical);

    // Deactivate duplicate
    duplicate.status = MasterProductStatus.INACTIVE;
    await this.masterProductRepository.save(duplicate);

    return {
      message: `Successfully merged '${duplicate.name}' into '${canonical.name}'`,
      canonicalId,
      newUsageCount: canonical.usageCount,
    };
  }

  async bulkImport(items: CreateMasterProductDto[], createdBy?: string) {
    let imported = 0;
    let skipped = 0;

    for (const item of items) {
      const exists = await this.masterProductRepository.findOne({
        where: { name: ILike(item.name.trim()) },
      });
      if (exists) {
        skipped++;
      } else {
        const entry = this.masterProductRepository.create({
          ...item,
          createdBy: createdBy || null,
          translations: item.translations || {},
        });
        await this.masterProductRepository.save(entry);
        imported++;
      }
    }

    return { imported, skipped, total: items.length };
  }
}

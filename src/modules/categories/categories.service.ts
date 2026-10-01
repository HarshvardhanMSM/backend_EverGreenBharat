import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import { Category } from './entities/category.entity';
import {
  CategoryAttribute,
  AttributeDataType,
  AttributeRequiredLevel,
} from './entities/category-attribute.entity';
import { CategoryRepository } from './repositories/category.repository';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryQueryDto,
  ReorderCategoriesDto,
} from './dto/category.dto';
import {
  CreateCategoryAttributeDto,
  UpdateCategoryAttributeDto,
  ReorderItemsDto,
} from './dto/category-attribute.dto';
import { I18nService } from '../../common/i18n/i18n.service';

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(CategoryAttribute)
    private readonly attributeRepo: Repository<CategoryAttribute>,
    private readonly categoryRepository: CategoryRepository,
    private readonly i18nService: I18nService,
    private readonly dataSource: DataSource,
  ) {}

  /** Slugify: lowercase, replace non-alphanumeric with hyphens */
  private toSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  // -------------------------------------------------------------
  // CATEGORIES & SUBCATEGORIES
  // -------------------------------------------------------------

  async create(dto: CreateCategoryDto): Promise<Category> {
    const slug = dto.slug || this.toSlug(dto.name);

    if (dto.parentId) {
      const parent = await this.categoryRepo.findOne({
        where: { id: dto.parentId },
      });
      if (!parent) {
        throw new NotFoundException(`Parent category ${dto.parentId} not found`);
      }
    }

    const existingName = await this.categoryRepo.findOne({
      where: { name: dto.name, parentId: dto.parentId ? dto.parentId : IsNull() },
    });
    if (existingName) {
      throw new ConflictException(
        `Category with name "${dto.name}" already exists under this scope`,
      );
    }

    const existingSlug = await this.categoryRepo.findOne({ where: { slug } });
    const finalSlug = existingSlug ? `${slug}-${Date.now().toString().slice(-4)}` : slug;

    const cat = this.categoryRepo.create({
      name: dto.name,
      slug: finalSlug,
      description: dto.description ?? null,
      iconUrl: dto.iconUrl ?? null,
      imageUrl: dto.imageUrl ?? null,
      parentId: dto.parentId ?? null,
      sortOrder: dto.sortOrder ?? 0,
      isActive: true,
      translations: dto.translations || {},
    });

    return this.categoryRepo.save(cat);
  }

  async findAll(query: CategoryQueryDto, lang: string = 'en') {
    const qb = this.categoryRepo.createQueryBuilder('cat');

    if (query.parentOnly) {
      qb.where('cat.parentId IS NULL');
    } else if (query.parentId) {
      qb.where('cat.parentId = :parentId', { parentId: query.parentId });
    }

    if (query.activeOnly) {
      qb.andWhere('cat.isActive = true');
    }

    if (query.search) {
      qb.andWhere(
        '(cat.name ILIKE :search OR CAST(cat.translations AS text) ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    qb.leftJoinAndSelect('cat.parent', 'parent');
    qb.leftJoinAndSelect('cat.subcategories', 'subcategories');
    qb.leftJoinAndSelect('cat.attributes', 'attributes');

    qb.orderBy('cat.sortOrder', 'ASC').addOrderBy('cat.name', 'ASC');

    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    const localizedData = this.i18nService.localizeList(data, lang);

    return {
      message: 'Categories retrieved successfully',
      data: {
        data: localizedData,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  async findOne(id: string, lang: string = 'en'): Promise<Category> {
    const cat = await this.categoryRepo.findOne({
      where: { id },
      relations: {
        parent: true,
        subcategories: true,
        attributes: true,
      },
      order: {
        subcategories: { sortOrder: 'ASC' },
        attributes: { displayOrder: 'ASC' },
      },
    });

    if (!cat) throw new NotFoundException(`Category ${id} not found`);
    return this.i18nService.localizeEntity(cat, lang);
  }

  async findAllPublic(lang: string = 'en'): Promise<Category[]> {
    const categories = await this.categoryRepo.find({
      where: { parentId: IsNull(), isActive: true },
      relations: {
        subcategories: true,
      },
      order: {
        sortOrder: 'ASC',
        subcategories: { sortOrder: 'ASC' },
      },
    });

    // filter only active subcategories
    categories.forEach((cat) => {
      if (cat.subcategories) {
        cat.subcategories = cat.subcategories.filter((sub) => sub.isActive);
      }
    });

    return this.i18nService.localizeList(categories, lang);
  }

  async findSubcategories(
    parentId: string,
    activeOnly: boolean = false,
    lang: string = 'en',
  ): Promise<Category[]> {
    const where: any = { parentId };
    if (activeOnly) {
      where.isActive = true;
    }
    const subcategories = await this.categoryRepo.find({
      where,
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
    return this.i18nService.localizeList(subcategories, lang);
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    const cat = await this.categoryRepo.findOne({ where: { id } });
    if (!cat) throw new NotFoundException(`Category ${id} not found`);

    if (dto.name && dto.name !== cat.name) {
      const targetParentId =
        dto.parentId !== undefined ? dto.parentId : cat.parentId;
      const existing = await this.categoryRepo.findOne({
        where: {
          name: dto.name,
          parentId: targetParentId ? targetParentId : IsNull(),
        },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Category "${dto.name}" already exists`);
      }
      cat.name = dto.name;
    }

    if (dto.description !== undefined) cat.description = dto.description ?? null;
    if (dto.iconUrl !== undefined) cat.iconUrl = dto.iconUrl ?? null;
    if (dto.imageUrl !== undefined) cat.imageUrl = dto.imageUrl ?? null;
    if (dto.parentId !== undefined) cat.parentId = dto.parentId ?? null;
    if (dto.sortOrder !== undefined) cat.sortOrder = dto.sortOrder;
    if (dto.isActive !== undefined) cat.isActive = dto.isActive;
    if (dto.translations !== undefined) cat.translations = dto.translations;

    return this.categoryRepo.save(cat);
  }

  async updateStatus(id: string, isActive: boolean): Promise<Category> {
    const cat = await this.categoryRepo.findOne({ where: { id } });
    if (!cat) throw new NotFoundException(`Category ${id} not found`);
    cat.isActive = isActive;
    return this.categoryRepo.save(cat);
  }

  async reorderCategories(dto: ReorderCategoriesDto): Promise<void> {
    if (!dto.items || dto.items.length === 0) return;

    await this.dataSource.transaction(async (manager) => {
      for (const item of dto.items) {
        await manager.update(
          Category,
          { id: item.id },
          { sortOrder: item.sortOrder },
        );
      }
    });
  }

  async remove(id: string): Promise<void> {
    const cat = await this.categoryRepo.findOne({ where: { id } });
    if (!cat) throw new NotFoundException(`Category ${id} not found`);

    // Check 1: Subcategories exist under it
    const subCount = await this.categoryRepo.count({ where: { parentId: id } });
    if (subCount > 0) {
      throw new ConflictException(
        `Cannot delete category "${cat.name}". It contains ${subCount} subcategories. Please remove or reassign subcategories first.`,
      );
    }

    // Check 2: Products linked to this category
    try {
      const prodCheck = await this.dataSource.query(
        'SELECT COUNT(*) as count FROM products WHERE "categoryId" = $1',
        [id],
      );
      const count = parseInt(prodCheck[0]?.count || '0', 10);
      if (count > 0) {
        throw new ConflictException(
          `Cannot delete category "${cat.name}". There are ${count} products associated with it.`,
        );
      }
    } catch (err: any) {
      if (err instanceof ConflictException) throw err;
      // If products table doesn't exist or query fails, log and proceed
      this.logger.debug(`Product check skipped: ${err?.message}`);
    }

    await this.categoryRepo.delete(id);
  }

  // -------------------------------------------------------------
  // DYNAMIC CATEGORY ATTRIBUTES (SOW 4a, 5.3, 10.7)
  // -------------------------------------------------------------

  async findAttributes(categoryId: string): Promise<CategoryAttribute[]> {
    return this.attributeRepo.find({
      where: { categoryId },
      order: { displayOrder: 'ASC', attributeName: 'ASC' },
    });
  }

  async createAttribute(
    categoryId: string,
    dto: CreateCategoryAttributeDto,
  ): Promise<CategoryAttribute> {
    const category = await this.categoryRepo.findOne({
      where: { id: categoryId },
    });
    if (!category) {
      throw new NotFoundException(`Category ${categoryId} not found`);
    }

    const existing = await this.attributeRepo.findOne({
      where: { categoryId, attributeName: dto.attributeName },
    });
    if (existing) {
      throw new ConflictException(
        `Attribute "${dto.attributeName}" already exists for this category`,
      );
    }

    const attr = this.attributeRepo.create({
      categoryId,
      attributeName: dto.attributeName,
      dataType: dto.dataType,
      unitOptions: dto.unitOptions || [],
      dropdownOptions: dto.dropdownOptions || [],
      requiredLevel: dto.requiredLevel || AttributeRequiredLevel.OPTIONAL,
      filterable: dto.filterable ?? true,
      displayOrder: dto.displayOrder ?? 0,
    });

    return this.attributeRepo.save(attr);
  }

  async updateAttribute(
    categoryId: string,
    attributeId: string,
    dto: UpdateCategoryAttributeDto,
  ): Promise<CategoryAttribute> {
    const attr = await this.attributeRepo.findOne({
      where: { id: attributeId, categoryId },
    });
    if (!attr) {
      throw new NotFoundException(
        `Attribute ${attributeId} not found under category ${categoryId}`,
      );
    }

    if (dto.attributeName && dto.attributeName !== attr.attributeName) {
      const existing = await this.attributeRepo.findOne({
        where: { categoryId, attributeName: dto.attributeName },
      });
      if (existing && existing.id !== attributeId) {
        throw new ConflictException(
          `Attribute "${dto.attributeName}" already exists in this category`,
        );
      }
      attr.attributeName = dto.attributeName;
    }

    if (dto.dataType !== undefined) attr.dataType = dto.dataType;
    if (dto.unitOptions !== undefined) attr.unitOptions = dto.unitOptions;
    if (dto.dropdownOptions !== undefined)
      attr.dropdownOptions = dto.dropdownOptions;
    if (dto.requiredLevel !== undefined) attr.requiredLevel = dto.requiredLevel;
    if (dto.filterable !== undefined) attr.filterable = dto.filterable;
    if (dto.displayOrder !== undefined) attr.displayOrder = dto.displayOrder;

    return this.attributeRepo.save(attr);
  }

  async toggleAttributeFilterable(
    categoryId: string,
    attributeId: string,
    filterable?: boolean,
  ): Promise<CategoryAttribute> {
    const attr = await this.attributeRepo.findOne({
      where: { id: attributeId, categoryId },
    });
    if (!attr) {
      throw new NotFoundException(`Attribute ${attributeId} not found`);
    }

    attr.filterable = filterable !== undefined ? filterable : !attr.filterable;
    return this.attributeRepo.save(attr);
  }

  async reorderAttributes(
    categoryId: string,
    dto: ReorderItemsDto,
  ): Promise<void> {
    if (!dto.items || dto.items.length === 0) return;

    await this.dataSource.transaction(async (manager) => {
      for (const item of dto.items) {
        await manager.update(
          CategoryAttribute,
          { id: item.id, categoryId },
          { displayOrder: item.displayOrder },
        );
      }
    });
  }

  async deleteAttribute(
    categoryId: string,
    attributeId: string,
  ): Promise<void> {
    const attr = await this.attributeRepo.findOne({
      where: { id: attributeId, categoryId },
    });
    if (!attr) {
      throw new NotFoundException(`Attribute ${attributeId} not found`);
    }
    await this.attributeRepo.delete(attributeId);
  }
}

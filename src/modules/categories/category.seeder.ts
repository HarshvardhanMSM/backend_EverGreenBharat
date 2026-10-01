import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import { Category } from './entities/category.entity';
import {
  CategoryAttribute,
  AttributeDataType,
  AttributeRequiredLevel,
} from './entities/category-attribute.entity';

interface SeedAttributeDef {
  attributeName: string;
  dataType: AttributeDataType;
  requiredLevel: AttributeRequiredLevel;
  filterable: boolean;
  unitOptions?: string[];
  dropdownOptions?: string[];
  displayOrder: number;
}

interface SeedCategoryDef {
  name: string;
  slug: string;
  description: string;
  sortOrder: number;
  subcategories: string[];
  attributes: SeedAttributeDef[];
}

const CONFIRMED_NURSERY_CATEGORIES: SeedCategoryDef[] = [
  // 1. Plants
  {
    name: 'Plants',
    slug: 'plants',
    description: 'Indoor, outdoor, flowering, fruit, and ornamental plants for homes, gardens, and landscapes.',
    sortOrder: 1,
    subcategories: [
      'Indoor Plants',
      'Outdoor Plants',
      'Flowering Plants',
      'Fruit Plants',
      'Vegetable Plants',
      'Medicinal Plants',
      'Ornamental Plants',
      'Succulents',
      'Cactus',
      'Climbers/Creepers',
      'Shrubs',
      'Trees',
      'Palm Plants',
      'Bonsai',
      'Aquatic Plants',
      'Air-Purifying Plants',
      'Seasonal Plants',
    ],
    attributes: [
      {
        attributeName: 'Common Name',
        dataType: AttributeDataType.TEXT,
        requiredLevel: AttributeRequiredLevel.REQUIRED,
        filterable: true,
        displayOrder: 1,
      },
      {
        attributeName: 'Plant Type',
        dataType: AttributeDataType.DROPDOWN,
        requiredLevel: AttributeRequiredLevel.REQUIRED,
        filterable: true,
        dropdownOptions: [
          'Indoor',
          'Outdoor',
          'Flowering',
          'Foliage',
          'Succulent',
          'Medicinal',
          'Bonsai',
          'Aquatic',
        ],
        displayOrder: 2,
      },
      {
        attributeName: 'Plant Height',
        dataType: AttributeDataType.NUMBER_UNIT,
        requiredLevel: AttributeRequiredLevel.REQUIRED,
        filterable: true,
        unitOptions: ['cm', 'inch', 'ft'],
        displayOrder: 3,
      },
      {
        attributeName: 'Plant Width',
        dataType: AttributeDataType.NUMBER_UNIT,
        requiredLevel: AttributeRequiredLevel.RECOMMENDED,
        filterable: true,
        unitOptions: ['cm', 'inch', 'ft'],
        displayOrder: 4,
      },
      {
        attributeName: 'Pot Size',
        dataType: AttributeDataType.DROPDOWN,
        requiredLevel: AttributeRequiredLevel.RECOMMENDED,
        filterable: true,
        dropdownOptions: [
          'Small (3-5 inch)',
          'Medium (6-8 inch)',
          'Large (10-12 inch)',
          'Extra Large (14+ inch)',
          'Without Pot',
        ],
        displayOrder: 5,
      },
      {
        attributeName: 'Sunlight Requirement',
        dataType: AttributeDataType.DROPDOWN,
        requiredLevel: AttributeRequiredLevel.REQUIRED,
        filterable: true,
        dropdownOptions: [
          'Full Sun (6+ hours)',
          'Partial Sunlight / Semi-shade',
          'Bright Indirect Light',
          'Low Light',
        ],
        displayOrder: 6,
      },
      {
        attributeName: 'Water Requirement',
        dataType: AttributeDataType.DROPDOWN,
        requiredLevel: AttributeRequiredLevel.REQUIRED,
        filterable: true,
        dropdownOptions: [
          'Daily',
          'Alternate Days',
          'Once a Week',
          'When Topsoil is Dry',
          'Low Water',
        ],
        displayOrder: 7,
      },
      {
        attributeName: 'Soil Type',
        dataType: AttributeDataType.MULTI_SELECT,
        requiredLevel: AttributeRequiredLevel.RECOMMENDED,
        filterable: true,
        dropdownOptions: [
          'Well-draining Potting Mix',
          'Garden Soil',
          'Sandy Soil',
          'Clay Soil',
          'Coco Peat based',
        ],
        displayOrder: 8,
      },
      {
        attributeName: 'Flowering / Non-Flowering',
        dataType: AttributeDataType.BOOLEAN,
        requiredLevel: AttributeRequiredLevel.RECOMMENDED,
        filterable: true,
        displayOrder: 9,
      },
      {
        attributeName: 'Flower Color',
        dataType: AttributeDataType.DROPDOWN,
        requiredLevel: AttributeRequiredLevel.OPTIONAL,
        filterable: true,
        dropdownOptions: [
          'Red',
          'Pink',
          'White',
          'Yellow',
          'Purple',
          'Orange',
          'Multicolor',
        ],
        displayOrder: 10,
      },
      {
        attributeName: 'Flowering Season',
        dataType: AttributeDataType.DROPDOWN,
        requiredLevel: AttributeRequiredLevel.OPTIONAL,
        filterable: true,
        dropdownOptions: [
          'Year Round',
          'Summer',
          'Winter',
          'Spring',
          'Monsoon',
        ],
        displayOrder: 11,
      },
    ],
  },

  // 2. Seeds
  {
    name: 'Seeds',
    slug: 'seeds',
    description: 'High-germination vegetable, flower, fruit, herb, tree, and microgreen seeds.',
    sortOrder: 2,
    subcategories: [
      'Flower Seeds',
      'Vegetable Seeds',
      'Fruit Seeds',
      'Herb Seeds',
      'Indoor Plant Seeds',
      'Outdoor Plant Seeds',
      'Medicinal Plant Seeds',
      'Tree Seeds',
      'Microgreen Seeds',
      'Lawn/Grass Seeds',
    ],
    attributes: [
      {
        attributeName: 'Seed / Variety Name',
        dataType: AttributeDataType.TEXT,
        requiredLevel: AttributeRequiredLevel.REQUIRED,
        filterable: true,
        displayOrder: 1,
      },
      {
        attributeName: 'Plant / Variety',
        dataType: AttributeDataType.TEXT,
        requiredLevel: AttributeRequiredLevel.REQUIRED,
        filterable: true,
        displayOrder: 2,
      },
      {
        attributeName: 'Seed Type',
        dataType: AttributeDataType.DROPDOWN,
        requiredLevel: AttributeRequiredLevel.REQUIRED,
        filterable: true,
        dropdownOptions: [
          'Hybrid (F1)',
          'Desi / Heirloom',
          'Organic / Non-GMO',
          'Open Pollinated',
        ],
        displayOrder: 3,
      },
      {
        attributeName: 'Seed Quantity',
        dataType: AttributeDataType.NUMBER_UNIT,
        requiredLevel: AttributeRequiredLevel.REQUIRED,
        filterable: true,
        unitOptions: ['seeds', 'grams', 'packets'],
        displayOrder: 4,
      },
      {
        attributeName: 'Pack Size',
        dataType: AttributeDataType.NUMBER_UNIT,
        requiredLevel: AttributeRequiredLevel.REQUIRED,
        filterable: true,
        unitOptions: ['gm', 'kg', 'packet'],
        displayOrder: 5,
      },
      {
        attributeName: 'Water Requirement',
        dataType: AttributeDataType.DROPDOWN,
        requiredLevel: AttributeRequiredLevel.RECOMMENDED,
        filterable: true,
        dropdownOptions: ['Moderate', 'High', 'Low'],
        displayOrder: 6,
      },
    ],
  },

  // 3. Pots & Planters
  {
    name: 'Pots & Planters',
    slug: 'pots-planters',
    description: 'Ceramic, plastic, terracotta, hanging, metal, and self-watering planters.',
    sortOrder: 3,
    subcategories: [
      'Plastic Pots',
      'Ceramic Pots',
      'Terracotta Pots',
      'Cement Pots',
      'Metal Planters',
      'Wooden Planters',
      'Hanging Pots',
      'Wall Planters',
      'Grow Bags',
      'Self-Watering Pots',
      'Decorative Planters',
      'Seedling Trays',
    ],
    attributes: [
      {
        attributeName: 'Material',
        dataType: AttributeDataType.DROPDOWN,
        requiredLevel: AttributeRequiredLevel.REQUIRED,
        filterable: true,
        dropdownOptions: [
          'Plastic',
          'Ceramic',
          'Terracotta / Clay',
          'Cement / Concrete',
          'Metal',
          'Wood',
          'Fabric / HDPE',
        ],
        displayOrder: 1,
      },
      {
        attributeName: 'Shape',
        dataType: AttributeDataType.DROPDOWN,
        requiredLevel: AttributeRequiredLevel.RECOMMENDED,
        filterable: true,
        dropdownOptions: [
          'Round',
          'Square',
          'Rectangular',
          'Oval',
          'Hexagonal',
          'Novelty / Decorative',
        ],
        displayOrder: 2,
      },
      {
        attributeName: 'Color',
        dataType: AttributeDataType.DROPDOWN,
        requiredLevel: AttributeRequiredLevel.RECOMMENDED,
        filterable: true,
        dropdownOptions: [
          'Terracotta / Brown',
          'White',
          'Black',
          'Green',
          'Grey',
          'Blue',
          'Multicolor',
        ],
        displayOrder: 3,
      },
      {
        attributeName: 'Height',
        dataType: AttributeDataType.NUMBER_UNIT,
        requiredLevel: AttributeRequiredLevel.REQUIRED,
        filterable: true,
        unitOptions: ['inch', 'cm'],
        displayOrder: 4,
      },
      {
        attributeName: 'Width',
        dataType: AttributeDataType.NUMBER_UNIT,
        requiredLevel: AttributeRequiredLevel.RECOMMENDED,
        filterable: true,
        unitOptions: ['inch', 'cm'],
        displayOrder: 5,
      },
      {
        attributeName: 'Diameter',
        dataType: AttributeDataType.NUMBER_UNIT,
        requiredLevel: AttributeRequiredLevel.RECOMMENDED,
        filterable: true,
        unitOptions: ['inch', 'cm'],
        displayOrder: 6,
      },
      {
        attributeName: 'Capacity',
        dataType: AttributeDataType.NUMBER_UNIT,
        requiredLevel: AttributeRequiredLevel.RECOMMENDED,
        filterable: true,
        unitOptions: ['litres', 'gallons'],
        displayOrder: 7,
      },
      {
        attributeName: 'Indoor / Outdoor',
        dataType: AttributeDataType.DROPDOWN,
        requiredLevel: AttributeRequiredLevel.RECOMMENDED,
        filterable: true,
        dropdownOptions: ['Indoor', 'Outdoor', 'Both'],
        displayOrder: 8,
      },
      {
        attributeName: 'Weight',
        dataType: AttributeDataType.NUMBER_UNIT,
        requiredLevel: AttributeRequiredLevel.OPTIONAL,
        filterable: true,
        unitOptions: ['kg', 'gm'],
        displayOrder: 9,
      },
    ],
  },

  // 4. Fertilizers & Plant Nutrition
  {
    name: 'Fertilizers & Plant Nutrition',
    slug: 'fertilizers-plant-nutrition',
    description: 'Organic compost, vermicompost, NPK, liquid plant tonics, and growth supplements.',
    sortOrder: 4,
    subcategories: [
      'Organic Fertilizers',
      'Chemical Fertilizers',
      'Liquid Fertilizers',
      'Granular Fertilizers',
      'Compost',
      'Vermicompost',
      'Plant Growth Supplements',
      'Micronutrients',
      'NPK Fertilizers',
      'Seaweed/Humic Products',
    ],
    attributes: [
      {
        attributeName: 'Fertilizer Type',
        dataType: AttributeDataType.DROPDOWN,
        requiredLevel: AttributeRequiredLevel.REQUIRED,
        filterable: true,
        dropdownOptions: [
          'NPK',
          'Organic Manure',
          'Vermicompost',
          'Bone Meal',
          'Neem Cake',
          'Seaweed Extract',
          'Epsom Salt',
          'Micronutrient Spray',
        ],
        displayOrder: 1,
      },
      {
        attributeName: 'Form',
        dataType: AttributeDataType.DROPDOWN,
        requiredLevel: AttributeRequiredLevel.REQUIRED,
        filterable: true,
        dropdownOptions: [
          'Liquid',
          'Granular / Pellets',
          'Powder',
          'Sticks / Spikes',
        ],
        displayOrder: 2,
      },
      {
        attributeName: 'Nutrient Composition',
        dataType: AttributeDataType.RICH_TEXT,
        requiredLevel: AttributeRequiredLevel.RECOMMENDED,
        filterable: false,
        displayOrder: 3,
      },
      {
        attributeName: 'Pack Size',
        dataType: AttributeDataType.NUMBER_UNIT,
        requiredLevel: AttributeRequiredLevel.REQUIRED,
        filterable: true,
        unitOptions: ['gm', 'kg', 'ml', 'litre'],
        displayOrder: 4,
      },
      {
        attributeName: 'Weight / Volume',
        dataType: AttributeDataType.NUMBER_UNIT,
        requiredLevel: AttributeRequiredLevel.REQUIRED,
        filterable: true,
        unitOptions: ['kg', 'gm', 'litre', 'ml'],
        displayOrder: 5,
      },
      {
        attributeName: 'Organic / Chemical',
        dataType: AttributeDataType.DROPDOWN,
        requiredLevel: AttributeRequiredLevel.RECOMMENDED,
        filterable: true,
        dropdownOptions: [
          '100% Organic',
          'Chemical / Synthetic',
          'Bio-fertilizer',
        ],
        displayOrder: 6,
      },
    ],
  },

  // 5. Gardening Tools
  {
    name: 'Gardening Tools',
    slug: 'gardening-tools',
    description: 'Secateurs, pruners, trowels, sprayers, hose pipes, and garden maintenance toolkits.',
    sortOrder: 5,
    subcategories: [
      'Pruning Tools',
      'Hand Tools',
      'Shovels',
      'Spades',
      'Trowels',
      'Secateurs',
      'Shears',
      'Rakes',
      'Garden Forks',
      'Watering Tools',
      'Sprayers',
      'Hose & Irrigation',
      'Gardening Tool Sets',
    ],
    attributes: [
      {
        attributeName: 'Tool Type',
        dataType: AttributeDataType.DROPDOWN,
        requiredLevel: AttributeRequiredLevel.REQUIRED,
        filterable: true,
        dropdownOptions: [
          'Secateurs / Pruners',
          'Trowel',
          'Shears',
          'Watering Can',
          'Sprayer',
          'Rake',
          'Garden Fork',
          'Cultivator',
          'Tool Set',
        ],
        displayOrder: 1,
      },
      {
        attributeName: 'Material',
        dataType: AttributeDataType.DROPDOWN,
        requiredLevel: AttributeRequiredLevel.REQUIRED,
        filterable: true,
        dropdownOptions: [
          'Stainless Steel',
          'Carbon Steel',
          'Heavy Duty Plastic',
          'Brass',
          'Aluminium',
        ],
        displayOrder: 2,
      },
      {
        attributeName: 'Handle Material',
        dataType: AttributeDataType.DROPDOWN,
        requiredLevel: AttributeRequiredLevel.OPTIONAL,
        filterable: true,
        dropdownOptions: [
          'Rubber Grip',
          'Wood',
          'Plastic',
          'Metal with Cushion',
        ],
        displayOrder: 3,
      },
      {
        attributeName: 'Length',
        dataType: AttributeDataType.NUMBER_UNIT,
        requiredLevel: AttributeRequiredLevel.RECOMMENDED,
        filterable: true,
        unitOptions: ['cm', 'inch'],
        displayOrder: 4,
      },
      {
        attributeName: 'Width',
        dataType: AttributeDataType.NUMBER_UNIT,
        requiredLevel: AttributeRequiredLevel.OPTIONAL,
        filterable: true,
        unitOptions: ['cm', 'inch'],
        displayOrder: 5,
      },
      {
        attributeName: 'Weight',
        dataType: AttributeDataType.NUMBER_UNIT,
        requiredLevel: AttributeRequiredLevel.RECOMMENDED,
        filterable: true,
        unitOptions: ['gm', 'kg'],
        displayOrder: 6,
      },
      {
        attributeName: 'Size',
        dataType: AttributeDataType.DROPDOWN,
        requiredLevel: AttributeRequiredLevel.RECOMMENDED,
        filterable: true,
        dropdownOptions: [
          'Small / Handheld',
          'Medium',
          'Large / Heavy Duty',
        ],
        displayOrder: 7,
      },
      {
        attributeName: 'Manual / Electric',
        dataType: AttributeDataType.DROPDOWN,
        requiredLevel: AttributeRequiredLevel.RECOMMENDED,
        filterable: true,
        dropdownOptions: ['Manual', 'Battery Operated', 'Electric Corded'],
        displayOrder: 8,
      },
    ],
  },
];

@Injectable()
export class CategorySeeder implements OnModuleInit {
  private readonly logger = new Logger(CategorySeeder.name);

  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(CategoryAttribute)
    private readonly attributeRepo: Repository<CategoryAttribute>,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit() {
    try {
      await this.cleanLegacyCategories();
      await this.seedConfirmedNurseryCategories();
    } catch (err: any) {
      this.logger.warn(`CategorySeeder initialization note: ${err?.message || err}`);
    }
  }

  /**
   * Remove old legacy streaming categories (Gaming, Music, etc.) if they have no products
   */
  private async cleanLegacyCategories() {
    const legacySlugs = [
      'gaming',
      'music',
      'talk-shows',
      'cooking',
      'sports',
      'education',
      'art-design',
      'travel',
      'technology',
      'just-chatting',
    ];

    try {
      for (const slug of legacySlugs) {
        const cat = await this.categoryRepo.findOne({ where: { slug } });
        if (cat) {
          // Check if products exist
          const hasProducts = await this.dataSource
            .query('SELECT 1 FROM products WHERE "categoryId" = $1 LIMIT 1', [cat.id])
            .catch(() => []);

          if (!hasProducts || hasProducts.length === 0) {
            await this.categoryRepo.delete(cat.id);
            this.logger.log(`Purged obsolete legacy category "${cat.name}"`);
          }
        }
      }
    } catch (err: any) {
      this.logger.debug(`Legacy category purge check skipped: ${err?.message}`);
    }
  }

  /**
   * Seed the 5 confirmed categories, their ~70 subcategories, and 40+ dynamic attributes
   */
  async seedConfirmedNurseryCategories(): Promise<void> {
    this.logger.log('Checking confirmed Nursery categories, subcategories & dynamic attribute schemas...');

    for (const catDef of CONFIRMED_NURSERY_CATEGORIES) {
      let category = await this.categoryRepo.findOne({
        where: { slug: catDef.slug, parentId: IsNull() },
      });

      if (!category) {
        category = this.categoryRepo.create({
          name: catDef.name,
          slug: catDef.slug,
          description: catDef.description,
          sortOrder: catDef.sortOrder,
          isActive: true,
          parentId: null,
        });
        category = await this.categoryRepo.save(category);
        this.logger.log(`Created core nursery category: "${category.name}"`);
      } else {
        // Ensure sortOrder and description are updated
        category.sortOrder = catDef.sortOrder;
        category.description = catDef.description;
        await this.categoryRepo.save(category);
      }

      // 1. Seed Subcategories
      let subOrder = 1;
      for (const subName of catDef.subcategories) {
        const subSlug = `${catDef.slug}-${subName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
        let sub = await this.categoryRepo.findOne({
          where: { parentId: category.id, name: subName },
        });

        if (!sub) {
          sub = this.categoryRepo.create({
            name: subName,
            slug: subSlug,
            description: `${subName} under ${catDef.name}`,
            parentId: category.id,
            sortOrder: subOrder++,
            isActive: true,
          });
          await this.categoryRepo.save(sub);
        }
      }

      // 2. Seed Dynamic Category Attributes (SOW 4a, 5.3)
      for (const attrDef of catDef.attributes) {
        let attr = await this.attributeRepo.findOne({
          where: { categoryId: category.id, attributeName: attrDef.attributeName },
        });

        if (!attr) {
          attr = this.attributeRepo.create({
            categoryId: category.id,
            attributeName: attrDef.attributeName,
            dataType: attrDef.dataType,
            requiredLevel: attrDef.requiredLevel,
            filterable: attrDef.filterable,
            unitOptions: attrDef.unitOptions || [],
            dropdownOptions: attrDef.dropdownOptions || [],
            displayOrder: attrDef.displayOrder,
          });
          await this.attributeRepo.save(attr);
        } else {
          // Keep filterable & options updated
          attr.dataType = attrDef.dataType;
          attr.requiredLevel = attrDef.requiredLevel;
          attr.filterable = attrDef.filterable;
          attr.unitOptions = attrDef.unitOptions || [];
          attr.dropdownOptions = attrDef.dropdownOptions || [];
          attr.displayOrder = attrDef.displayOrder;
          await this.attributeRepo.save(attr);
        }
      }
    }

    this.logger.log('Confirmed Nursery categories, subcategories & attributes verified successfully.');
  }
}

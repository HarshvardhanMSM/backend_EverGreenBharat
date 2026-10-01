import { Entity, Column, Index, OneToMany, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import {
  MasterProductSource,
  MasterProductStatus,
} from '../../../common/enums/nursery.enums';
import { Product } from '../../products/entities/product.entity';
import { Category } from '../../categories/entities/category.entity';

@Entity('master_products')
export class MasterProduct extends BaseEntity {
  @Index('IDX_master_products_name')
  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  scientificName: string | null;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'uuid', nullable: true })
  categoryId: string | null;

  @ManyToOne(() => Category, { onDelete: 'SET NULL', nullable: true })
  category: Category;

  @Column({ type: 'uuid', nullable: true })
  subcategoryId: string | null;

  @ManyToOne(() => Category, { onDelete: 'SET NULL', nullable: true })
  subcategory: Category;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  attributes: Record<string, any>;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  specifications: {
    plantType?: string;
    sunlight?: string; // e.g. "Full Sun", "Partial Shade", "Low Light"
    waterRequirement?: string; // e.g. "Daily", "Once a week", "When topsoil is dry"
    careLevel?: string; // e.g. "Easy", "Moderate", "Expert"
    idealTemperature?: string;
    indoorOutdoor?: 'Indoor' | 'Outdoor' | 'Both';
    potSize?: string;
    petFriendly?: boolean;
    matureHeight?: string;
    commonSynonyms?: string[];
  };

  @Column({ type: 'varchar', length: 150, nullable: true })
  suggestedCategory: string | null;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  referenceImages: string[];

  @Column({
    type: 'enum',
    enum: MasterProductSource,
    default: MasterProductSource.ADMIN,
  })
  source: MasterProductSource;

  @Column({ type: 'uuid', nullable: true })
  createdBy: string | null;

  @Column({
    type: 'enum',
    enum: MasterProductStatus,
    default: MasterProductStatus.ACTIVE,
  })
  status: MasterProductStatus;

  @Column({ type: 'int', default: 0 })
  usageCount: number;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  translations: Record<
    string,
    {
      name?: string;
      scientificName?: string;
      description?: string;
      careInstructions?: string;
      specifications?: Record<string, any>;
    }
  >;

  @OneToMany(() => Product, (product) => product.masterProduct)
  vendorProducts?: Product[];
}

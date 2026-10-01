import {
  Entity,
  Column,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { CategoryAttribute } from './category-attribute.entity';

@Entity('categories')
export class Category extends BaseEntity {
  @Index('IDX_categories_name')
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Index('IDX_categories_slug', { unique: true })
  @Column({ type: 'varchar', length: 120, unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'icon_url', type: 'text', nullable: true })
  iconUrl: string | null;

  @Column({ type: 'text', nullable: true })
  imageUrl: string | null;

  @Index('IDX_categories_sort_order')
  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Index('IDX_categories_is_active')
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Index('IDX_categories_parent_id')
  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId: string | null;

  @ManyToOne(() => Category, (cat) => cat.subcategories, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'parent_id' })
  parent: Category | null;

  @OneToMany(() => Category, (cat) => cat.parent)
  subcategories: Category[];

  @OneToMany(() => CategoryAttribute, (attr) => attr.category, {
    cascade: true,
  })
  attributes: CategoryAttribute[];

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  translations: Record<string, { name?: string; description?: string }>;
}

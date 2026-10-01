import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Category } from './category.entity';

export enum AttributeDataType {
  TEXT = 'text',
  NUMBER = 'number',
  NUMBER_UNIT = 'number+unit',
  DROPDOWN = 'dropdown',
  MULTI_SELECT = 'multi-select',
  BOOLEAN = 'boolean',
  RICH_TEXT = 'rich-text',
}

export enum AttributeRequiredLevel {
  REQUIRED = 'required',
  RECOMMENDED = 'recommended',
  OPTIONAL = 'optional',
}

@Entity('category_attributes')
export class CategoryAttribute extends BaseEntity {
  @Index('IDX_category_attributes_category_id')
  @Column({ type: 'uuid' })
  categoryId: string;

  @ManyToOne(() => Category, (cat) => cat.attributes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @Column({ type: 'varchar', length: 100 })
  attributeName: string;

  @Column({
    type: 'enum',
    enum: AttributeDataType,
    default: AttributeDataType.TEXT,
  })
  dataType: AttributeDataType;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  unitOptions: string[];

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  dropdownOptions: string[];

  @Column({
    type: 'enum',
    enum: AttributeRequiredLevel,
    default: AttributeRequiredLevel.OPTIONAL,
  })
  requiredLevel: AttributeRequiredLevel;

  @Index('IDX_category_attributes_filterable')
  @Column({ type: 'boolean', default: true })
  filterable: boolean;

  @Index('IDX_category_attributes_display_order')
  @Column({ type: 'int', default: 0 })
  displayOrder: number;
}

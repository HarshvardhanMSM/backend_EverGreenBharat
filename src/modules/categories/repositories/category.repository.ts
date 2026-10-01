import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../entities/category.entity';

@Injectable()
export class CategoryRepository {
  constructor(
    @InjectRepository(Category)
    private readonly repo: Repository<Category>,
  ) {}

  get repository(): Repository<Category> {
    return this.repo;
  }

  async findAll(activeOnly = false): Promise<Category[]> {
    const where = activeOnly ? { isActive: true } : {};
    return this.repo.find({ where, order: { sortOrder: 'ASC', name: 'ASC' } });
  }

  async findById(id: string): Promise<Category | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findBySlug(slug: string): Promise<Category | null> {
    return this.repo.findOne({ where: { slug } });
  }

  async findByName(name: string): Promise<Category | null> {
    return this.repo.findOne({ where: { name } });
  }

  async save(cat: Category): Promise<Category> {
    return this.repo.save(cat);
  }

  async create(data: Partial<Category>): Promise<Category> {
    return this.repo.create(data);
  }

  async softDelete(id: string): Promise<void> {
    await this.repo.softDelete(id);
  }
}

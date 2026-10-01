import { Injectable } from '@nestjs/common';
import { DataSource, Repository, ILike } from 'typeorm';
import { Banner } from '../entities/banner.entity';
import { BannerQueryDto } from '../dto/banner.dto';

@Injectable()
export class BannersRepository extends Repository<Banner> {
  constructor(private readonly dataSource: DataSource) {
    super(Banner, dataSource.createEntityManager());
  }

  async findActiveBanners(): Promise<Banner[]> {
    const now = new Date();
    const query = this.createQueryBuilder('banner')
      .where('banner.isActive = :isActive', { isActive: true })
      .andWhere('(banner.startDate IS NULL OR banner.startDate <= :now)', {
        now,
      })
      .andWhere('(banner.endDate IS NULL OR banner.endDate >= :now)', { now })
      .orderBy('banner.sortOrder', 'ASC')
      .addOrderBy('banner.createdAt', 'DESC');

    return query.getMany();
  }

  async findAllBanners(
    queryDto: BannerQueryDto,
  ): Promise<{ data: Banner[]; total: number }> {
    const { page = 1, limit = 20, isActiveOnly, search } = queryDto;
    const qb = this.createQueryBuilder('banner');

    if (isActiveOnly) {
      qb.andWhere('banner.isActive = true');
    }

    if (search) {
      qb.andWhere('banner.title ILIKE :search', { search: `%${search}%` });
    }

    qb.orderBy('banner.sortOrder', 'ASC')
      .addOrderBy('banner.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }
}

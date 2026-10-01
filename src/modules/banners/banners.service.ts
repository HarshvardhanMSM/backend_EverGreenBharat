import { Injectable, NotFoundException } from '@nestjs/common';
import { BannersRepository } from './repositories/banners.repository';
import {
  CreateBannerDto,
  UpdateBannerDto,
  BannerQueryDto,
} from './dto/banner.dto';
import { Banner } from './entities/banner.entity';

@Injectable()
export class BannersService {
  constructor(private readonly bannersRepository: BannersRepository) {}

  async getActiveBanners(): Promise<Banner[]> {
    return this.bannersRepository.findActiveBanners();
  }

  async findAll(query: BannerQueryDto) {
    return this.bannersRepository.findAllBanners(query);
  }

  async findOne(id: string): Promise<Banner> {
    const banner = await this.bannersRepository.findOne({ where: { id } });
    if (!banner) {
      throw new NotFoundException(`Banner with ID ${id} not found`);
    }
    return banner;
  }

  async create(dto: CreateBannerDto): Promise<Banner> {
    const banner = this.bannersRepository.create({
      ...dto,
      startDate: dto.startDate ? new Date(dto.startDate) : null,
      endDate: dto.endDate ? new Date(dto.endDate) : null,
    });
    return this.bannersRepository.save(banner);
  }

  async update(id: string, dto: UpdateBannerDto): Promise<Banner> {
    const banner = await this.findOne(id);
    if (dto.startDate !== undefined) {
      banner.startDate = dto.startDate ? new Date(dto.startDate) : null;
    }
    if (dto.endDate !== undefined) {
      banner.endDate = dto.endDate ? new Date(dto.endDate) : null;
    }
    Object.assign(banner, {
      ...dto,
      startDate: banner.startDate,
      endDate: banner.endDate,
    });
    return this.bannersRepository.save(banner);
  }

  async remove(id: string): Promise<void> {
    const banner = await this.findOne(id);
    await this.bannersRepository.remove(banner);
  }

  async recordClick(id: string): Promise<void> {
    await this.bannersRepository.increment({ id }, 'clickCount', 1);
  }

  async recordImpression(id: string): Promise<void> {
    await this.bannersRepository.increment({ id }, 'impressionCount', 1);
  }
}

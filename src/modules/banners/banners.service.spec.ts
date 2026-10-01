import { Test, TestingModule } from '@nestjs/testing';
import { BannersService } from './banners.service';
import { BannersRepository } from './repositories/banners.repository';
import { BannerTargetType } from './entities/banner.entity';

describe('BannersService', () => {
  let service: BannersService;
  let repo: jest.Mocked<BannersRepository>;

  beforeEach(async () => {
    const mockRepo = {
      findActiveBanners: jest.fn(),
      findAllBanners: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      increment: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BannersService,
        { provide: BannersRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<BannersService>(BannersService);
    repo = module.get(BannersRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return active banners', async () => {
    const fakeBanners = [
      {
        id: '1',
        title: 'Summer Event',
        imageUrl: 'https://cdn.com/1.jpg',
        targetType: BannerTargetType.EXTERNAL_LINK,
        sortOrder: 1,
        isActive: true,
      },
    ];
    repo.findActiveBanners.mockResolvedValue(fakeBanners as any);

    const result = await service.getActiveBanners();
    expect(result).toEqual(fakeBanners);
    expect(repo.findActiveBanners).toHaveBeenCalled();
  });

  it('should create a banner', async () => {
    const dto = {
      title: 'New Banner',
      imageUrl: 'https://cdn.com/2.jpg',
      targetType: BannerTargetType.CREATOR,
      targetValue: 'creator-123',
    };
    const created = { id: 'b-1', ...dto, sortOrder: 0, isActive: true };
    repo.create.mockReturnValue(created as any);
    repo.save.mockResolvedValue(created as any);

    const result = await service.create(dto);
    expect(result).toEqual(created);
    expect(repo.save).toHaveBeenCalled();
  });
});

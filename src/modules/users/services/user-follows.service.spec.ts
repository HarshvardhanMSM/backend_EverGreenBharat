import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { UserFollowsService } from './user-follows.service';
import { UserFollowsRepository } from '../repositories/user-follows.repository';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('UserFollowsService', () => {
  let service: UserFollowsService;
  let repo: jest.Mocked<UserFollowsRepository>;
  let dataSource: any;

  beforeEach(async () => {
    const mockRepo = {
      isFollowing: jest.fn(),
      findFollowing: jest.fn(),
      findFollowers: jest.fn(),
      findOne: jest.fn(),
    };

    const mockCreatorRepo = {
      findOne: jest.fn(),
    };

    const mockDataSource = {
      getRepository: jest.fn().mockImplementation((entity) => {
        return mockCreatorRepo;
      }),
      transaction: jest.fn().mockImplementation(async (cb) => {
        return cb({
          create: jest.fn().mockReturnValue({}),
          save: jest.fn(),
          increment: jest.fn(),
          remove: jest.fn(),
          decrement: jest.fn(),
        });
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserFollowsService,
        { provide: UserFollowsRepository, useValue: mockRepo },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<UserFollowsService>(UserFollowsService);
    repo = module.get(UserFollowsRepository);
    dataSource = module.get(DataSource);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw NotFoundException if target creator does not exist', async () => {
    const creatorRepo = dataSource.getRepository();
    creatorRepo.findOne.mockResolvedValue(null);

    await expect(
      service.followCreator('user-1', 'invalid-creator'),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw BadRequestException if user tries to follow self', async () => {
    const creatorRepo = dataSource.getRepository();
    creatorRepo.findOne.mockResolvedValue({
      id: 'c-1',
      userId: 'user-1',
      totalFollowers: 5,
    });

    await expect(service.followCreator('user-1', 'c-1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should follow creator and increment followers count', async () => {
    const creatorRepo = dataSource.getRepository();
    creatorRepo.findOne.mockImplementation(async ({ where }: any) => {
      return { id: 'c-1', userId: 'creator-user-99', totalFollowers: 10 };
    });

    repo.findOne.mockResolvedValue(null);

    const result = await service.followCreator('follower-1', 'c-1');
    expect(result.isFollowing).toBe(true);
  });
});

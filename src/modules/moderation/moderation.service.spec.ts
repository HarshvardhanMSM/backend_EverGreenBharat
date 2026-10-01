import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ModerationService } from './moderation.service';
import { ModerationEvent } from './entities/moderation-event.entity';
import { ModerationAction } from '../../common/enums/moderation-action.enum';

describe('ModerationService', () => {
  let service: ModerationService;
  let eventRepo: any;

  beforeEach(async () => {
    eventRepo = {
      create: jest.fn().mockImplementation((data) => ({ id: 'ev-1', ...data })),
      save: jest
        .fn()
        .mockImplementation((entity) =>
          Promise.resolve({ id: 'ev-1', ...entity }),
        ),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModerationService,
        { provide: getRepositoryToken(ModerationEvent), useValue: eventRepo },
      ],
    }).compile();

    service = module.get<ModerationService>(ModerationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('record', () => {
    it('creates and saves a moderation event', async () => {
      const event = await service.record({
        userId: 'user-123',
        action: ModerationAction.BAN,
        reason: 'Abuse',
        adminId: 'admin-1',
      });

      expect(eventRepo.create).toHaveBeenCalledWith({
        userId: 'user-123',
        adminId: 'admin-1',
        action: ModerationAction.BAN,
        reason: 'Abuse',
      });
      expect(eventRepo.save).toHaveBeenCalled();
      expect(event.action).toBe(ModerationAction.BAN);
    });

    it('defaults adminId and reason to null when omitted', async () => {
      await service.record({
        userId: 'user-123',
        action: ModerationAction.DEACTIVATE,
      });

      expect(eventRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ adminId: null, reason: null }),
      );
    });
  });

  describe('listByUser', () => {
    it('returns paginated events with admin identity resolved', async () => {
      eventRepo.findAndCount.mockResolvedValue([
        [
          {
            id: 'ev-1',
            action: ModerationAction.WARN,
            reason: 'Spam',
            adminId: 'admin-1',
            createdAt: new Date(),
            admin: { user: { username: 'boss', email: 'boss@example.com' } },
          },
        ],
        1,
      ]);

      const result = await service.listByUser('user-123', 1, 20);

      expect(result.data).toEqual([
        expect.objectContaining({
          action: ModerationAction.WARN,
          adminName: 'boss',
          adminEmail: 'boss@example.com',
        }),
      ]);
      expect(result.pagination.total).toBe(1);
      expect(eventRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-123' },
          order: { createdAt: 'DESC' },
        }),
      );
    });

    it('maps system events with null admin identity', async () => {
      eventRepo.findAndCount.mockResolvedValue([
        [{ id: 'ev-2', action: ModerationAction.DEACTIVATE, adminId: null }],
        1,
      ]);

      const result = await service.listByUser('user-123');

      expect(result.data[0].adminName).toBeNull();
      expect(result.data[0].adminEmail).toBeNull();
    });
  });
});

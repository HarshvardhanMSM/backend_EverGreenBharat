import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ModerationEvent } from './entities/moderation-event.entity';
import { ModerationAction } from '../../common/enums/moderation-action.enum';

export interface RecordModerationEventParams {
  userId: string;
  action: ModerationAction;
  reason?: string | null;
  adminId?: string | null;
}

@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name);

  constructor(
    @InjectRepository(ModerationEvent)
    private readonly moderationEventRepository: Repository<ModerationEvent>,
  ) {}

  async record(params: RecordModerationEventParams): Promise<ModerationEvent> {
    const event = this.moderationEventRepository.create({
      userId: params.userId,
      adminId: params.adminId ?? null,
      action: params.action,
      reason: params.reason ?? null,
    });
    const saved = await this.moderationEventRepository.save(event);
    this.logger.log(
      `Moderation event ${saved.action} recorded for user ${saved.userId} by admin ${saved.adminId ?? 'system'}`,
    );
    return saved;
  }

  async listByUser(userId: string, page = 1, limit = 20) {
    const [events, total] = await this.moderationEventRepository.findAndCount({
      where: { userId },
      relations: { admin: { user: true } },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const data = events.map((event) => ({
      id: event.id,
      action: event.action,
      reason: event.reason,
      adminId: event.adminId,
      adminName: event.admin?.user?.username ?? null,
      adminEmail: event.admin?.user?.email ?? null,
      createdAt: event.createdAt,
    }));

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

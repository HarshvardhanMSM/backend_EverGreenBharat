import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('refresh_tokens')
export class RefreshToken extends BaseEntity {
  @Index('IDX_refresh_tokens_userId')
  @Column({ type: 'uuid', name: 'user_id', nullable: true })
  userId: string | null;

  @Index('IDX_refresh_tokens_familyId')
  @Column({ type: 'uuid' })
  familyId: string;

  @Index('IDX_refresh_tokens_hash')
  @Column({ type: 'varchar', length: 255, unique: true })
  tokenHash: string;

  @Column({ type: 'text', nullable: true })
  deviceInfo: string | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @Index('IDX_refresh_tokens_revoked')
  @Column({ type: 'boolean', default: false })
  isRevoked: boolean;

  @Index('IDX_refresh_tokens_expiresAt')
  @Column({ type: 'timestamp' })
  expiresAt: Date;
}

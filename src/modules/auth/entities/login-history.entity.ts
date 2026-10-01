import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

export enum LoginStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

@Entity('login_history')
export class LoginHistory extends BaseEntity {
  @Index('IDX_login_history_user_id')
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @Index('IDX_login_history_admin_id')
  @Column({ name: 'admin_id', type: 'uuid', nullable: true })
  adminId: string | null;

  @Index('IDX_login_history_email')
  @Column({ type: 'varchar', length: 150 })
  email: string;

  @Index('IDX_login_history_status')
  @Column({ type: 'enum', enum: LoginStatus })
  status: LoginStatus;

  @Column({ name: 'failure_reason', type: 'varchar', length: 255, nullable: true })
  failureReason: string | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 45 })
  ipAddress: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  browser: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  device: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  os: string | null;
}

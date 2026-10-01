import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('audit_logs')
export class AuditLog extends BaseEntity {
  @Index('IDX_audit_adminId')
  @Column({ type: 'uuid', nullable: true })
  adminId: string | null;

  @Index('IDX_audit_action')
  @Column({ type: 'varchar', length: 100 })
  action: string;

  @Index('IDX_audit_resource')
  @Column({ type: 'varchar', length: 100 })
  resource: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  resourceId: string | null;

  @Column({ type: 'varchar', length: 10 })
  httpMethod: string;

  @Column({ type: 'jsonb', nullable: true })
  beforeValue: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  afterValue: Record<string, any> | null;

  @Column({ type: 'varchar', length: 45 })
  ipAddress: string;

  @Column({ type: 'text', nullable: true })
  userAgent: string | null;

  @Index('IDX_audit_correlationId')
  @Column({ type: 'varchar', length: 100, nullable: true })
  correlationId: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  requestId: string | null;
}

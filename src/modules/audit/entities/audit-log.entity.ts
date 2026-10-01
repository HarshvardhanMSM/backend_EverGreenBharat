import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('audit_logs')
export class AuditLog extends BaseEntity {
  @Index('IDX_audit_adminId')
  @Column({ name: 'admin_id', type: 'uuid', nullable: true })
  adminId: string | null;

  @Index('IDX_audit_action')
  @Column({ type: 'varchar', length: 100 })
  action: string;

  @Index('IDX_audit_resource')
  @Column({ type: 'varchar', length: 100 })
  resource: string;

  @Column({ name: 'resource_id', type: 'varchar', length: 100, nullable: true })
  resourceId: string | null;

  @Column({ name: 'http_method', type: 'varchar', length: 10 })
  httpMethod: string;

  @Column({ name: 'before_value', type: 'jsonb', nullable: true })
  beforeValue: Record<string, any> | null;

  @Column({ name: 'after_value', type: 'jsonb', nullable: true })
  afterValue: Record<string, any> | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 45 })
  ipAddress: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string | null;

  @Index('IDX_audit_correlationId')
  @Column({ name: 'correlation_id', type: 'varchar', length: 100, nullable: true })
  correlationId: string | null;

  @Column({ name: 'request_id', type: 'varchar', length: 100, nullable: true })
  requestId: string | null;
}

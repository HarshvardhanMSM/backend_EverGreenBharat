import { Entity, Column, OneToMany, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { AdminRoleEntity } from '../../rbac/entities/admin-role.entity';

export enum AdminStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  INACTIVE = 'INACTIVE',
}

@Entity('admins')
export class Admin extends BaseEntity {
  @Index('IDX_admins_email')
  @Column({ type: 'varchar', length: 150, unique: true, nullable: true })
  email: string;

  @Index('IDX_admins_username')
  @Column({ type: 'varchar', length: 50, unique: true, nullable: true })
  username: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  password: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  displayName: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  avatarUrl: string | null;

  @Column({ type: 'boolean', default: false })
  isSuperAdmin: boolean;

  @Column({ type: 'varchar', length: 100, nullable: true })
  department: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({
    type: 'enum',
    enum: AdminStatus,
    default: AdminStatus.ACTIVE,
  })
  status: AdminStatus;

  @Column({ type: 'int', default: 0 })
  failedLoginAttempts: number;

  @Column({ type: 'timestamp', nullable: true })
  lockoutUntil: Date | null;

  @Column({ type: 'uuid', nullable: true })
  createdById: string | null;

  @Column({ type: 'uuid', nullable: true })
  updatedById: string | null;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt: Date | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  lastLoginIp: string | null;

  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @OneToMany(() => AdminRoleEntity, (adminRole) => adminRole.admin)
  adminRoles: AdminRoleEntity[];

  // Compatibility getter so existing frontend or serializers expecting admin.user continue to work seamlessly
  get user(): any {
    return {
      id: this.id,
      email: this.email,
      username: this.username,
      displayName: this.displayName,
      avatarUrl: this.avatarUrl,
      phone: this.phone,
    };
  }

  set user(val: any) {
    if (val) {
      if (val.email && !this.email) this.email = val.email;
      if (val.username && !this.username) this.username = val.username;
      if (val.displayName && !this.displayName) this.displayName = val.displayName;
      if (val.avatarUrl && !this.avatarUrl) this.avatarUrl = val.avatarUrl;
      if (val.phone && !this.phone) this.phone = val.phone;
    }
  }
}

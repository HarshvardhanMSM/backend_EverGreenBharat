import {
  Entity,
  PrimaryColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Admin } from '../../admin/entities/admin.entity';
import { Role } from './role.entity';

@Entity('admin_roles')
export class AdminRoleEntity {
  @PrimaryColumn({ type: 'uuid', name: 'admin_id' })
  adminId: string;

  @PrimaryColumn({ type: 'uuid', name: 'role_id' })
  roleId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Admin, (admin) => admin.adminRoles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'admin_id' })
  admin: Admin;

  @ManyToOne(() => Role, (role) => role.adminRoles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  role: Role;
}

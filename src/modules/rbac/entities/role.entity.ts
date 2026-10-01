import { Entity, Column, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { RolePermission } from './role-permission.entity';
import { AdminRoleEntity } from './admin-role.entity';

@Entity('roles')
export class Role extends BaseEntity {
  @Index('IDX_roles_code')
  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'boolean', default: false })
  isSystem: boolean;

  @OneToMany(() => RolePermission, (rp) => rp.role)
  rolePermissions: RolePermission[];

  @OneToMany(() => AdminRoleEntity, (ar) => ar.role)
  adminRoles: AdminRoleEntity[];
}

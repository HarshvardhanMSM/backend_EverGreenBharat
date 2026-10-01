import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Like } from 'typeorm';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { RolePermission } from './entities/role-permission.entity';
import { AdminRoleEntity } from './entities/admin-role.entity';

@Injectable()
export class RbacService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepository: Repository<RolePermission>,
    @InjectRepository(AdminRoleEntity)
    private readonly adminRoleRepository: Repository<AdminRoleEntity>,
  ) {}

  async getAdminPermissions(
    adminId: string,
  ): Promise<{ roles: string[]; permissions: string[] }> {
    const adminRoles = await this.adminRoleRepository.find({
      where: { adminId },
      relations: {
        role: {
          rolePermissions: {
            permission: true,
          },
        },
      },
    });

    const rolesSet = new Set<string>();
    const permissionsSet = new Set<string>();

    for (const ar of adminRoles) {
      if (ar.role) {
        rolesSet.add(ar.role.code);
        if (ar.role.rolePermissions) {
          for (const rp of ar.role.rolePermissions) {
            if (rp.permission) {
              permissionsSet.add(rp.permission.key);
            }
          }
        }
      }
    }

    return {
      roles: Array.from(rolesSet),
      permissions: Array.from(permissionsSet),
    };
  }

  async findAllRoles(): Promise<Role[]> {
    return this.roleRepository.find({
      relations: {
        rolePermissions: {
          permission: true,
        },
        adminRoles: true,
      },
      order: { isSystem: 'DESC', name: 'ASC' },
    });
  }

  async findRoleById(id: string): Promise<Role> {
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: {
        rolePermissions: {
          permission: true,
        },
        adminRoles: {
          admin: {
            user: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID '${id}' not found`);
    }

    return role;
  }

  async createRole(dto: {
    code: string;
    name: string;
    description?: string;
    permissionKeys?: string[];
  }): Promise<Role> {
    const roleCode = dto.code.trim().toUpperCase().replace(/\s+/g, '_');
    const existing = await this.roleRepository.findOne({
      where: { code: roleCode },
    });
    if (existing) {
      throw new BadRequestException(
        `Role with code '${roleCode}' already exists`,
      );
    }

    const newRole = this.roleRepository.create({
      code: roleCode,
      name: dto.name,
      description: dto.description || null,
      isSystem: false,
    });

    const savedRole = await this.roleRepository.save(newRole);

    if (dto.permissionKeys && dto.permissionKeys.length > 0) {
      await this.setRolePermissions(savedRole.id, dto.permissionKeys);
    }

    return this.findRoleById(savedRole.id);
  }

  async editRole(
    id: string,
    dto: { name?: string; description?: string; permissionKeys?: string[] },
  ): Promise<Role> {
    const role = await this.findRoleById(id);

    if (dto.name && role.code !== 'SUPER_ADMIN') role.name = dto.name;
    if (dto.description !== undefined) role.description = dto.description;

    await this.roleRepository.save(role);

    if (dto.permissionKeys !== undefined) {
      await this.setRolePermissions(role.id, dto.permissionKeys);
    }

    return this.findRoleById(role.id);
  }

  async deleteRole(id: string): Promise<{ success: boolean; message: string }> {
    const role = await this.findRoleById(id);

    if (role.code === 'SUPER_ADMIN') {
      throw new ForbiddenException(
        `Super Administrator core role cannot be deleted`,
      );
    }

    const assignedAdminsCount = await this.adminRoleRepository.count({
      where: { roleId: id },
    });

    if (assignedAdminsCount > 0) {
      throw new BadRequestException(
        `Cannot delete role '${role.name}' because it is assigned to ${assignedAdminsCount} admin account(s). Please unassign those admins first.`,
      );
    }

    await this.rolePermissionRepository.delete({ roleId: id });
    await this.roleRepository.delete(id);

    return {
      success: true,
      message: `Role '${role.name}' deleted successfully`,
    };
  }

  async cloneRole(
    sourceRoleId: string,
    dto: { code: string; name: string; description?: string },
  ): Promise<Role> {
    const sourceRole = await this.findRoleById(sourceRoleId);
    const permissionKeys =
      sourceRole.rolePermissions
        ?.map((rp) => rp.permission?.key)
        .filter((k): k is string => Boolean(k)) || [];

    return this.createRole({
      code: dto.code,
      name: dto.name,
      description: dto.description || `Cloned from ${sourceRole.name}`,
      permissionKeys,
    });
  }

  async setRolePermissions(
    roleId: string,
    permissionKeys: string[],
  ): Promise<Role> {
    await this.rolePermissionRepository.delete({ roleId });

    if (permissionKeys.length > 0) {
      const perms = await this.permissionRepository.find({
        where: { key: In(permissionKeys) },
      });

      for (const p of perms) {
        const rp = this.rolePermissionRepository.create({
          roleId,
          permissionId: p.id,
        });
        await this.rolePermissionRepository.save(rp);
      }
    }

    return this.findRoleById(roleId);
  }

  async assignRoleToAdmin(
    adminId: string,
    roleCode: string,
  ): Promise<AdminRoleEntity> {
    const role = await this.roleRepository.findOne({
      where: { code: roleCode },
    });
    if (!role) {
      throw new NotFoundException(`Role with code '${roleCode}' not found`);
    }

    let adminRole = await this.adminRoleRepository.findOne({
      where: { adminId, roleId: role.id },
    });

    if (!adminRole) {
      adminRole = this.adminRoleRepository.create({
        adminId,
        roleId: role.id,
      });
      await this.adminRoleRepository.save(adminRole);
    }

    return adminRole;
  }

  // Permission Management Methods
  async findAllPermissions(moduleFilter?: string, search?: string) {
    const qb = this.permissionRepository.createQueryBuilder('permission');

    if (moduleFilter) {
      qb.andWhere('permission.module = :module', { module: moduleFilter });
    }

    if (search) {
      qb.andWhere(
        '(permission.key ILIKE :search OR permission.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    qb.orderBy('permission.module', 'ASC').addOrderBy('permission.key', 'ASC');

    const permissions = await qb.getMany();

    // Group permissions by module
    const grouped = permissions.reduce(
      (acc, perm) => {
        if (!acc[perm.module]) {
          acc[perm.module] = [];
        }
        acc[perm.module].push(perm);
        return acc;
      },
      {} as Record<string, Permission[]>,
    );

    return {
      success: true,
      data: permissions,
      grouped,
    };
  }

  async findPermissionById(id: string) {
    const permission = await this.permissionRepository.findOne({
      where: { id },
      relations: {
        rolePermissions: {
          role: true,
        },
      },
    });

    if (!permission) {
      throw new NotFoundException(`Permission with ID '${id}' not found`);
    }

    const roleIds = permission.rolePermissions?.map((rp) => rp.roleId) || [];
    let assignedAdminCount = 0;
    if (roleIds.length > 0) {
      assignedAdminCount = await this.adminRoleRepository.count({
        where: { roleId: In(roleIds) },
      });
    }

    return {
      success: true,
      data: {
        ...permission,
        assignedRoleCount: permission.rolePermissions?.length || 0,
        assignedAdminCount,
      },
    };
  }

  async getPermissionUsageStats() {
    const permissions = await this.permissionRepository.find();
    const rolePermissions = await this.rolePermissionRepository.find();
    const adminRoles = await this.adminRoleRepository.find();

    const rolePermMap = new Map<string, Set<string>>(); // permId -> Set(roleId)
    for (const rp of rolePermissions) {
      if (!rolePermMap.has(rp.permissionId)) {
        rolePermMap.set(rp.permissionId, new Set());
      }
      rolePermMap.get(rp.permissionId)!.add(rp.roleId);
    }

    const roleAdminMap = new Map<string, Set<string>>(); // roleId -> Set(adminId)
    for (const ar of adminRoles) {
      if (!roleAdminMap.has(ar.roleId)) {
        roleAdminMap.set(ar.roleId, new Set());
      }
      roleAdminMap.get(ar.roleId)!.add(ar.adminId);
    }

    const stats = permissions.map((p) => {
      const roleSet = rolePermMap.get(p.id) || new Set();
      const adminSet = new Set<string>();
      for (const roleId of roleSet) {
        const admins = roleAdminMap.get(roleId);
        if (admins) {
          admins.forEach((aId) => adminSet.add(aId));
        }
      }

      return {
        id: p.id,
        key: p.key,
        module: p.module,
        description: p.description,
        roleCount: roleSet.size,
        adminCount: adminSet.size,
      };
    });

    return stats;
  }
}

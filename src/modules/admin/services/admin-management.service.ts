import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Admin, AdminStatus } from '../entities/admin.entity';
import { User } from '../../users/entities/user.entity';
import { Role } from '../../rbac/entities/role.entity';
import { AdminRoleEntity } from '../../rbac/entities/admin-role.entity';
import { RefreshToken } from '../../auth/entities/refresh-token.entity';
import { LoginHistory } from '../../auth/entities/login-history.entity';
import { CreateAdminDto } from '../dto/create-admin.dto';
import { UpdateAdminDto } from '../dto/update-admin.dto';
import { AdminQueryDto } from '../dto/admin-query.dto';
import { HashUtil } from '../../../common/utils/hash.util';
import { AdminRole } from '../../../common/enums/admin-role.enum';

@Injectable()
export class AdminManagementService implements OnModuleInit {
  private readonly logger = new Logger(AdminManagementService.name);

  constructor(
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(AdminRoleEntity)
    private readonly adminRoleRepository: Repository<AdminRoleEntity>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(LoginHistory)
    private readonly loginHistoryRepository: Repository<LoginHistory>,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit() {
    try {
      // 0. Clean up any orphaned refresh tokens with null user_id
      await this.dataSource.query(`DELETE FROM "refresh_tokens" WHERE "user_id" IS NULL;`).catch(() => {});

      // 1. Check if any admin exists with null email but valid userId (sync legacy data)
      const adminsWithoutEmail = await this.adminRepository.find({
        where: [{ email: undefined as any }, { email: null as any }],
      });

      for (const admin of adminsWithoutEmail) {
        if (admin.userId) {
          const linkedUser = await this.userRepository.findOne({
            where: { id: admin.userId },
          });
          if (linkedUser) {
            admin.email = linkedUser.email.toLowerCase();
            admin.username = linkedUser.username;
            admin.password = linkedUser.password;
            admin.displayName = linkedUser.displayName || linkedUser.username;
            admin.avatarUrl = linkedUser.avatarUrl || null;
            admin.phone = linkedUser.phone || null;
            await this.adminRepository.save(admin);
            this.logger.log(`Migrated admin ${admin.email} from users table to independent admins table.`);
          }
        }
      }

      // 2. Check if a super admin exists in admins table, if not seed default
      const count = await this.adminRepository.count();
      if (count === 0) {
        const hashedPassword = await HashUtil.hashPassword('Admin@12345');
        const superAdmin = this.adminRepository.create({
          email: 'admin@stream.com',
          username: 'admin',
          password: hashedPassword,
          displayName: 'Super Administrator',
          isSuperAdmin: true,
          department: 'Executive Management',
          status: AdminStatus.ACTIVE,
        });
        const saved = await this.adminRepository.save(superAdmin);

        // Assign SUPER_ADMIN role if exists
        const superRole = await this.roleRepository.findOne({
          where: { code: AdminRole.SUPER_ADMIN },
        });
        if (superRole) {
          const ar = this.adminRoleRepository.create({
            adminId: saved.id,
            roleId: superRole.id,
          });
          await this.adminRoleRepository.save(ar);
        }

        this.logger.log(`Initialized default Super Admin in independent admins table.`);
      }

      // 3. Remove admin accounts from the users table so users table only has real app users
      const allAdmins = await this.adminRepository.find();
      for (const a of allAdmins) {
        if (a.email) {
          const userInUsersTable = await this.userRepository.findOne({
            where: { email: a.email.toLowerCase() },
          });
          if (userInUsersTable) {
            await this.userRepository.delete(userInUsersTable.id);
            this.logger.log(`Cleaned up staff account ${a.email} from customer users table.`);
          }
        }
      }
    } catch (e: any) {
      this.logger.warn(`Admin migration/initialization notice: ${e.message}`);
    }
  }

  async createAdmin(
    dto: CreateAdminDto,
    creatorAdminId?: string,
  ): Promise<Admin> {
    const existingEmail = await this.adminRepository.findOne({
      where: { email: dto.email.toLowerCase() },
    });
    if (existingEmail) {
      throw new BadRequestException(
        `Staff email '${dto.email}' is already registered`,
      );
    }

    const existingUsername = await this.adminRepository.findOne({
      where: { username: dto.username },
    });
    if (existingUsername) {
      throw new BadRequestException(
        `Staff username '${dto.username}' is already taken`,
      );
    }

    const hashedPassword = await HashUtil.hashPassword(dto.password);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const admin = queryRunner.manager.create(Admin, {
        email: dto.email.toLowerCase(),
        username: dto.username,
        password: hashedPassword,
        displayName: dto.displayName || dto.username,
        phone: (dto as any).phone || null,
        avatarUrl: dto.avatarUrl || null,
        isSuperAdmin: dto.isSuperAdmin || false,
        department: dto.department || null,
        notes: dto.notes || null,
        status: AdminStatus.ACTIVE,
        createdById: creatorAdminId || null,
      });
      const savedAdmin = await queryRunner.manager.save(Admin, admin);

      if (dto.roleCodes && dto.roleCodes.length > 0) {
        const roles = await queryRunner.manager.find(Role, {
          where: { code: In(dto.roleCodes) },
        });

        for (const role of roles) {
          const adminRole = queryRunner.manager.create(AdminRoleEntity, {
            adminId: savedAdmin.id,
            roleId: role.id,
          });
          await queryRunner.manager.save(AdminRoleEntity, adminRole);
        }
      }

      await queryRunner.commitTransaction();
      return this.findAdminById(savedAdmin.id);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async findAllAdmins(queryDto: AdminQueryDto) {
    const page = queryDto.page || 1;
    const limit = queryDto.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.adminRepository
      .createQueryBuilder('admin')
      .leftJoinAndSelect('admin.adminRoles', 'adminRoles')
      .leftJoinAndSelect('adminRoles.role', 'role')
      .withDeleted();

    if (queryDto.status) {
      qb.andWhere('admin.status = :status', { status: queryDto.status });
    }

    if (queryDto.department) {
      qb.andWhere('admin.department ILIKE :department', {
        department: `%${queryDto.department}%`,
      });
    }

    if (queryDto.roleCode) {
      qb.andWhere('role.code = :roleCode', { roleCode: queryDto.roleCode });
    }

    if (queryDto.search) {
      qb.andWhere(
        '(admin.email ILIKE :search OR admin.username ILIKE :search OR admin.displayName ILIKE :search)',
        { search: `%${queryDto.search}%` },
      );
    }

    qb.orderBy('admin.createdAt', 'DESC');
    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    // Map compatibility user object for each admin item
    const formattedData = data.map((admin) => ({
      ...admin,
      user: {
        id: admin.id,
        email: admin.email,
        username: admin.username,
        displayName: admin.displayName,
        avatarUrl: admin.avatarUrl,
        phone: admin.phone,
      },
    }));

    return {
      success: true,
      message: 'Staff members retrieved successfully',
      data: formattedData,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async findAdminById(id: string): Promise<Admin> {
    const admin = await this.adminRepository.findOne({
      where: { id },
      relations: {
        adminRoles: {
          role: {
            rolePermissions: {
              permission: true,
            },
          },
        },
      },
      withDeleted: true,
    });

    if (!admin) {
      throw new NotFoundException(`Staff member with ID '${id}' not found`);
    }

    (admin as any).user = {
      id: admin.id,
      email: admin.email,
      username: admin.username,
      displayName: admin.displayName,
      avatarUrl: admin.avatarUrl,
      phone: admin.phone,
    };

    return admin;
  }

  async updateAdmin(
    id: string,
    dto: UpdateAdminDto,
    updaterAdminId?: string,
  ): Promise<Admin> {
    const admin = await this.findAdminById(id);

    if (dto.displayName !== undefined) admin.displayName = dto.displayName;
    if (dto.avatarUrl !== undefined) admin.avatarUrl = dto.avatarUrl;
    if ((dto as any).phone !== undefined) admin.phone = (dto as any).phone;
    if (dto.department !== undefined) admin.department = dto.department;
    if (dto.notes !== undefined) admin.notes = dto.notes;
    if (dto.status !== undefined) {
      if (admin.isSuperAdmin && dto.status !== AdminStatus.ACTIVE) {
        await this.ensureNotLastSuperAdmin(admin.id);
      }
      admin.status = dto.status;
    }
    if (updaterAdminId) admin.updatedById = updaterAdminId;

    await this.adminRepository.save(admin);
    return this.findAdminById(id);
  }

  async suspendAdmin(
    id: string,
    reason: string,
    updaterAdminId?: string,
  ): Promise<Admin> {
    const admin = await this.findAdminById(id);
    if (admin.isSuperAdmin) {
      await this.ensureNotLastSuperAdmin(id);
    }

    admin.status = AdminStatus.SUSPENDED;
    admin.notes = admin.notes
      ? `${admin.notes}\n[Suspended]: ${reason}`
      : `[Suspended]: ${reason}`;
    if (updaterAdminId) admin.updatedById = updaterAdminId;

    await this.adminRepository.save(admin);
    await this.forceLogout(id);
    return this.findAdminById(id);
  }

  async activateAdmin(id: string, updaterAdminId?: string): Promise<Admin> {
    const admin = await this.findAdminById(id);
    admin.status = AdminStatus.ACTIVE;
    if (updaterAdminId) admin.updatedById = updaterAdminId;

    await this.adminRepository.save(admin);
    return this.findAdminById(id);
  }

  async softDeleteAdmin(id: string, operatorAdminId?: string): Promise<void> {
    const admin = await this.findAdminById(id);
    if (admin.isSuperAdmin) {
      await this.ensureNotLastSuperAdmin(id);
    }

    await this.forceLogout(id);
    admin.status = AdminStatus.INACTIVE;
    admin.updatedById = operatorAdminId || null;
    await this.adminRepository.save(admin);

    await this.adminRepository.softDelete(id);
  }

  async restoreAdmin(id: string, operatorAdminId?: string): Promise<Admin> {
    const admin = await this.adminRepository.findOne({
      where: { id },
      withDeleted: true,
    });

    if (!admin) {
      throw new NotFoundException(`Staff member with ID '${id}' not found`);
    }

    await this.adminRepository.restore(id);

    admin.status = AdminStatus.ACTIVE;
    admin.updatedById = operatorAdminId || null;
    await this.adminRepository.save(admin);

    return this.findAdminById(id);
  }

  async resetPassword(
    id: string,
    newPassword: string,
  ): Promise<{ success: boolean; message: string }> {
    const admin = await this.findAdminById(id);
    const hashedPassword = await HashUtil.hashPassword(newPassword);

    admin.password = hashedPassword;
    admin.failedLoginAttempts = 0;
    admin.lockoutUntil = null;
    await this.adminRepository.save(admin);

    await this.forceLogout(id);

    return {
      success: true,
      message: `Password reset successfully for staff '${admin.email}'`,
    };
  }

  async forceLogout(
    id: string,
  ): Promise<{ success: boolean; message: string }> {
    const admin = await this.findAdminById(id);
    await this.refreshTokenRepository.update(
      { userId: admin.id },
      { isRevoked: true },
    );
    if (admin.userId) {
      await this.refreshTokenRepository.update(
        { userId: admin.userId },
        { isRevoked: true },
      );
    }

    return {
      success: true,
      message: `All active sessions revoked for staff '${admin.username}'`,
    };
  }

  async assignRoles(id: string, roleCodes: string[]): Promise<Admin> {
    const admin = await this.findAdminById(id);
    const roles = await this.roleRepository.find({
      where: { code: In(roleCodes) },
    });

    if (roles.length !== roleCodes.length) {
      throw new BadRequestException('One or more role codes are invalid');
    }

    await this.adminRoleRepository.delete({ adminId: id });

    for (const role of roles) {
      const ar = this.adminRoleRepository.create({
        adminId: id,
        roleId: role.id,
      });
      await this.adminRoleRepository.save(ar);
    }

    return this.findAdminById(id);
  }

  async removeRole(id: string, roleId: string): Promise<Admin> {
    const admin = await this.findAdminById(id);
    const adminRole = await this.adminRoleRepository.findOne({
      where: { adminId: id, roleId },
      relations: { role: true },
    });

    if (!adminRole) {
      throw new NotFoundException(`Role assignment not found for staff member`);
    }

    if (admin.isSuperAdmin && adminRole.role?.code === AdminRole.SUPER_ADMIN) {
      await this.ensureNotLastSuperAdmin(id);
    }

    await this.adminRoleRepository.delete({ adminId: id, roleId });
    return this.findAdminById(id);
  }

  async getAdminSessions(id: string) {
    const admin = await this.findAdminById(id);
    const userIds = [admin.id];
    if (admin.userId) userIds.push(admin.userId);

    const tokens = await this.refreshTokenRepository.find({
      where: { userId: In(userIds), isRevoked: false },
      order: { createdAt: 'DESC' },
    });

    return tokens.map((t) => ({
      id: t.id,
      ipAddress: t.ipAddress,
      userAgent: t.deviceInfo || 'Web Browser',
      createdAt: t.createdAt,
      expiresAt: t.expiresAt,
    }));
  }

  async revokeSession(id: string, sessionId: string): Promise<void> {
    const admin = await this.findAdminById(id);
    const session = await this.refreshTokenRepository.findOne({
      where: { id: sessionId },
    });

    if (!session || (session.userId !== admin.id && session.userId !== admin.userId)) {
      throw new NotFoundException('Session not found for this staff member');
    }

    session.isRevoked = true;
    await this.refreshTokenRepository.save(session);
  }

  async getAdminLoginHistory(id: string, page = 1, limit = 20) {
    await this.findAdminById(id);
    const skip = (page - 1) * limit;

    const [data, total] = await this.loginHistoryRepository.findAndCount({
      where: { adminId: id },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

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

  private async ensureNotLastSuperAdmin(excludeAdminId: string): Promise<void> {
    const superAdminRole = await this.roleRepository.findOne({
      where: { code: AdminRole.SUPER_ADMIN },
    });

    if (!superAdminRole) return;

    const activeSuperAdmins = await this.adminRoleRepository
      .createQueryBuilder('ar')
      .innerJoin('ar.admin', 'admin')
      .where('ar.roleId = :roleId', { roleId: superAdminRole.id })
      .andWhere('admin.status = :status', { status: AdminStatus.ACTIVE })
      .andWhere('admin.id != :excludeAdminId', { excludeAdminId })
      .andWhere('admin.deletedAt IS NULL')
      .getCount();

    if (activeSuperAdmins === 0) {
      throw new ForbiddenException(
        'Action rejected: System must have at least one active Super Administrator',
      );
    }
  }
}

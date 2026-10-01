import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { RolePermission } from './entities/role-permission.entity';
import { AdminRoleEntity } from './entities/admin-role.entity';
import { User } from '../users/entities/user.entity';
import { Admin, AdminStatus } from '../admin/entities/admin.entity';
import { PermissionKeys } from '../../common/enums/permission-keys.enum';
import { AdminRole } from '../../common/enums/admin-role.enum';
import { UserStatus } from '../../common/enums/user-status.enum';
import { VerificationStatus } from '../../common/enums/verification-status.enum';
import { HashUtil } from '../../common/utils/hash.util';

@Injectable()
export class PermissionSeeder implements OnModuleInit {
  private readonly logger = new Logger(PermissionSeeder.name);

  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepository: Repository<RolePermission>,
    @InjectRepository(AdminRoleEntity)
    private readonly adminRoleRepository: Repository<AdminRoleEntity>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
  ) {}

  async onModuleInit() {
    try {
      await this.seedPermissionsAndRoles();
      await this.seedDefaultSuperAdmin();
    } catch (err: any) {
      this.logger.warn(
        `Seeder deferred (table not initialized yet): ${err?.message || err}`,
      );
    }
  }

  private async seedPermissionsAndRoles() {
    this.logger.log('Seeding initial permissions and roles...');

    // 1. Seed Permissions (idempotent: upsert by key)
    const permissionDefinitions = [
      // Admin Management
      {
        key: PermissionKeys.ADMIN_READ,
        module: 'admin',
        description: 'View admin accounts and details',
      },
      {
        key: PermissionKeys.ADMIN_CREATE,
        module: 'admin',
        description: 'Create new admin accounts',
      },
      {
        key: PermissionKeys.ADMIN_UPDATE,
        module: 'admin',
        description: 'Update admin account details',
      },
      {
        key: PermissionKeys.ADMIN_DELETE,
        module: 'admin',
        description: 'Soft delete admin accounts',
      },
      {
        key: PermissionKeys.ADMIN_SUSPEND,
        module: 'admin',
        description: 'Suspend admin accounts',
      },
      {
        key: PermissionKeys.ADMIN_ACTIVATE,
        module: 'admin',
        description: 'Activate admin accounts',
      },
      {
        key: PermissionKeys.ADMIN_RESTORE,
        module: 'admin',
        description: 'Restore soft-deleted admin accounts',
      },
      {
        key: PermissionKeys.ADMIN_RESET_PASSWORD,
        module: 'admin',
        description: 'Reset admin account passwords',
      },
      {
        key: PermissionKeys.ADMIN_FORCE_LOGOUT,
        module: 'admin',
        description: 'Force logout admin accounts',
      },
      {
        key: PermissionKeys.ADMIN_ASSIGN_ROLES,
        module: 'admin',
        description: 'Assign roles to admin accounts',
      },
      // Role Management
      {
        key: PermissionKeys.ROLES_READ,
        module: 'roles',
        description: 'View system and custom roles',
      },
      {
        key: PermissionKeys.ROLES_CREATE,
        module: 'roles',
        description: 'Create new custom roles',
      },
      {
        key: PermissionKeys.ROLES_UPDATE,
        module: 'roles',
        description: 'Update custom role details',
      },
      {
        key: PermissionKeys.ROLES_DELETE,
        module: 'roles',
        description: 'Delete custom roles',
      },
      {
        key: PermissionKeys.ROLES_CLONE,
        module: 'roles',
        description: 'Clone existing roles',
      },
      {
        key: PermissionKeys.ROLES_ASSIGN_PERMISSIONS,
        module: 'roles',
        description: 'Assign permissions to roles',
      },
      // Permission Management
      {
        key: PermissionKeys.PERMISSIONS_READ,
        module: 'permissions',
        description: 'View available permissions',
      },
      // Users
      {
        key: PermissionKeys.USERS_READ,
        module: 'users',
        description: 'View user list and details',
      },
      {
        key: PermissionKeys.USERS_WRITE,
        module: 'users',
        description: 'Modify user details',
      },
      {
        key: PermissionKeys.USERS_BAN,
        module: 'users',
        description: 'Ban or suspend user accounts',
      },
      // Streams
      {
        key: PermissionKeys.STREAMS_READ,
        module: 'streams',
        description: 'View stream list and metrics',
      },
      {
        key: PermissionKeys.STREAMS_TERMINATE,
        module: 'streams',
        description: 'Force terminate live streams',
      },
      {
        key: PermissionKeys.STREAMS_MODERATE,
        module: 'streams',
        description: 'Moderate stream chat',
      },
      // Finance
      {
        key: PermissionKeys.FINANCE_READ,
        module: 'finance',
        description: 'View financial reports and transactions',
      },
      {
        key: PermissionKeys.WITHDRAWALS_APPROVE,
        module: 'finance',
        description: 'Approve creator withdrawal requests',
      },
      {
        key: PermissionKeys.WITHDRAWALS_REJECT,
        module: 'finance',
        description: 'Reject creator withdrawal requests',
      },
      // System
      {
        key: PermissionKeys.SETTINGS_WRITE,
        module: 'system',
        description: 'Modify global application settings',
      },
      // Audit
      {
        key: PermissionKeys.AUDIT_READ,
        module: 'audit',
        description: 'View administrative audit logs',
      },
      {
        key: PermissionKeys.AUDIT_EXPORT,
        module: 'audit',
        description: 'Export audit logs as CSV',
      },
      // Login History
      {
        key: PermissionKeys.LOGIN_HISTORY_READ,
        module: 'login_history',
        description: 'View login history logs',
      },
      {
        key: PermissionKeys.LOGIN_HISTORY_EXPORT,
        module: 'login_history',
        description: 'Export login history logs',
      },
      // Sessions
      {
        key: PermissionKeys.SESSIONS_READ,
        module: 'sessions',
        description: 'View active sessions',
      },
      {
        key: PermissionKeys.SESSIONS_REVOKE,
        module: 'sessions',
        description: 'Revoke active user/admin sessions',
      },
      // Phase 2: Creators
      {
        key: PermissionKeys.CREATORS_READ,
        module: 'creators',
        description: 'View creator list and channel details',
      },
      {
        key: PermissionKeys.CREATORS_WRITE,
        module: 'creators',
        description: 'Edit creator channel details',
      },
      {
        key: PermissionKeys.CREATORS_REVIEW,
        module: 'creators',
        description: 'Pick up and review creator applications',
      },
      {
        key: PermissionKeys.CREATORS_APPROVE,
        module: 'creators',
        description: 'Approve creator applications',
      },
      {
        key: PermissionKeys.CREATORS_REJECT,
        module: 'creators',
        description: 'Reject creator applications',
      },
      {
        key: PermissionKeys.CREATORS_VERIFY,
        module: 'creators',
        description: 'Mark creator identity as verified',
      },
      {
        key: PermissionKeys.CREATORS_SUSPEND,
        module: 'creators',
        description: 'Suspend creator channels',
      },
      {
        key: PermissionKeys.CREATORS_UNSUSPEND,
        module: 'creators',
        description: 'Reactivate suspended creator channels',
      },
      {
        key: PermissionKeys.CREATORS_BAN,
        module: 'creators',
        description: 'Permanently ban creator channels',
      },
      {
        key: PermissionKeys.CREATORS_MANAGE_NOTES,
        module: 'creators',
        description: 'Create and delete internal creator notes',
      },
      {
        key: PermissionKeys.CREATORS_EXPORT,
        module: 'creators',
        description: 'Export creator list as CSV',
      },
      // Phase 2: Categories
      {
        key: PermissionKeys.CATEGORIES_READ,
        module: 'categories',
        description: 'View category list',
      },
      {
        key: PermissionKeys.CATEGORIES_CREATE,
        module: 'categories',
        description: 'Create new categories',
      },
      {
        key: PermissionKeys.CATEGORIES_UPDATE,
        module: 'categories',
        description: 'Update category details',
      },
      {
        key: PermissionKeys.CATEGORIES_DELETE,
        module: 'categories',
        description: 'Soft delete categories',
      },
      // Phase 3: Financial Foundation
      {
        key: PermissionKeys.WALLETS_READ,
        module: 'financial',
        description: 'View user wallet details and balances',
      },
      {
        key: PermissionKeys.WALLETS_FREEZE,
        module: 'financial',
        description: 'Apply or release wallet freezes',
      },
      {
        key: PermissionKeys.WALLETS_ADJUST,
        module: 'financial',
        description: 'Perform manual balance adjustments',
      },
      {
        key: PermissionKeys.TRANSACTIONS_READ,
        module: 'financial',
        description: 'View transaction history and details',
      },
      {
        key: PermissionKeys.TRANSACTIONS_EXPORT,
        module: 'financial',
        description: 'Export transaction reports to CSV',
      },
      {
        key: PermissionKeys.COIN_PACKAGES_READ,
        module: 'financial',
        description: 'View coin package catalog',
      },
      {
        key: PermissionKeys.COIN_PACKAGES_CREATE,
        module: 'financial',
        description: 'Create new coin packages',
      },
      {
        key: PermissionKeys.COIN_PACKAGES_UPDATE,
        module: 'financial',
        description: 'Edit coin packages and pricing',
      },
      {
        key: PermissionKeys.COIN_PACKAGES_DELETE,
        module: 'financial',
        description: 'Toggle or delete coin packages',
      },
      {
        key: PermissionKeys.PROMOTIONS_MANAGE,
        module: 'financial',
        description: 'Create and manage promo codes and coupons',
      },
      {
        key: PermissionKeys.FINANCE_REPORTS,
        module: 'financial',
        description: 'Access financial revenue dashboard and statistics',
      },
      {
        key: PermissionKeys.FINANCE_RECONCILE,
        module: 'financial',
        description: 'Trigger manual EOD ledger reconciliation',
      },
      {
        key: PermissionKeys.FINANCE_REFUND,
        module: 'financial',
        description: 'Authorize coin refunds and chargeback processing',
      },
      {
        key: PermissionKeys.FINANCE_SETTINGS,
        module: 'financial',
        description: 'Modify global financial settings and commission splits',
      },
    ];

    const savedPermissions = new Map<string, Permission>();

    for (const def of permissionDefinitions) {
      let perm = await this.permissionRepository.findOne({
        where: { key: def.key },
      });
      if (!perm) {
        perm = this.permissionRepository.create({
          key: def.key,
          module: def.module,
          description: def.description,
        });
        perm = await this.permissionRepository.save(perm);
      }
      savedPermissions.set(def.key, perm);
    }

    // 2. Seed System Roles
    const rolesData = [
      {
        code: AdminRole.SUPER_ADMIN,
        name: 'Super Administrator',
        description: 'Full administrative access across all modules',
        isSystem: true,
        permissionKeys: Object.values(PermissionKeys),
      },
      {
        code: AdminRole.ADMIN,
        name: 'Administrator',
        description: 'Full management access excluding RBAC configuration',
        isSystem: true,
        permissionKeys: [
          PermissionKeys.USERS_READ,
          PermissionKeys.USERS_WRITE,
          PermissionKeys.USERS_BAN,
          PermissionKeys.CREATORS_READ,
          PermissionKeys.CREATORS_WRITE,
          PermissionKeys.CREATORS_REVIEW,
          PermissionKeys.CREATORS_APPROVE,
          PermissionKeys.CREATORS_REJECT,
          PermissionKeys.CREATORS_VERIFY,
          PermissionKeys.CREATORS_SUSPEND,
          PermissionKeys.CREATORS_UNSUSPEND,
          PermissionKeys.CREATORS_BAN,
          PermissionKeys.CREATORS_MANAGE_NOTES,
          PermissionKeys.CREATORS_EXPORT,
          PermissionKeys.CATEGORIES_READ,
          PermissionKeys.CATEGORIES_CREATE,
          PermissionKeys.CATEGORIES_UPDATE,
          PermissionKeys.CATEGORIES_DELETE,
          PermissionKeys.STREAMS_READ,
          PermissionKeys.STREAMS_TERMINATE,
          PermissionKeys.STREAMS_MODERATE,
          PermissionKeys.FINANCE_READ,
          PermissionKeys.WITHDRAWALS_APPROVE,
          PermissionKeys.WITHDRAWALS_REJECT,
          PermissionKeys.AUDIT_READ,
          PermissionKeys.AUDIT_EXPORT,
          PermissionKeys.LOGIN_HISTORY_READ,
          PermissionKeys.SESSIONS_READ,
          PermissionKeys.SESSIONS_REVOKE,
        ],
      },
      {
        code: AdminRole.CREATOR_MANAGER,
        name: 'Creator Manager',
        description: 'Reviews and manages creator applications and channels',
        isSystem: true,
        permissionKeys: [
          PermissionKeys.USERS_READ,
          PermissionKeys.CREATORS_READ,
          PermissionKeys.CREATORS_WRITE,
          PermissionKeys.CREATORS_REVIEW,
          PermissionKeys.CREATORS_APPROVE,
          PermissionKeys.CREATORS_REJECT,
          PermissionKeys.CREATORS_VERIFY,
          PermissionKeys.CREATORS_SUSPEND,
          PermissionKeys.CREATORS_UNSUSPEND,
          PermissionKeys.CREATORS_MANAGE_NOTES,
          PermissionKeys.CREATORS_EXPORT,
          PermissionKeys.CATEGORIES_READ,
          PermissionKeys.CATEGORIES_CREATE,
          PermissionKeys.CATEGORIES_UPDATE,
          PermissionKeys.CATEGORIES_DELETE,
          PermissionKeys.AUDIT_READ,
        ],
      },
      {
        code: AdminRole.MODERATOR,
        name: 'Content Moderator',
        description:
          'Moderates user activity, streams, creator channels, and reports',
        isSystem: true,
        permissionKeys: [
          PermissionKeys.USERS_READ,
          PermissionKeys.USERS_BAN,
          PermissionKeys.CREATORS_READ,
          PermissionKeys.CREATORS_SUSPEND,
          PermissionKeys.STREAMS_READ,
          PermissionKeys.STREAMS_TERMINATE,
          PermissionKeys.STREAMS_MODERATE,
          PermissionKeys.AUDIT_READ,
        ],
      },
      {
        code: AdminRole.FINANCE_MANAGER,
        name: 'Finance Manager',
        description:
          'Manages creator payouts, withdrawals, wallets, and financial audits',
        isSystem: true,
        permissionKeys: [
          PermissionKeys.USERS_READ,
          PermissionKeys.CREATORS_READ,
          PermissionKeys.FINANCE_READ,
          PermissionKeys.WITHDRAWALS_APPROVE,
          PermissionKeys.WITHDRAWALS_REJECT,
          PermissionKeys.WALLETS_READ,
          PermissionKeys.WALLETS_FREEZE,
          PermissionKeys.WALLETS_ADJUST,
          PermissionKeys.TRANSACTIONS_READ,
          PermissionKeys.TRANSACTIONS_EXPORT,
          PermissionKeys.COIN_PACKAGES_READ,
          PermissionKeys.COIN_PACKAGES_CREATE,
          PermissionKeys.COIN_PACKAGES_UPDATE,
          PermissionKeys.COIN_PACKAGES_DELETE,
          PermissionKeys.PROMOTIONS_MANAGE,
          PermissionKeys.FINANCE_REPORTS,
          PermissionKeys.FINANCE_RECONCILE,
          PermissionKeys.FINANCE_REFUND,
          PermissionKeys.FINANCE_SETTINGS,
          PermissionKeys.AUDIT_READ,
          PermissionKeys.AUDIT_EXPORT,
        ],
      },
      {
        code: AdminRole.SUPPORT_AGENT,
        name: 'Support Agent',
        description: 'Read-only access for customer support desk',
        isSystem: true,
        permissionKeys: [
          PermissionKeys.USERS_READ,
          PermissionKeys.CREATORS_READ,
          PermissionKeys.STREAMS_READ,
          PermissionKeys.LOGIN_HISTORY_READ,
          PermissionKeys.SESSIONS_READ,
        ],
      },
      {
        code: AdminRole.AUDITOR,
        name: 'Auditor',
        description:
          'Read-only access to audit logs and login history for compliance review',
        isSystem: true,
        permissionKeys: [
          PermissionKeys.AUDIT_READ,
          PermissionKeys.AUDIT_EXPORT,
          PermissionKeys.LOGIN_HISTORY_READ,
          PermissionKeys.LOGIN_HISTORY_EXPORT,
          PermissionKeys.SESSIONS_READ,
        ],
      },
    ];

    for (const rData of rolesData) {
      // Idempotent: create role if not present, never overwrite name/description once set
      let role = await this.roleRepository.findOne({
        where: { code: rData.code },
      });
      if (!role) {
        role = this.roleRepository.create({
          code: rData.code,
          name: rData.name,
          description: rData.description,
          isSystem: rData.isSystem,
        });
        role = await this.roleRepository.save(role);
      }

      // Add any new permission mappings that don't exist yet (never delete existing ones)
      for (const pKey of rData.permissionKeys) {
        const perm = savedPermissions.get(pKey);
        if (perm) {
          const existingMapping = await this.rolePermissionRepository.findOne({
            where: { roleId: role.id, permissionId: perm.id },
          });
          if (!existingMapping) {
            const rp = this.rolePermissionRepository.create({
              roleId: role.id,
              permissionId: perm.id,
            });
            await this.rolePermissionRepository.save(rp);
          }
        }
      }
    }

    this.logger.log('Permissions and system roles successfully seeded');
  }

  /**
   * Batch 2 Fix: Seed the default Super Admin account.
   *
   * Rules (idempotent):
   * 1. If the user does NOT exist → create with hashed password.
   * 2. If the user ALREADY exists → do NOT reset password; only ensure Active + unlocked.
   * 3. If the admin row does NOT exist → create.
   * 4. If the admin row ALREADY exists → only ensure isSuperAdmin=true and status=ACTIVE.
   * 5. Never modify passwords for existing accounts.
   * 6. Never modify existing admin accounts created by other admins.
   */
  private async seedDefaultSuperAdmin() {
    const adminEmail = 'admin@stream.com';

    let admin = await this.adminRepository.findOne({
      where: { email: adminEmail },
    });

    if (!admin) {
      this.logger.log(`Seeding default Super Admin account (${adminEmail})...`);
      const hashedPassword = await HashUtil.hashPassword('Admin@123456');
      admin = this.adminRepository.create({
        email: adminEmail,
        username: 'admin',
        password: hashedPassword,
        displayName: 'Super Admin',
        isSuperAdmin: true,
        department: 'Executive Management',
        status: AdminStatus.ACTIVE,
      });
      admin = await this.adminRepository.save(admin);
    } else {
      let changed = false;
      if (!admin.isSuperAdmin) {
        admin.isSuperAdmin = true;
        changed = true;
      }
      if (admin.status !== AdminStatus.ACTIVE) {
        admin.status = AdminStatus.ACTIVE;
        changed = true;
      }
      if (admin.lockoutUntil !== null) {
        admin.lockoutUntil = null;
        changed = true;
      }
      if (admin.failedLoginAttempts !== 0) {
        admin.failedLoginAttempts = 0;
        changed = true;
      }
      if (changed) {
        admin = await this.adminRepository.save(admin);
      }
    }

    // Link Super Admin Role (idempotent)
    const superAdminRole = await this.roleRepository.findOne({
      where: { code: AdminRole.SUPER_ADMIN },
    });

    if (superAdminRole) {
      const adminRoleLink = await this.adminRoleRepository.findOne({
        where: { adminId: admin.id, roleId: superAdminRole.id },
      });
      if (!adminRoleLink) {
        const newLink = this.adminRoleRepository.create({
          adminId: admin.id,
          roleId: superAdminRole.id,
        });
        await this.adminRoleRepository.save(newLink);
      }
    }

    this.logger.log(`Super Admin account verified and active: ${adminEmail}`);
  }
}

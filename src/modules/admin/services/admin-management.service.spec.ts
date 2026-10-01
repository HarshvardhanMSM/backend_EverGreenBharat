import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AdminManagementService } from './admin-management.service';
import { Admin, AdminStatus } from '../entities/admin.entity';
import { User } from '../../users/entities/user.entity';
import { Role } from '../../rbac/entities/role.entity';
import { AdminRoleEntity } from '../../rbac/entities/admin-role.entity';
import { RefreshToken } from '../../auth/entities/refresh-token.entity';
import { LoginHistory } from '../../auth/entities/login-history.entity';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('AdminManagementService', () => {
  let service: AdminManagementService;
  let adminRepo: any;
  let userRepo: any;
  let roleRepo: any;
  let adminRoleRepo: any;
  let refreshTokenRepo: any;
  let loginHistoryRepo: any;

  const mockAdmin = {
    id: 'admin-123',
    userId: 'user-123',
    isSuperAdmin: true,
    status: AdminStatus.ACTIVE,
    department: 'Engineering',
    notes: 'Test note',
    user: {
      id: 'user-123',
      email: 'admin@stream.com',
      username: 'admin',
      displayName: 'Super Admin',
    },
    adminRoles: [],
  };

  beforeEach(async () => {
    adminRepo = {
      findOne: jest.fn().mockResolvedValue(mockAdmin),
      findAndCount: jest.fn().mockResolvedValue([[mockAdmin], 1]),
      count: jest.fn().mockResolvedValue(2),
      create: jest.fn().mockImplementation((dto) => ({ id: 'new-id', ...dto })),
      save: jest
        .fn()
        .mockImplementation((entity) =>
          Promise.resolve({ id: 'saved-id', ...entity }),
        ),
      softDelete: jest.fn().mockResolvedValue({ affected: 1 }),
      restore: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn().mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        withDeleted: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockAdmin], 1]),
      }),
    };

    userRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockImplementation((e) => Promise.resolve(e)),
      softDelete: jest.fn().mockResolvedValue({ affected: 1 }),
      restore: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    roleRepo = {
      find: jest.fn().mockResolvedValue([{ id: 'role-1', code: 'MODERATOR' }]),
      findOne: jest.fn().mockResolvedValue({ id: 'role-1', code: 'MODERATOR' }),
    };

    adminRoleRepo = {
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      save: jest
        .fn()
        .mockResolvedValue({ adminId: 'admin-123', roleId: 'role-1' }),
      create: jest.fn().mockImplementation((dto) => dto),
      findOne: jest
        .fn()
        .mockResolvedValue({ adminId: 'admin-123', roleId: 'role-1' }),
    };

    refreshTokenRepo = {
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      find: jest.fn().mockResolvedValue([]),
    };

    loginHistoryRepo = {
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminManagementService,
        { provide: getRepositoryToken(Admin), useValue: adminRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Role), useValue: roleRepo },
        {
          provide: getRepositoryToken(AdminRoleEntity),
          useValue: adminRoleRepo,
        },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: refreshTokenRepo,
        },
        {
          provide: getRepositoryToken(LoginHistory),
          useValue: loginHistoryRepo,
        },
        { provide: DataSource, useValue: {} },
      ],
    }).compile();

    service = module.get<AdminManagementService>(AdminManagementService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should find admin by ID', async () => {
    const res = await service.findAdminById('admin-123');
    expect(res).toBeDefined();
    expect(res.id).toBe('admin-123');
  });

  it('should throw NotFoundException if admin not found', async () => {
    adminRepo.findOne.mockResolvedValueOnce(null);
    await expect(service.findAdminById('invalid-id')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should suspend admin and force logout', async () => {
    const res = await service.suspendAdmin('admin-123', 'Security breach');
    expect(adminRepo.save).toHaveBeenCalled();
    expect(refreshTokenRepo.update).toHaveBeenCalled();
    expect(res).toBeDefined();
  });

  it('should prevent suspending the last remaining Super Admin', async () => {
    adminRepo.count.mockResolvedValueOnce(1); // Only 1 active super admin
    await expect(service.suspendAdmin('admin-123', 'Reason')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should force logout admin', async () => {
    const res = await service.forceLogout('admin-123');
    expect(res.success).toBe(true);
    expect(refreshTokenRepo.update).toHaveBeenCalled();
  });
});

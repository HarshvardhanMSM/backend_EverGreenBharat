import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RbacService } from './rbac.service';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { RolePermission } from './entities/role-permission.entity';
import { AdminRoleEntity } from './entities/admin-role.entity';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';

describe('RbacService', () => {
  let service: RbacService;
  let roleRepo: any;
  let permRepo: any;
  let rolePermRepo: any;
  let adminRoleRepo: any;

  const mockSystemRole = {
    id: 'role-sys-1',
    code: 'SUPER_ADMIN',
    name: 'Super Admin',
    isSystem: true,
    rolePermissions: [],
  };

  const mockCustomRole = {
    id: 'role-cust-1',
    code: 'CUSTOM_MOD',
    name: 'Custom Moderator',
    isSystem: false,
    rolePermissions: [],
  };

  beforeEach(async () => {
    roleRepo = {
      find: jest.fn().mockResolvedValue([mockSystemRole, mockCustomRole]),
      findOne: jest.fn().mockImplementation((options) => {
        if (options?.where?.code === 'CLONED_MOD') {
          return Promise.resolve(null);
        }
        return Promise.resolve(mockCustomRole);
      }),
      create: jest
        .fn()
        .mockImplementation((dto) => ({ id: 'new-role-id', ...dto })),
      save: jest.fn().mockImplementation((r) => Promise.resolve(r)),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    permRepo = {
      find: jest
        .fn()
        .mockResolvedValue([
          { id: 'perm-1', key: 'users:read', module: 'users' },
        ]),
      findOne: jest.fn().mockResolvedValue({ id: 'perm-1', key: 'users:read' }),
      createQueryBuilder: jest.fn().mockReturnValue({
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest
          .fn()
          .mockResolvedValue([
            { id: 'perm-1', key: 'users:read', module: 'users' },
          ]),
      }),
    };

    rolePermRepo = {
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest
        .fn()
        .mockResolvedValue({ roleId: 'role-1', permissionId: 'perm-1' }),
      find: jest.fn().mockResolvedValue([]),
    };

    adminRoleRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockResolvedValue({ adminId: 'a1', roleId: 'r1' }),
      count: jest.fn().mockResolvedValue(0),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RbacService,
        { provide: getRepositoryToken(Role), useValue: roleRepo },
        { provide: getRepositoryToken(Permission), useValue: permRepo },
        { provide: getRepositoryToken(RolePermission), useValue: rolePermRepo },
        {
          provide: getRepositoryToken(AdminRoleEntity),
          useValue: adminRoleRepo,
        },
      ],
    }).compile();

    service = module.get<RbacService>(RbacService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should prevent editing system roles', async () => {
    roleRepo.findOne.mockResolvedValueOnce(mockSystemRole);
    await expect(
      service.editRole('role-sys-1', { name: 'New Name' }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should prevent deleting system roles', async () => {
    roleRepo.findOne.mockResolvedValueOnce(mockSystemRole);
    await expect(service.deleteRole('role-sys-1')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should edit custom role successfully', async () => {
    const res = await service.editRole('role-cust-1', {
      name: 'Updated Custom Mod',
    });
    expect(res).toBeDefined();
    expect(roleRepo.save).toHaveBeenCalled();
  });

  it('should clone role successfully', async () => {
    const res = await service.cloneRole('role-cust-1', {
      code: 'CLONED_MOD',
      name: 'Cloned Mod',
    });
    expect(res).toBeDefined();
    expect(roleRepo.save).toHaveBeenCalled();
  });
});

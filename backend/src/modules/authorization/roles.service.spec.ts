import { Test, TestingModule } from '@nestjs/testing';
import { RolesService } from './roles.service';
import { AuthorizationService } from './authorization.service';
import { PrismaService } from '../../database/prisma.service';
import { ConflictException, ForbiddenException } from '@nestjs/common';

describe('RolesService', () => {
  let service: RolesService;
  let prisma: {
    role: { findMany: jest.Mock; findFirst: jest.Mock; create: jest.Mock; update: jest.Mock; delete: jest.Mock };
    permission: { findMany: jest.Mock };
    rolePermission: { deleteMany: jest.Mock; createMany: jest.Mock };
    membership: { create: jest.Mock; findFirst: jest.Mock; delete: jest.Mock };
    school: { findFirst: jest.Mock };
    campus: { findFirst: jest.Mock };
    $transaction: jest.Mock;
  };
  let authz: { invalidateByOrganization: jest.Mock; invalidate: jest.Mock };

  beforeEach(async () => {
    prisma = {
      role: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      permission: { findMany: jest.fn() },
      rolePermission: { deleteMany: jest.fn(), createMany: jest.fn() },
      membership: { create: jest.fn(), findFirst: jest.fn(), delete: jest.fn() },
      school: { findFirst: jest.fn() },
      campus: { findFirst: jest.fn() },
      $transaction: jest.fn((promises) => Promise.all(promises)),
    };

    authz = {
      invalidateByOrganization: jest.fn(),
      invalidate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuthorizationService, useValue: authz },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
  });

  it('should reject creating custom role if key already exists', async () => {
    prisma.role.findFirst.mockResolvedValue({ id: 'r-1', key: 'teacher' });

    await expect(
      service.createCustomRole('org-1', {
        name: 'Math Teacher',
        key: 'teacher',
        permissionKeys: ['student:read'],
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('should prevent modifying built-in system roles', async () => {
    prisma.role.findFirst.mockResolvedValue({ id: 'r-1', isSystem: true });

    await expect(
      service.updateCustomRole('org-1', 'r-1', { name: 'New Name' }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should prevent deleting built-in system roles', async () => {
    prisma.role.findFirst.mockResolvedValue({ id: 'r-1', isSystem: true, _count: { memberships: 0 } });

    await expect(
      service.deleteCustomRole('org-1', 'r-1'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should successfully create custom role and invalidate org cache', async () => {
    prisma.role.findFirst.mockResolvedValue(null);
    prisma.permission.findMany.mockResolvedValue([{ id: 'p-1', key: 'student:read' }]);
    prisma.role.create.mockResolvedValue({
      id: 'r-custom',
      key: 'curriculum_lead',
      name: 'Curriculum Lead',
      isSystem: false,
      rolePermissions: [{ permission: { key: 'student:read' } }],
    });

    const res = await service.createCustomRole('org-1', {
      name: 'Curriculum Lead',
      key: 'curriculum_lead',
      permissionKeys: ['student:read'],
    });

    expect(res.id).toBe('r-custom');
    expect(authz.invalidateByOrganization).toHaveBeenCalledWith('org-1');
  });
});

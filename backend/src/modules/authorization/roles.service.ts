import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuthorizationService } from './authorization.service';
import {
  AssignMembershipDto,
  CreateCustomRoleDto,
  UpdateCustomRoleDto,
} from './dto/role.dto';

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authz: AuthorizationService,
  ) {}

  async findAllRoles(organizationId: string) {
    const roles = await this.prisma.role.findMany({
      where: {
        OR: [{ organizationId: null }, { organizationId }],
      },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
      include: {
        rolePermissions: {
          select: {
            permission: {
              select: { key: true, description: true, category: true },
            },
          },
        },
        _count: { select: { memberships: true } },
      },
    });

    return roles.map((r) => ({
      id: r.id,
      key: r.key,
      name: r.name,
      description: r.description,
      isSystem: r.isSystem,
      organizationId: r.organizationId,
      userCount: r._count.memberships,
      permissions: r.rolePermissions.map((rp) => rp.permission.key),
    }));
  }

  async findAllPermissions() {
    return this.prisma.permission.findMany({
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });
  }

  async createCustomRole(organizationId: string, dto: CreateCustomRoleDto) {
    const normalizedKey = dto.key.toLowerCase().trim().replace(/[\s-]+/g, '_');

    // Check key collision within system or current organization
    const existing = await this.prisma.role.findFirst({
      where: {
        key: normalizedKey,
        OR: [{ organizationId: null }, { organizationId }],
      },
    });
    if (existing) {
      throw new ConflictException(
        `A role with key '${normalizedKey}' already exists in your organization or as a system default`,
      );
    }

    // Resolve permissions
    const permissions = await this.prisma.permission.findMany({
      where: { key: { in: dto.permissionKeys } },
      select: { id: true, key: true },
    });

    const role = await this.prisma.role.create({
      data: {
        organizationId,
        key: normalizedKey,
        name: dto.name,
        description: dto.description,
        isSystem: false,
        rolePermissions: {
          createMany: {
            data: permissions.map((p) => ({ permissionId: p.id })),
          },
        },
      },
      include: {
        rolePermissions: {
          select: { permission: { select: { key: true } } },
        },
      },
    });

    await this.authz.invalidateByOrganization(organizationId);

    return {
      id: role.id,
      key: role.key,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      permissions: role.rolePermissions.map((rp) => rp.permission.key),
    };
  }

  async updateCustomRole(organizationId: string, roleId: string, dto: UpdateCustomRoleDto) {
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, organizationId },
    });
    if (!role) {
      throw new NotFoundException('Role not found or you do not have permission to modify it');
    }
    if (role.isSystem) {
      throw new ForbiddenException('System-defined default roles cannot be altered');
    }

    if (dto.permissionKeys) {
      const permissions = await this.prisma.permission.findMany({
        where: { key: { in: dto.permissionKeys } },
        select: { id: true },
      });

      // Atomic replace of permissions
      await this.prisma.$transaction([
        this.prisma.rolePermission.deleteMany({ where: { roleId } }),
        this.prisma.rolePermission.createMany({
          data: permissions.map((p) => ({ roleId, permissionId: p.id })),
        }),
      ]);
    }

    const updated = await this.prisma.role.update({
      where: { id: roleId },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
      },
      include: {
        rolePermissions: {
          select: { permission: { select: { key: true } } },
        },
      },
    });

    await this.authz.invalidateByOrganization(organizationId);

    return {
      id: updated.id,
      key: updated.key,
      name: updated.name,
      description: updated.description,
      isSystem: updated.isSystem,
      permissions: updated.rolePermissions.map((rp) => rp.permission.key),
    };
  }

  async deleteCustomRole(organizationId: string, roleId: string) {
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, organizationId },
      include: { _count: { select: { memberships: true } } },
    });
    if (!role) {
      throw new NotFoundException('Custom role not found');
    }
    if (role.isSystem) {
      throw new ForbiddenException('Built-in system roles cannot be deleted');
    }
    if (role._count.memberships > 0) {
      throw new BadRequestException(
        `Cannot delete role because ${role._count.memberships} active user membership(s) are currently assigned to it`,
      );
    }

    await this.prisma.role.delete({ where: { id: roleId } });
    await this.authz.invalidateByOrganization(organizationId);

    return { success: true, id: roleId };
  }

  async assignMembership(organizationId: string, userId: string, dto: AssignMembershipDto) {
    // Validate role exists
    const role = await this.prisma.role.findFirst({
      where: {
        id: dto.roleId,
        OR: [{ organizationId: null }, { organizationId }],
      },
    });
    if (!role) {
      throw new NotFoundException('Role does not exist');
    }

    // Validate school if provided
    if (dto.schoolId) {
      const school = await this.prisma.school.findFirst({
        where: { id: dto.schoolId, organizationId, deletedAt: null },
      });
      if (!school) {
        throw new BadRequestException('Selected school does not belong to your organization');
      }
    }

    // Validate campus if provided
    if (dto.campusId) {
      const campus = await this.prisma.campus.findFirst({
        where: { id: dto.campusId, school: { organizationId }, deletedAt: null },
      });
      if (!campus) {
        throw new BadRequestException('Selected campus does not belong to your organization');
      }
    }

    const membership = await this.prisma.membership.create({
      data: {
        userId,
        organizationId,
        roleId: dto.roleId,
        schoolId: dto.schoolId,
        campusId: dto.campusId,
        status: 'ACTIVE',
      },
      include: {
        role: { select: { id: true, name: true, key: true } },
        school: { select: { id: true, name: true } },
        campus: { select: { id: true, name: true } },
      },
    });

    await this.authz.invalidate(userId);
    return membership;
  }

  async revokeMembership(organizationId: string, userId: string, membershipId: string) {
    const membership = await this.prisma.membership.findFirst({
      where: { id: membershipId, userId, organizationId },
    });
    if (!membership) {
      throw new NotFoundException('Membership assignment not found');
    }

    await this.prisma.membership.delete({ where: { id: membershipId } });
    await this.authz.invalidate(userId);

    return { success: true, id: membershipId };
  }
}

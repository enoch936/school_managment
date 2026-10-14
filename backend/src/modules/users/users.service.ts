import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { NotFoundException } from '../../common/exceptions/domain.exception';
import { paginate } from '../../common/pagination/pagination.dto';
import { UpdateUserDto, UserQueryDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(organizationId: string, query: UserQueryDto) {
    const where: Prisma.MembershipWhereInput = {
      organizationId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.roleKey ? { role: { key: query.roleKey } } : {}),
      ...(query.search
        ? {
            user: {
              OR: [
                { firstName: { contains: query.search, mode: 'insensitive' } },
                { lastName: { contains: query.search, mode: 'insensitive' } },
                { email: { contains: query.search, mode: 'insensitive' } },
              ],
            },
          }
        : {}),
    };

    const [memberships, total] = await this.prisma.$transaction([
      this.prisma.membership.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.take,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              middleName: true,
              lastName: true,
              phone: true,
              avatarUrl: true,
              isActive: true,
              emailVerifiedAt: true,
              lastLoginAt: true,
            },
          },
          role: { select: { id: true, key: true, name: true } },
          school: { select: { id: true, name: true } },
          campus: { select: { id: true, name: true } },
        },
      }),
      this.prisma.membership.count({ where }),
    ]);

    const members = memberships.map((m) => ({
      membershipId: m.id,
      status: m.status,
      role: m.role,
      school: m.school,
      campus: m.campus,
      ...m.user,
    }));

    return paginate(members, total, query.page, query.pageSize);
  }

  async get(organizationId: string, userId: string) {
    const membership = await this.prisma.membership.findFirst({
      where: { organizationId, userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            middleName: true,
            lastName: true,
            phone: true,
            avatarUrl: true,
            gender: true,
            isActive: true,
            emailVerifiedAt: true,
            lastLoginAt: true,
            createdAt: true,
          },
        },
        role: true,
      },
    });
    if (!membership) throw new NotFoundException('User', userId);
    return membership;
  }

  async updateProfile(userId: string, dto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: dto.firstName,
        middleName: dto.middleName,
        lastName: dto.lastName,
        phone: dto.phone,
        avatarUrl: dto.avatarUrl,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        middleName: true,
        lastName: true,
        phone: true,
        avatarUrl: true,
      },
    });
  }

  async setActive(organizationId: string, userId: string, isActive: boolean) {
    const membership = await this.prisma.membership.findFirst({
      where: { organizationId, userId },
      select: { id: true },
    });
    if (!membership) throw new NotFoundException('User', userId);
    await this.prisma.user.update({ where: { id: userId }, data: { isActive } });
    return { id: userId, isActive };
  }
}

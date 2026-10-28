import { Injectable, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { DomainException, NotFoundException } from '../../common/exceptions/domain.exception';
import { paginate } from '../../common/pagination/pagination.dto';
import { CreateGuardianDto, GuardianQueryDto, LinkStudentDto, UpdateGuardianDto } from './dto/guardian.dto';

@Injectable()
export class GuardiansService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertSchoolInOrganization(schoolId: string, organizationId: string) {
    const school = await this.prisma.school.findFirst({
      where: { id: schoolId, organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!school) {
      throw new DomainException(
        'INVALID_SCHOOL',
        'The selected school does not belong to your organization',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async getOrganizationSchoolIds(organizationId: string): Promise<string[]> {
    const schools = await this.prisma.school.findMany({
      where: { organizationId, deletedAt: null },
      select: { id: true },
    });
    return schools.map((s) => s.id);
  }

  async create(organizationId: string, dto: CreateGuardianDto) {
    await this.assertSchoolInOrganization(dto.schoolId, organizationId);

    return this.prisma.guardian.create({
      data: {
        schoolId: dto.schoolId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
        occupation: dto.occupation,
      },
    });
  }

  async findAll(organizationId: string, query: GuardianQueryDto) {
    const schoolIds = await this.getOrganizationSchoolIds(organizationId);
    const skip = (query.page - 1) * query.pageSize;
    const take = query.pageSize;

    const where: Prisma.GuardianWhereInput = {
      deletedAt: null,
      schoolId: query.schoolId ? query.schoolId : { in: schoolIds },
      ...(query.search
        ? {
            OR: [
              { firstName: { contains: query.search, mode: 'insensitive' } },
              { lastName: { contains: query.search, mode: 'insensitive' } },
              { phone: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const total = await this.prisma.guardian.count({ where });
    const data = await this.prisma.guardian.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        students: {
          include: {
            student: {
              select: {
                id: true,
                studentNumber: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    return paginate(data, total, query.page, query.pageSize);
  }

  async findOne(organizationId: string, id: string) {
    const schoolIds = await this.getOrganizationSchoolIds(organizationId);
    const guardian = await this.prisma.guardian.findFirst({
      where: {
        id,
        deletedAt: null,
        schoolId: { in: schoolIds },
      },
      include: {
        students: {
          include: {
            student: true,
          },
        },
      },
    });

    if (!guardian) {
      throw new NotFoundException('Guardian', id);
    }

    return guardian;
  }

  async update(organizationId: string, id: string, dto: UpdateGuardianDto) {
    await this.findOne(organizationId, id);

    return this.prisma.guardian.update({
      where: { id },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
        occupation: dto.occupation,
      },
    });
  }

  async linkStudent(organizationId: string, guardianId: string, dto: LinkStudentDto) {
    const guardian = await this.findOne(organizationId, guardianId);

    const student = await this.prisma.student.findFirst({
      where: {
        id: dto.studentId,
        schoolId: guardian.schoolId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!student) {
      throw new NotFoundException('Student', dto.studentId);
    }

    return this.prisma.studentGuardian.upsert({
      where: {
        studentId_guardianId: {
          studentId: dto.studentId,
          guardianId,
        },
      },
      update: {
        relation: dto.relation,
        isPrimary: dto.isPrimary ?? false,
        isLegalGuardian: dto.isLegalGuardian ?? true,
      },
      create: {
        studentId: dto.studentId,
        guardianId,
        relation: dto.relation,
        isPrimary: dto.isPrimary ?? false,
        isLegalGuardian: dto.isLegalGuardian ?? true,
      },
    });
  }

  async unlinkStudent(organizationId: string, guardianId: string, studentId: string) {
    await this.findOne(organizationId, guardianId);

    await this.prisma.studentGuardian.deleteMany({
      where: { guardianId, studentId },
    });

    return { success: true };
  }
}

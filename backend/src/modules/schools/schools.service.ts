import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { DomainException, NotFoundException } from '../../common/exceptions/domain.exception';
import { paginate } from '../../common/pagination/pagination.dto';
import {
  CreateCampusDto,
  CreateSchoolDto,
  SchoolQueryDto,
  UpdateCampusDto,
  UpdateSchoolDto,
} from './dto/school.dto';

@Injectable()
export class SchoolsService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Schools ---------------------------------------------------------------

  async createSchool(organizationId: string, dto: CreateSchoolDto) {
    const dup = await this.prisma.school.findFirst({
      where: { organizationId, code: dto.code },
      select: { id: true },
    });
    if (dup) {
      throw new DomainException(
        'DUPLICATE_SCHOOL_CODE',
        'A school with this code already exists',
        HttpStatus.CONFLICT,
      );
    }
    return this.prisma.school.create({ data: { ...dto, organizationId } });
  }

  async listSchools(organizationId: string, query: SchoolQueryDto) {
    const where: Prisma.SchoolWhereInput = {
      organizationId,
      deletedAt: null,
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.search
        ? { name: { contains: query.search, mode: 'insensitive' } }
        : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.school.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.take,
        include: { _count: { select: { campuses: true, students: true } } },
      }),
      this.prisma.school.count({ where }),
    ]);
    return paginate(data, total, query.page, query.pageSize);
  }

  async getSchool(organizationId: string, id: string) {
    const school = await this.prisma.school.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: { campuses: true },
    });
    if (!school) throw new NotFoundException('School', id);
    return school;
  }

  async updateSchool(organizationId: string, id: string, dto: UpdateSchoolDto) {
    await this.getSchool(organizationId, id);
    return this.prisma.school.update({ where: { id }, data: dto });
  }

  async deleteSchool(organizationId: string, id: string) {
    await this.getSchool(organizationId, id);
    await this.prisma.school.update({ where: { id }, data: { deletedAt: new Date() } });
    return { id };
  }

  // --- Campuses --------------------------------------------------------------

  private async assertSchool(organizationId: string, schoolId: string) {
    const school = await this.prisma.school.findFirst({
      where: { id: schoolId, organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!school) throw new DomainException('INVALID_SCHOOL', 'School not found in your organization');
    return school;
  }

  async createCampus(organizationId: string, dto: CreateCampusDto) {
    await this.assertSchool(organizationId, dto.schoolId);
    return this.prisma.campus.create({ data: dto });
  }

  async listCampuses(organizationId: string, schoolId: string) {
    await this.assertSchool(organizationId, schoolId);
    return this.prisma.campus.findMany({
      where: { schoolId, deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  async updateCampus(organizationId: string, id: string, dto: UpdateCampusDto) {
    const campus = await this.prisma.campus.findFirst({
      where: { id, school: { organizationId } },
      select: { id: true, schoolId: true },
    });
    if (!campus) throw new NotFoundException('Campus', id);
    if (dto.schoolId) await this.assertSchool(organizationId, dto.schoolId);
    return this.prisma.campus.update({ where: { id }, data: dto });
  }
}

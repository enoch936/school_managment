import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { DomainException, NotFoundException } from '../../common/exceptions/domain.exception';
import { paginate } from '../../common/pagination/pagination.dto';
import {
  AcademicsQueryDto,
  CreateAcademicYearDto,
  CreateClassDto,
  CreateSubjectDto,
  CreateTermDto,
  UpdateAcademicYearDto,
  UpdateClassDto,
  UpdateSubjectDto,
} from './dto/academics.dto';

@Injectable()
export class AcademicsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertSchool(organizationId: string, schoolId: string) {
    const school = await this.prisma.school.findFirst({
      where: { id: schoolId, organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!school) throw new DomainException('INVALID_SCHOOL', 'School not found in your organization');
    return school;
  }

  // --- Academic years --------------------------------------------------------

  async createYear(organizationId: string, dto: CreateAcademicYearDto) {
    await this.assertSchool(organizationId, dto.schoolId);
    return this.prisma.$transaction(async (tx) => {
      if (dto.isCurrent) {
        await tx.academicYear.updateMany({
          where: { schoolId: dto.schoolId, isCurrent: true },
          data: { isCurrent: false },
        });
      }
      return tx.academicYear.create({
        data: {
          schoolId: dto.schoolId,
          name: dto.name,
          startDate: new Date(dto.startDate),
          endDate: new Date(dto.endDate),
          isCurrent: dto.isCurrent ?? false,
        },
      });
    });
  }

  async listYears(organizationId: string, query: AcademicsQueryDto) {
    const where: Prisma.AcademicYearWhereInput = {
      school: { organizationId, ...(query.schoolId ? { id: query.schoolId } : {}) },
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.academicYear.findMany({
        where,
        orderBy: { startDate: 'desc' },
        skip: query.skip,
        take: query.take,
        include: { _count: { select: { terms: true, classes: true } } },
      }),
      this.prisma.academicYear.count({ where }),
    ]);
    return paginate(data, total, query.page, query.pageSize);
  }

  async updateYear(organizationId: string, id: string, dto: UpdateAcademicYearDto) {
    const year = await this.prisma.academicYear.findFirst({
      where: { id, school: { organizationId } },
      select: { id: true, schoolId: true },
    });
    if (!year) throw new NotFoundException('AcademicYear', id);
    return this.prisma.$transaction(async (tx) => {
      if (dto.isCurrent) {
        await tx.academicYear.updateMany({
          where: { schoolId: year.schoolId, isCurrent: true, id: { not: id } },
          data: { isCurrent: false },
        });
      }
      return tx.academicYear.update({
        where: { id },
        data: {
          name: dto.name,
          startDate: dto.startDate ? new Date(dto.startDate) : undefined,
          endDate: dto.endDate ? new Date(dto.endDate) : undefined,
          isCurrent: dto.isCurrent,
        },
      });
    });
  }

  // --- Terms -----------------------------------------------------------------

  async createTerm(organizationId: string, dto: CreateTermDto) {
    const year = await this.prisma.academicYear.findFirst({
      where: { id: dto.academicYearId, school: { organizationId } },
      select: { id: true },
    });
    if (!year) throw new DomainException('INVALID_ACADEMIC_YEAR', 'Academic year not found');
    return this.prisma.term.create({
      data: {
        academicYearId: dto.academicYearId,
        name: dto.name,
        sequence: dto.sequence,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
      },
    });
  }

  async listTerms(organizationId: string, academicYearId: string) {
    const year = await this.prisma.academicYear.findFirst({
      where: { id: academicYearId, school: { organizationId } },
      select: { id: true },
    });
    if (!year) throw new NotFoundException('AcademicYear', academicYearId);
    return this.prisma.term.findMany({
      where: { academicYearId },
      orderBy: { sequence: 'asc' },
    });
  }

  // --- Classes ---------------------------------------------------------------

  async createClass(organizationId: string, dto: CreateClassDto) {
    await this.assertSchool(organizationId, dto.schoolId);
    const year = await this.prisma.academicYear.findFirst({
      where: { id: dto.academicYearId, schoolId: dto.schoolId },
      select: { id: true },
    });
    if (!year) throw new DomainException('INVALID_ACADEMIC_YEAR', 'Academic year not found');
    return this.prisma.class.create({
      data: {
        schoolId: dto.schoolId,
        academicYearId: dto.academicYearId,
        campusId: dto.campusId,
        name: dto.name,
        capacity: dto.capacity ?? 40,
      },
    });
  }

  async listClasses(organizationId: string, query: AcademicsQueryDto) {
    const where: Prisma.ClassWhereInput = {
      deletedAt: null,
      school: { organizationId, ...(query.schoolId ? { id: query.schoolId } : {}) },
      ...(query.academicYearId ? { academicYearId: query.academicYearId } : {}),
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.class.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: query.skip,
        take: query.take,
        include: {
          academicYear: { select: { id: true, name: true } },
          _count: { select: { enrollments: true, sections: true } },
        },
      }),
      this.prisma.class.count({ where }),
    ]);
    return paginate(data, total, query.page, query.pageSize);
  }

  async updateClass(organizationId: string, id: string, dto: UpdateClassDto) {
    const cls = await this.prisma.class.findFirst({
      where: { id, school: { organizationId } },
      select: { id: true },
    });
    if (!cls) throw new NotFoundException('Class', id);
    return this.prisma.class.update({
      where: { id },
      data: { name: dto.name, capacity: dto.capacity, campusId: dto.campusId },
    });
  }

  // --- Subjects --------------------------------------------------------------

  async createSubject(organizationId: string, dto: CreateSubjectDto) {
    await this.assertSchool(organizationId, dto.schoolId);
    return this.prisma.subject.create({
      data: {
        schoolId: dto.schoolId,
        code: dto.code,
        name: dto.name,
        isCore: dto.isCore ?? true,
      },
    });
  }

  async listSubjects(organizationId: string, query: AcademicsQueryDto) {
    const where: Prisma.SubjectWhereInput = {
      deletedAt: null,
      school: { organizationId, ...(query.schoolId ? { id: query.schoolId } : {}) },
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { code: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.subject.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.subject.count({ where }),
    ]);
    return paginate(data, total, query.page, query.pageSize);
  }

  async updateSubject(organizationId: string, id: string, dto: UpdateSubjectDto) {
    const subject = await this.prisma.subject.findFirst({
      where: { id, school: { organizationId } },
      select: { id: true },
    });
    if (!subject) throw new NotFoundException('Subject', id);
    return this.prisma.subject.update({
      where: { id },
      data: { name: dto.name, code: dto.code, isCore: dto.isCore },
    });
  }
}

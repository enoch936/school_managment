import { Injectable, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { DomainException, NotFoundException } from '../../common/exceptions/domain.exception';
import { paginate } from '../../common/pagination/pagination.dto';
import {
  CreateDisciplineCaseDto,
  DisciplineQueryDto,
  UpdateDisciplineCaseDto,
  UpsertHealthRecordDto,
} from './dto/discipline-health.dto';

@Injectable()
export class DisciplineHealthService {
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

  async createDisciplineCase(
    organizationId: string,
    recordedById: string,
    dto: CreateDisciplineCaseDto,
  ) {
    await this.assertSchoolInOrganization(dto.schoolId, organizationId);

    const student = await this.prisma.student.findFirst({
      where: { id: dto.studentId, schoolId: dto.schoolId, deletedAt: null },
    });
    if (!student) {
      throw new NotFoundException('Student not found in this school');
    }

    return this.prisma.disciplineCase.create({
      data: {
        schoolId: dto.schoolId,
        studentId: dto.studentId,
        incidentDate: new Date(dto.incidentDate),
        category: dto.category,
        description: dto.description,
        actionTaken: dto.actionTaken,
        status: 'OPEN',
        recordedById,
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, studentNumber: true } },
      },
    });
  }

  async findAllDisciplineCases(organizationId: string, query: DisciplineQueryDto) {
    const schoolIds = await this.getOrganizationSchoolIds(organizationId);
    const skip = (query.page - 1) * query.pageSize;
    const take = query.pageSize;

    const where: Prisma.DisciplineCaseWhereInput = {
      schoolId: query.schoolId ? query.schoolId : { in: schoolIds },
      ...(query.studentId ? { studentId: query.studentId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { category: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.disciplineCase.findMany({
        where,
        skip,
        take,
        orderBy: { incidentDate: 'desc' },
        include: {
          student: { select: { id: true, firstName: true, lastName: true, studentNumber: true } },
        },
      }),
      this.prisma.disciplineCase.count({ where }),
    ]);

    return paginate(items, total, query.page, query.pageSize);
  }

  async updateDisciplineCase(
    organizationId: string,
    id: string,
    dto: UpdateDisciplineCaseDto,
  ) {
    const schoolIds = await this.getOrganizationSchoolIds(organizationId);
    const existing = await this.prisma.disciplineCase.findFirst({
      where: { id, schoolId: { in: schoolIds } },
    });
    if (!existing) {
      throw new NotFoundException('Discipline case not found');
    }

    return this.prisma.disciplineCase.update({
      where: { id },
      data: {
        ...(dto.actionTaken !== undefined ? { actionTaken: dto.actionTaken } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, studentNumber: true } },
      },
    });
  }

  async getHealthRecord(organizationId: string, studentId: string) {
    const schoolIds = await this.getOrganizationSchoolIds(organizationId);
    const record = await this.prisma.healthRecord.findFirst({
      where: { studentId, schoolId: { in: schoolIds } },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, studentNumber: true } },
      },
    });
    if (!record) {
      throw new NotFoundException('Health record not found for this student');
    }
    return record;
  }

  async upsertHealthRecord(
    organizationId: string,
    userId: string,
    dto: UpsertHealthRecordDto,
  ) {
    await this.assertSchoolInOrganization(dto.schoolId, organizationId);

    const student = await this.prisma.student.findFirst({
      where: { id: dto.studentId, schoolId: dto.schoolId, deletedAt: null },
    });
    if (!student) {
      throw new NotFoundException('Student not found in this school');
    }

    return this.prisma.healthRecord.upsert({
      where: { studentId: dto.studentId },
      update: {
        bloodType: dto.bloodType,
        allergies: dto.allergies,
        conditions: dto.conditions,
        medications: dto.medications,
        notes: dto.notes,
        updatedById: userId,
      },
      create: {
        schoolId: dto.schoolId,
        studentId: dto.studentId,
        bloodType: dto.bloodType,
        allergies: dto.allergies,
        conditions: dto.conditions,
        medications: dto.medications,
        notes: dto.notes,
        updatedById: userId,
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, studentNumber: true } },
      },
    });
  }
}

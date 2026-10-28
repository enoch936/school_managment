import { Injectable, HttpStatus } from '@nestjs/common';
import { AttemptStatus, ExamStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { DomainException, NotFoundException } from '../../common/exceptions/domain.exception';
import { paginate } from '../../common/pagination/pagination.dto';
import { ResourceAuthorizationService } from '../authorization/resource-authorization.service';
import type { AuthPrincipal } from '../../common/interfaces/auth-principal.interface';
import { CreateExamDto, ExamQueryDto, RecordGradeDto, UpdateExamDto } from './dto/examination.dto';

@Injectable()
export class ExaminationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly resourceAuth: ResourceAuthorizationService,
  ) {}

  public static calculateLetterGrade(percentage: number): string {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  }

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

  async create(principal: AuthPrincipal, dto: CreateExamDto) {
    const organizationId = principal.activeOrganizationId ?? '';
    await this.resourceAuth.assertSchoolScope(principal, dto.schoolId);
    await this.resourceAuth.assertTeacherAssignment(principal, dto.classId, dto.subjectId);
    await this.assertSchoolInOrganization(dto.schoolId, organizationId);

    return this.prisma.exam.create({
      data: {
        schoolId: dto.schoolId,
        classId: dto.classId,
        subjectId: dto.subjectId,
        academicYearId: dto.academicYearId,
        termId: dto.termId,
        title: dto.title,
        type: dto.type,
        status: ExamStatus.DRAFT,
        totalMarks: dto.totalMarks,
        passMark: dto.passMark,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        durationMinutes: dto.durationMinutes,
      },
    });
  }

  async findAll(organizationId: string, query: ExamQueryDto) {
    const skip = (query.page - 1) * query.pageSize;
    const take = query.pageSize;

    const where: Prisma.ExamWhereInput = {
      deletedAt: null,
      class: {
        school: {
          organizationId,
          ...(query.schoolId ? { id: query.schoolId } : {}),
        },
      },
      ...(query.classId ? { classId: query.classId } : {}),
      ...(query.subjectId ? { subjectId: query.subjectId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const total = await this.prisma.exam.count({ where });
    const data = await this.prisma.exam.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        subject: { select: { id: true, code: true, name: true } },
        class: { select: { id: true, name: true } },
        _count: { select: { attempts: true } },
      },
    });

    return paginate(data, total, query.page, query.pageSize);
  }

  async findOne(organizationId: string, id: string) {
    const exam = await this.prisma.exam.findFirst({
      where: {
        id,
        deletedAt: null,
        class: {
          school: { organizationId },
        },
      },
      include: {
        subject: { select: { id: true, code: true, name: true } },
        class: { select: { id: true, name: true } },
        attempts: {
          include: {
            student: { select: { id: true, firstName: true, lastName: true, studentNumber: true } },
          },
        },
      },
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    return exam;
  }

  async update(principal: AuthPrincipal, id: string, dto: UpdateExamDto) {
    const organizationId = principal.activeOrganizationId ?? '';
    const exam = await this.findOne(organizationId, id);

    this.resourceAuth.assertRecordStateMutable('Exam', exam.status, 'update', principal);

    return this.prisma.exam.update({
      where: { id },
      data: {
        title: dto.title,
        status: dto.status,
        totalMarks: dto.totalMarks,
        passMark: dto.passMark,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
      },
    });
  }

  async publish(organizationId: string, id: string) {
    const exam = await this.findOne(organizationId, id);
    if (exam.status === ExamStatus.PUBLISHED) {
      return exam;
    }

    return this.prisma.exam.update({
      where: { id },
      data: { status: ExamStatus.PUBLISHED },
    });
  }

  async recordGrade(principal: AuthPrincipal, examId: string, dto: RecordGradeDto) {
    const organizationId = principal.activeOrganizationId ?? '';
    const exam = await this.findOne(organizationId, examId);

    // Multi-dimensional authorization check: teacher assignment, year boundary, exam state
    await this.resourceAuth.assertTeacherAssignment(principal, exam.classId, exam.subjectId);
    await this.resourceAuth.assertAcademicYearMutable(principal, exam.academicYearId, exam.schoolId);
    this.resourceAuth.assertRecordStateMutable('Exam', exam.status, 'recordGrade', principal);

    const student = await this.prisma.student.findFirst({
      where: { id: dto.studentId, schoolId: exam.schoolId, deletedAt: null },
      select: { id: true },
    });
    if (!student) {
      throw new NotFoundException('Student', dto.studentId);
    }

    const percentage = exam.totalMarks > 0 ? Math.round((dto.score / exam.totalMarks) * 100) : 0;

    return this.prisma.examAttempt.upsert({
      where: {
        examId_studentId: {
          examId,
          studentId: dto.studentId,
        },
      },
      update: {
        score: dto.score,
        percentage,
        status: AttemptStatus.GRADED,
        gradedAt: new Date(),
      },
      create: {
        examId,
        studentId: dto.studentId,
        score: dto.score,
        percentage,
        status: AttemptStatus.GRADED,
        gradedAt: new Date(),
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, studentNumber: true } },
      },
    });
  }

  async getResultsSummary(organizationId: string, examId: string) {
    const exam = await this.findOne(organizationId, examId);

    const attempts = await this.prisma.examAttempt.findMany({
      where: { examId, status: AttemptStatus.GRADED },
      select: { score: true, percentage: true },
    });

    if (attempts.length === 0) {
      return {
        examId,
        title: exam.title,
        totalAttempts: 0,
        averageScore: 0,
        averagePercentage: 0,
        highestScore: 0,
        lowestScore: 0,
        passCount: 0,
        failCount: 0,
        gradeDistribution: { A: 0, B: 0, C: 0, D: 0, F: 0 },
      };
    }

    let sumScore = 0;
    let sumPercentage = 0;
    let highest = -Infinity;
    let lowest = Infinity;
    let passCount = 0;
    const gradeDistribution: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };

    for (const attempt of attempts) {
      const score = attempt.score ?? 0;
      const percentage = attempt.percentage ?? 0;

      sumScore += score;
      sumPercentage += percentage;
      if (score > highest) highest = score;
      if (score < lowest) lowest = score;
      if (exam.passMark && score >= exam.passMark) passCount++;

      const letter = ExaminationsService.calculateLetterGrade(percentage);
      gradeDistribution[letter] = (gradeDistribution[letter] ?? 0) + 1;
    }

    return {
      examId,
      title: exam.title,
      totalAttempts: attempts.length,
      averageScore: Math.round((sumScore / attempts.length) * 10) / 10,
      averagePercentage: Math.round((sumPercentage / attempts.length) * 10) / 10,
      highestScore: highest,
      lowestScore: lowest,
      passCount,
      failCount: attempts.length - passCount,
      gradeDistribution,
    };
  }
}

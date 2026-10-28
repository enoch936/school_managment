import { Injectable, HttpStatus } from '@nestjs/common';
import { AttemptStatus, ExamStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { DomainException, NotFoundException } from '../../common/exceptions/domain.exception';
import { paginate } from '../../common/pagination/pagination.dto';
import { CreateExamDto, ExamQueryDto, RecordGradeDto, UpdateExamDto } from './dto/examination.dto';

@Injectable()
export class ExaminationsService {
  constructor(private readonly prisma: PrismaService) {}

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

  async create(organizationId: string, dto: CreateExamDto) {
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
        class: { school: { organizationId } },
      },
      include: {
        subject: true,
        class: true,
        attempts: {
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

    if (!exam) {
      throw new NotFoundException('Exam', id);
    }

    return exam;
  }

  async update(organizationId: string, id: string, dto: UpdateExamDto) {
    await this.findOne(organizationId, id);

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

  async recordGrade(organizationId: string, examId: string, dto: RecordGradeDto) {
    const exam = await this.findOne(organizationId, examId);

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
    });
  }

  async getResultsSummary(organizationId: string, id: string) {
    const exam = await this.findOne(organizationId, id);
    const attempts = await this.prisma.examAttempt.findMany({
      where: { examId: id, status: AttemptStatus.GRADED },
      select: { score: true, percentage: true },
    });

    if (attempts.length === 0) {
      return {
        totalGraded: 0,
        averageScore: 0,
        highestScore: 0,
        lowestScore: 0,
        passRate: 0,
        gradeDistribution: {},
      };
    }

    const scores = attempts.map((a) => a.score ?? 0);
    const totalScore = scores.reduce((sum, s) => sum + s, 0);
    const averageScore = Math.round((totalScore / attempts.length) * 100) / 100;
    const highestScore = Math.max(...scores);
    const lowestScore = Math.min(...scores);
    const passedCount = attempts.filter((a) => (a.score ?? 0) >= exam.passMark).length;
    const passRate = Math.round((passedCount / attempts.length) * 100);

    const gradeDistribution: Record<string, number> = {};
    for (const a of attempts) {
      const pct = a.percentage ?? (exam.totalMarks > 0 ? Math.round(((a.score ?? 0) / exam.totalMarks) * 100) : 0);
      const letter = ExaminationsService.calculateLetterGrade(pct);
      gradeDistribution[letter] = (gradeDistribution[letter] ?? 0) + 1;
    }

    return {
      totalGraded: attempts.length,
      averageScore,
      highestScore,
      lowestScore,
      passRate,
      gradeDistribution,
    };
  }
}

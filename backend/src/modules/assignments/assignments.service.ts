import { Injectable, HttpStatus } from '@nestjs/common';
import { Prisma, SubmissionStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { DomainException, NotFoundException } from '../../common/exceptions/domain.exception';
import { paginate } from '../../common/pagination/pagination.dto';
import {
  AssignmentQueryDto,
  CreateAssignmentDto,
  GradeSubmissionDto,
  SubmitAssignmentDto,
} from './dto/assignment.dto';

@Injectable()
export class AssignmentsService {
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

  async create(organizationId: string, dto: CreateAssignmentDto) {
    await this.assertSchoolInOrganization(dto.schoolId, organizationId);

    return this.prisma.assignment.create({
      data: {
        schoolId: dto.schoolId,
        classId: dto.classId,
        subjectId: dto.subjectId,
        teacherId: dto.teacherId,
        title: dto.title,
        description: dto.description,
        maxScore: dto.maxScore ?? 100,
        dueAt: new Date(dto.dueAt),
        allowLate: dto.allowLate ?? false,
      },
      include: {
        class: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true, code: true } },
      },
    });
  }

  async findAll(organizationId: string, query: AssignmentQueryDto) {
    const schoolIds = await this.getOrganizationSchoolIds(organizationId);
    const skip = (query.page - 1) * query.pageSize;
    const take = query.pageSize;

    const where: Prisma.AssignmentWhereInput = {
      deletedAt: null,
      schoolId: query.schoolId ? query.schoolId : { in: schoolIds },
      ...(query.classId ? { classId: query.classId } : {}),
      ...(query.subjectId ? { subjectId: query.subjectId } : {}),
      ...(query.teacherId ? { teacherId: query.teacherId } : {}),
      ...(query.publishedOnly ? { publishedAt: { not: null } } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.assignment.findMany({
        where,
        skip,
        take,
        orderBy: { dueAt: 'asc' },
        include: {
          class: { select: { id: true, name: true } },
          subject: { select: { id: true, name: true, code: true } },
          _count: { select: { submissions: true } },
        },
      }),
      this.prisma.assignment.count({ where }),
    ]);

    return paginate(items, total, query.page, query.pageSize);
  }

  async findOne(organizationId: string, id: string) {
    const schoolIds = await this.getOrganizationSchoolIds(organizationId);
    const assignment = await this.prisma.assignment.findFirst({
      where: { id, schoolId: { in: schoolIds }, deletedAt: null },
      include: {
        class: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true, code: true } },
        submissions: {
          include: {
            student: { select: { id: true, firstName: true, lastName: true, studentNumber: true } },
          },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }
    return assignment;
  }

  async publish(organizationId: string, id: string) {
    const assignment = await this.findOne(organizationId, id);
    return this.prisma.assignment.update({
      where: { id: assignment.id },
      data: { publishedAt: new Date() },
    });
  }

  async submit(organizationId: string, assignmentId: string, dto: SubmitAssignmentDto) {
    const assignment = await this.findOne(organizationId, assignmentId);

    const now = new Date();
    const isLate = now > assignment.dueAt;
    if (isLate && !assignment.allowLate) {
      throw new DomainException(
        'SUBMISSION_CLOSED',
        'The deadline has passed and late submissions are not accepted',
        HttpStatus.BAD_REQUEST,
      );
    }

    const status: SubmissionStatus = isLate ? SubmissionStatus.LATE : SubmissionStatus.SUBMITTED;

    return this.prisma.submission.upsert({
      where: {
        assignmentId_studentId: {
          assignmentId,
          studentId: dto.studentId,
        },
      },
      update: {
        content: dto.content,
        attachments: dto.attachments ?? [],
        status,
        submittedAt: now,
      },
      create: {
        assignmentId,
        studentId: dto.studentId,
        content: dto.content,
        attachments: dto.attachments ?? [],
        status,
        submittedAt: now,
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async listSubmissions(organizationId: string, assignmentId: string) {
    await this.findOne(organizationId, assignmentId);

    return this.prisma.submission.findMany({
      where: { assignmentId },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, studentNumber: true } },
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async gradeSubmission(
    organizationId: string,
    assignmentId: string,
    submissionId: string,
    graderId: string,
    dto: GradeSubmissionDto,
  ) {
    const assignment = await this.findOne(organizationId, assignmentId);

    if (dto.score > assignment.maxScore) {
      throw new DomainException(
        'INVALID_SCORE',
        `Score cannot exceed maximum assignment score of ${assignment.maxScore}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const submission = await this.prisma.submission.findFirst({
      where: { id: submissionId, assignmentId },
    });
    if (!submission) {
      throw new NotFoundException('Submission not found for this assignment');
    }

    return this.prisma.submission.update({
      where: { id: submissionId },
      data: {
        score: dto.score,
        feedback: dto.feedback,
        status: SubmissionStatus.GRADED,
        gradedById: graderId,
        gradedAt: new Date(),
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, studentNumber: true } },
      },
    });
  }
}

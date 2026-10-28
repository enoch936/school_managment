import { Injectable, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { DomainException, NotFoundException } from '../../common/exceptions/domain.exception';
import { CreateTimetableEntryDto, TimetableQueryDto } from './dto/timetable.dto';

@Injectable()
export class TimetablesService {
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

  async createEntry(organizationId: string, dto: CreateTimetableEntryDto) {
    await this.assertSchoolInOrganization(dto.schoolId, organizationId);

    if (dto.startTime >= dto.endTime) {
      throw new DomainException(
        'INVALID_TIME_RANGE',
        'Start time must be before end time',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Fetch existing entries on this day to detect collisions
    const existingEntries = await this.prisma.timetableEntry.findMany({
      where: {
        schoolId: dto.schoolId,
        academicYearId: dto.academicYearId,
        dayOfWeek: dto.dayOfWeek,
      },
      include: {
        class: { select: { name: true } },
        teacher: { select: { firstName: true, lastName: true } },
        room: { select: { name: true } },
      },
    });

    for (const entry of existingEntries) {
      const isOverlapping = entry.startTime < dto.endTime && entry.endTime > dto.startTime;
      if (!isOverlapping) continue;

      // 1. Check Class / Section collision
      const sameClass = entry.classId === dto.classId;
      const sameSection = !dto.sectionId || !entry.sectionId || entry.sectionId === dto.sectionId;
      if (sameClass && sameSection) {
        throw new DomainException(
          'TIMETABLE_CLASS_CONFLICT',
          `Class ${entry.class.name} already has a scheduled session between ${entry.startTime} and ${entry.endTime}`,
          HttpStatus.CONFLICT,
        );
      }

      // 2. Check Teacher collision
      if (dto.teacherId && entry.teacherId === dto.teacherId) {
        const teacherName = entry.teacher
          ? `${entry.teacher.firstName} ${entry.teacher.lastName}`
          : 'Teacher';
        throw new DomainException(
          'TIMETABLE_TEACHER_CONFLICT',
          `${teacherName} is already scheduled for another class between ${entry.startTime} and ${entry.endTime}`,
          HttpStatus.CONFLICT,
        );
      }

      // 3. Check Room collision
      if (dto.roomId && entry.roomId === dto.roomId) {
        const roomName = entry.room ? entry.room.name : 'Room';
        throw new DomainException(
          'TIMETABLE_ROOM_CONFLICT',
          `${roomName} is already occupied between ${entry.startTime} and ${entry.endTime}`,
          HttpStatus.CONFLICT,
        );
      }
    }

    return this.prisma.timetableEntry.create({
      data: {
        schoolId: dto.schoolId,
        academicYearId: dto.academicYearId,
        termId: dto.termId,
        classId: dto.classId,
        sectionId: dto.sectionId,
        subjectId: dto.subjectId,
        teacherId: dto.teacherId,
        roomId: dto.roomId,
        dayOfWeek: dto.dayOfWeek,
        startTime: dto.startTime,
        endTime: dto.endTime,
      },
      include: {
        class: { select: { id: true, name: true } },
        section: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true, code: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
        room: { select: { id: true, name: true } },
      },
    });
  }

  async findAll(organizationId: string, query: TimetableQueryDto) {
    const schoolIds = await this.getOrganizationSchoolIds(organizationId);

    const where: Prisma.TimetableEntryWhereInput = {
      schoolId: query.schoolId ? query.schoolId : { in: schoolIds },
      ...(query.academicYearId ? { academicYearId: query.academicYearId } : {}),
      ...(query.classId ? { classId: query.classId } : {}),
      ...(query.sectionId ? { sectionId: query.sectionId } : {}),
      ...(query.teacherId ? { teacherId: query.teacherId } : {}),
      ...(query.dayOfWeek ? { dayOfWeek: query.dayOfWeek } : {}),
    };

    return this.prisma.timetableEntry.findMany({
      where,
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      include: {
        class: { select: { id: true, name: true } },
        section: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true, code: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
        room: { select: { id: true, name: true } },
      },
    });
  }

  async deleteEntry(organizationId: string, id: string) {
    const schoolIds = await this.getOrganizationSchoolIds(organizationId);
    const entry = await this.prisma.timetableEntry.findFirst({
      where: { id, schoolId: { in: schoolIds } },
    });
    if (!entry) {
      throw new NotFoundException('Timetable entry not found');
    }

    await this.prisma.timetableEntry.delete({ where: { id } });
    return { success: true, id };
  }
}

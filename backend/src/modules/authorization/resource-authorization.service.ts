import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { AuthPrincipal } from '../../common/interfaces/auth-principal.interface';

@Injectable()
export class ResourceAuthorizationService {
  private readonly logger = new Logger(ResourceAuthorizationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Enforces strict tenant and school boundary isolation.
   * Client-provided school IDs are checked against the authenticated organization
   * and user's assigned school scope.
   */
  async assertSchoolScope(principal: AuthPrincipal, schoolId: string): Promise<void> {
    if (principal.isPlatformAdmin) return;

    const school = await this.prisma.school.findFirst({
      where: {
        id: schoolId,
        organizationId: principal.activeOrganizationId ?? undefined,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!school) {
      throw new ForbiddenException(
        'Cross-tenant violation: The requested school does not belong to your authorized organization',
      );
    }

    // If membership is scoped to a specific school, deny access to other schools in the org
    if (principal.activeSchoolId && principal.activeSchoolId !== schoolId) {
      throw new ForbiddenException(
        'Campus/School violation: Your membership is restricted to your assigned school',
      );
    }
  }

  /**
   * Enforces campus-level boundary isolation.
   */
  assertCampusScope(principal: AuthPrincipal, campusId?: string | null): void {
    if (principal.isPlatformAdmin || !principal.activeCampusId || !campusId) return;

    if (principal.activeCampusId !== campusId) {
      throw new ForbiddenException(
        'Campus violation: You do not have authorization to view records outside your assigned campus',
      );
    }
  }

  /**
   * Enforces relationship-based access control (ReBAC):
   * - Parents can only view their linked children.
   * - Students can only view their own profile/records.
   * - Teachers can only view students enrolled in their assigned classes/subjects.
   */
  async assertCanAccessStudent(principal: AuthPrincipal, studentId: string): Promise<void> {
    if (principal.isPlatformAdmin) return;

    const student = await this.prisma.student.findFirst({
      where: { id: studentId, deletedAt: null },
      select: {
        id: true,
        schoolId: true,
        campusId: true,
        userId: true,
        school: { select: { organizationId: true } },
        enrollments: {
          where: { status: 'ACTIVE' },
          select: { classId: true },
        },
      },
    });

    if (!student || student.school.organizationId !== principal.activeOrganizationId) {
      throw new NotFoundException('Student record not found in your organization');
    }

    this.assertCampusScope(principal, student.campusId);

    // 1. Student self-access check
    const isStudentRole = principal.memberships.some((m) => m.roleKey === 'student');
    if (isStudentRole && student.userId !== principal.userId) {
      throw new ForbiddenException('Access denied: You may only view your own student record');
    }

    // 2. Parent-child relationship check
    const isParentRole = principal.memberships.some((m) => m.roleKey === 'parent');
    if (isParentRole) {
      const guardian = await this.prisma.guardian.findUnique({
        where: { userId: principal.userId },
        select: { id: true },
      });
      if (!guardian) {
        throw new ForbiddenException('Guardian profile not linked to your user account');
      }

      const relation = await this.prisma.studentGuardian.findUnique({
        where: {
          studentId_guardianId: {
            studentId,
            guardianId: guardian.id,
          },
        },
      });

      if (!relation) {
        throw new ForbiddenException('Access denied: You are not registered as a guardian for this student');
      }
    }

    // 3. Teacher-student relationship check
    const isTeacherRole = principal.memberships.some(
      (m) => m.roleKey === 'teacher' || m.roleKey === 'assistant_teacher',
    );
    const isAdmin = principal.memberships.some(
      (m) =>
        m.roleKey === 'school_owner' ||
        m.roleKey === 'school_admin' ||
        m.roleKey === 'principal' ||
        m.roleKey === 'vice_principal' ||
        m.roleKey === 'registrar',
    );

    if (isTeacherRole && !isAdmin) {
      const teacher = await this.prisma.teacher.findUnique({
        where: { userId: principal.userId },
        include: { assignments: true },
      });

      if (teacher) {
        const assignedClassIds = new Set(teacher.assignments.map((a) => a.classId));
        const studentClassIds = student.enrollments.map((e) => e.classId);
        const hasSharedClass = studentClassIds.some((cid) => assignedClassIds.has(cid));

        if (!hasSharedClass && teacher.assignments.length > 0) {
          throw new ForbiddenException(
            'Access denied: Student is not enrolled in any of your assigned classes',
          );
        }
      }
    }
  }

  /**
   * Enforces record sensitivity policies:
   * Health and discipline records have elevated confidentiality requirements.
   * Platform administrators accessing sensitive records trigger an immutable audit event.
   */
  async assertCanAccessSensitiveRecord(
    principal: AuthPrincipal,
    studentId: string,
    recordType: 'health' | 'discipline',
  ): Promise<void> {
    // Platform Administrator Audit Trail
    if (principal.isPlatformAdmin) {
      await this.prisma.auditEvent.create({
        data: {
          organizationId: principal.activeOrganizationId,
          actorId: principal.userId,
          action: `sensitive_record.platform_admin_access.${recordType}`,
          entityType: recordType === 'health' ? 'HealthRecord' : 'DisciplineCase',
          entityId: studentId,
          ipAddress: 'internal',
        },
      });
      this.logger.warn(
        `PLATFORM ADMIN AUDIT: Sensitive ${recordType} record accessed for student ${studentId} by platform admin ${principal.email}`,
      );
      return;
    }

    await this.assertCanAccessStudent(principal, studentId);

    const roles = new Set(principal.memberships.map((m) => m.roleKey));

    if (recordType === 'health') {
      const allowedRoles = ['nurse', 'counselor', 'principal', 'vice_principal', 'parent'];
      const hasAuthorizedRole = allowedRoles.some((r) => roles.has(r));
      if (!hasAuthorizedRole) {
        throw new ForbiddenException(
          'Elevated security: Student medical and health records are restricted to authorized health staff or guardians',
        );
      }
    }

    if (recordType === 'discipline') {
      const allowedRoles = [
        'counselor',
        'principal',
        'vice_principal',
        'teacher',
        'school_admin',
        'parent',
      ];
      const hasAuthorizedRole = allowedRoles.some((r) => roles.has(r));
      if (!hasAuthorizedRole) {
        throw new ForbiddenException(
          'Elevated security: Student disciplinary cases are restricted to authorized pastoral staff',
        );
      }
    }
  }
}

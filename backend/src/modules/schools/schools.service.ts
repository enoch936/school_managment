import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { DomainException, NotFoundException } from '../../common/exceptions/domain.exception';
import { paginate } from '../../common/pagination/pagination.dto';
import type { AuthPrincipal } from '../../common/interfaces/auth-principal.interface';
import {
  CalendarQueryDto,
  CreateCalendarEventDto,
  CreateCampusDto,
  CreateDocumentTemplateDto,
  CreateGradingScaleDto,
  CreateSchoolDto,
  SchoolOnboardingDto,
  SchoolQueryDto,
  ToggleFeatureFlagDto,
  UpdateCalendarEventDto,
  UpdateCampusDto,
  UpdateDocumentTemplateDto,
  UpdateGradingScaleDto,
  UpdateSchoolDto,
  UpdateSubscriptionDto,
  UpdateTenantSettingsDto,
  UpsertSchoolPolicyDto,
} from './dto/school.dto';

@Injectable()
export class SchoolsService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Helper validation -----------------------------------------------------

  private async assertSchool(organizationId: string, schoolId: string) {
    const school = await this.prisma.school.findFirst({
      where: { id: schoolId, organizationId, deletedAt: null },
      select: { id: true, organizationId: true, name: true, code: true },
    });
    if (!school) {
      throw new DomainException('INVALID_SCHOOL', 'School not found in your organization');
    }
    return school;
  }

  // --- School Onboarding & Registration --------------------------------------

  async onboardSchool(organizationId: string, principal: AuthPrincipal, dto: SchoolOnboardingDto) {
    const existing = await this.prisma.school.findFirst({
      where: { organizationId, code: dto.code },
      select: { id: true },
    });
    if (existing) {
      throw new DomainException(
        'DUPLICATE_SCHOOL_CODE',
        `A school with code "${dto.code}" already exists in your organization`,
        HttpStatus.CONFLICT,
      );
    }

    // Check SaaS subscription limits
    const subscription = await this.getOrCreateSubscription(organizationId);
    if (subscription.status === 'SUSPENDED' || subscription.status === 'CANCELLED') {
      throw new DomainException(
        'SUBSCRIPTION_INACTIVE',
        `Tenant subscription is currently ${subscription.status}. School creation is locked.`,
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    const defaultGradingBands = [
      { grade: 'A', minPercentage: 90, maxPercentage: 100, gpaValue: 4.0, description: 'Excellent' },
      { grade: 'B', minPercentage: 80, maxPercentage: 89, gpaValue: 3.0, description: 'Good' },
      { grade: 'C', minPercentage: 70, maxPercentage: 79, gpaValue: 2.0, description: 'Satisfactory' },
      { grade: 'D', minPercentage: 60, maxPercentage: 69, gpaValue: 1.0, description: 'Pass' },
      { grade: 'F', minPercentage: 0, maxPercentage: 59, gpaValue: 0.0, description: 'Fail' },
    ];

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Create School
      const school = await tx.school.create({
        data: {
          organizationId,
          name: dto.name,
          code: dto.code,
          type: dto.type ?? 'K12',
          email: dto.email,
          phone: dto.phone,
          address: dto.address,
          website: dto.website,
          taxId: dto.taxId,
          logoUrl: dto.logoUrl,
          timezone: dto.timezone ?? 'Africa/Addis_Ababa',
          locale: dto.locale ?? 'en',
          currency: dto.currency ?? 'ETB',
          isActive: true,
        },
      });

      // 2. Create Main Campus
      const campus = await tx.campus.create({
        data: {
          schoolId: school.id,
          name: dto.mainCampusName,
          code: dto.mainCampusCode,
          address: dto.mainCampusAddress ?? dto.address,
          email: dto.email,
          phone: dto.phone,
          isActive: true,
        },
      });

      // 3. Create Academic Year and Terms
      const startDate = new Date(dto.academicYearStartDate);
      const endDate = new Date(dto.academicYearEndDate);
      const academicYear = await tx.academicYear.create({
        data: {
          schoolId: school.id,
          name: dto.academicYearName,
          startDate,
          endDate,
          isCurrent: true,
        },
      });

      const termDurationMs = (endDate.getTime() - startDate.getTime()) / dto.termNames.length;
      for (let i = 0; i < dto.termNames.length; i++) {
        const termStart = new Date(startDate.getTime() + i * termDurationMs);
        const termEnd = new Date(startDate.getTime() + (i + 1) * termDurationMs - 86400000);
        await tx.term.create({
          data: {
            academicYearId: academicYear.id,
            name: dto.termNames[i],
            sequence: i + 1,
            startDate: termStart,
            endDate: termEnd,
            isCurrent: i === 0,
          },
        });
      }

      // 4. Create Default Grading Scale
      await tx.gradingScale.create({
        data: {
          schoolId: school.id,
          name: 'Standard Letter Grading Scale',
          type: dto.gradingScaleType ?? 'LETTER_GRADE',
          isDefault: true,
          bands: defaultGradingBands,
        },
      });

      // 5. Create Default School Policies
      await tx.schoolPolicy.createMany({
        data: [
          {
            schoolId: school.id,
            category: 'ATTENDANCE',
            key: 'attendance.policy',
            name: 'Attendance Policy & Thresholds',
            value: {
              mode: dto.attendanceMode ?? 'DAILY',
              minAttendancePercentage: dto.minAttendancePercentage ?? 75,
              lateGraceMinutes: 15,
              allowSelfCheckin: false,
            },
            description: 'Enforces minimum required student attendance and daily/period tracking mode',
          },
          {
            schoolId: school.id,
            category: 'FINANCE',
            key: 'finance.rules',
            name: 'Tuition Billing & Invoicing Rules',
            value: {
              currency: dto.currency ?? 'ETB',
              invoiceDueDays: 30,
              lateFeePenaltyPercent: 5,
              gracePeriodDays: 7,
              partialPaymentsAllowed: true,
            },
            description: 'Standard tuition fee payment terms, invoicing cadence, and late fee penalties',
          },
          {
            schoolId: school.id,
            category: 'GRADING',
            key: 'grading.policy',
            name: 'Examination & Assessment Policy',
            value: {
              passingPercentage: 60,
              passingGrade: 'D',
              allowRetakes: true,
              requirePrincipalUnlockForPublished: true,
            },
            description: 'Academic performance pass thresholds and grade change locking controls',
          },
        ],
      });

      // 6. Create Default Document Templates
      await tx.documentTemplate.createMany({
        data: [
          {
            schoolId: school.id,
            type: 'ID_CARD',
            name: 'Standard Student ID Card',
            headerLogo: dto.logoUrl,
            footerText: `Official Student Identification • ${school.name}`,
            layout: { orientation: 'portrait', dimensions: { width: 54, height: 86 } },
            isActive: true,
          },
          {
            schoolId: school.id,
            type: 'ENROLLMENT_CERTIFICATE',
            name: 'Official Enrollment Verification Letter',
            headerLogo: dto.logoUrl,
            footerText: 'This certificate is issued for official institutional verification.',
            layout: { orientation: 'portrait', format: 'A4' },
            isActive: true,
          },
          {
            schoolId: school.id,
            type: 'FEE_RECEIPT',
            name: 'Tuition Payment Receipt',
            headerLogo: dto.logoUrl,
            footerText: 'Thank you for your timely payment.',
            layout: { orientation: 'portrait', format: 'A5' },
            isActive: true,
          },
          {
            schoolId: school.id,
            type: 'REPORT_CARD',
            name: 'Academic Term Report Card',
            headerLogo: dto.logoUrl,
            footerText: 'Official Academic Progress Report • Not valid without school stamp',
            layout: { orientation: 'portrait', format: 'A4' },
            isActive: true,
          },
        ],
      });

      // 7. Update caller membership to associate with new school
      if (principal.userId) {
        await tx.membership.updateMany({
          where: { userId: principal.userId, organizationId, schoolId: null },
          data: { schoolId: school.id, campusId: campus.id },
        });
      }

      // 8. Audit event
      await tx.auditEvent.create({
        data: {
          organizationId,
          actorId: principal.userId,
          action: 'school.onboarded',
          entityType: 'School',
          entityId: school.id,
          after: {
            schoolId: school.id,
            campusId: campus.id,
            academicYearId: academicYear.id,
          },
        },
      });

      return {
        school,
        campus,
        academicYear,
      };
    });

    return result;
  }

  // --- Schools CRUD ----------------------------------------------------------

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
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { code: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.school.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.take,
        include: { _count: { select: { campuses: true, students: true, staff: true } } },
      }),
      this.prisma.school.count({ where }),
    ]);
    return paginate(data, total, query.page, query.pageSize);
  }

  async getSchool(organizationId: string, id: string) {
    const school = await this.prisma.school.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        campuses: { where: { deletedAt: null } },
        academicYears: { where: { isCurrent: true }, include: { terms: true } },
        gradingScales: { where: { isDefault: true } },
        policies: true,
        documentTemplates: { where: { isActive: true } },
        _count: { select: { students: true, staff: true, classes: true } },
      },
    });
    if (!school) throw new NotFoundException('School', id);
    return school;
  }

  async updateSchool(organizationId: string, id: string, dto: UpdateSchoolDto) {
    await this.assertSchool(organizationId, id);
    return this.prisma.school.update({ where: { id }, data: dto });
  }

  async deleteSchool(organizationId: string, id: string) {
    await this.assertSchool(organizationId, id);
    await this.prisma.school.update({ where: { id }, data: { deletedAt: new Date() } });
    return { id, deleted: true };
  }

  // --- Campuses CRUD ---------------------------------------------------------

  async createCampus(organizationId: string, dto: CreateCampusDto) {
    await this.assertSchool(organizationId, dto.schoolId);

    // Enforce campus quota
    const subscription = await this.getOrCreateSubscription(organizationId);
    const totalCampuses = await this.prisma.campus.count({
      where: { school: { organizationId }, deletedAt: null },
    });

    if (totalCampuses >= subscription.campusLimit) {
      throw new DomainException(
        'CAMPUS_QUOTA_EXCEEDED',
        `Your subscription plan (${subscription.plan}) allows a maximum of ${subscription.campusLimit} campuses. Please upgrade your subscription to add more campuses.`,
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    const dup = await this.prisma.campus.findFirst({
      where: { schoolId: dto.schoolId, code: dto.code },
      select: { id: true },
    });
    if (dup) {
      throw new DomainException(
        'DUPLICATE_CAMPUS_CODE',
        `A campus with code "${dto.code}" already exists in this school`,
        HttpStatus.CONFLICT,
      );
    }

    return this.prisma.campus.create({ data: dto });
  }

  async listCampuses(organizationId: string, schoolId: string) {
    await this.assertSchool(organizationId, schoolId);
    return this.prisma.campus.findMany({
      where: { schoolId, deletedAt: null },
      include: {
        _count: { select: { students: true, staff: true, rooms: true, classes: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getCampus(organizationId: string, id: string) {
    const campus = await this.prisma.campus.findFirst({
      where: { id, school: { organizationId }, deletedAt: null },
      include: {
        school: { select: { id: true, name: true, code: true } },
        rooms: true,
        _count: { select: { students: true, staff: true, classes: true } },
      },
    });
    if (!campus) throw new NotFoundException('Campus', id);
    return campus;
  }

  async updateCampus(organizationId: string, id: string, dto: UpdateCampusDto) {
    const campus = await this.prisma.campus.findFirst({
      where: { id, school: { organizationId } },
      select: { id: true },
    });
    if (!campus) throw new NotFoundException('Campus', id);
    if (dto.schoolId) await this.assertSchool(organizationId, dto.schoolId);

    return this.prisma.campus.update({ where: { id }, data: dto });
  }

  async deleteCampus(organizationId: string, id: string) {
    const campus = await this.prisma.campus.findFirst({
      where: { id, school: { organizationId } },
      include: { _count: { select: { students: true } } },
    });
    if (!campus) throw new NotFoundException('Campus', id);

    if (campus._count.students > 0) {
      throw new DomainException(
        'CAMPUS_NOT_EMPTY',
        `Cannot delete campus: ${campus._count.students} active students are currently assigned to this campus. Please reassign them first.`,
        HttpStatus.CONFLICT,
      );
    }

    await this.prisma.campus.update({ where: { id }, data: { deletedAt: new Date() } });
    return { id, deleted: true };
  }

  // --- Academic Calendar Events ----------------------------------------------

  async createCalendarEvent(organizationId: string, schoolId: string, dto: CreateCalendarEventDto) {
    await this.assertSchool(organizationId, schoolId);
    return this.prisma.academicCalendarEvent.create({
      data: {
        schoolId,
        academicYearId: dto.academicYearId,
        title: dto.title,
        description: dto.description,
        type: dto.type,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        isAllDay: dto.isAllDay ?? true,
        affectsAttendance: dto.affectsAttendance ?? true,
      },
    });
  }

  async listCalendarEvents(organizationId: string, schoolId: string, query: CalendarQueryDto) {
    await this.assertSchool(organizationId, schoolId);
    const where: Prisma.AcademicCalendarEventWhereInput = {
      schoolId,
      ...(query.type ? { type: query.type } : {}),
      ...(query.from || query.to
        ? {
            startDate: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };

    return this.prisma.academicCalendarEvent.findMany({
      where,
      orderBy: { startDate: 'asc' },
    });
  }

  async updateCalendarEvent(organizationId: string, eventId: string, dto: UpdateCalendarEventDto) {
    const event = await this.prisma.academicCalendarEvent.findFirst({
      where: { id: eventId, school: { organizationId } },
      select: { id: true },
    });
    if (!event) throw new NotFoundException('CalendarEvent', eventId);

    return this.prisma.academicCalendarEvent.update({
      where: { id: eventId },
      data: {
        title: dto.title,
        description: dto.description,
        type: dto.type,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        isAllDay: dto.isAllDay,
        affectsAttendance: dto.affectsAttendance,
      },
    });
  }

  async deleteCalendarEvent(organizationId: string, eventId: string) {
    const event = await this.prisma.academicCalendarEvent.findFirst({
      where: { id: eventId, school: { organizationId } },
      select: { id: true },
    });
    if (!event) throw new NotFoundException('CalendarEvent', eventId);

    await this.prisma.academicCalendarEvent.delete({ where: { id: eventId } });
    return { id: eventId, deleted: true };
  }

  // --- Grading Scales --------------------------------------------------------

  async createGradingScale(organizationId: string, schoolId: string, dto: CreateGradingScaleDto) {
    await this.assertSchool(organizationId, schoolId);

    if (dto.isDefault) {
      await this.prisma.gradingScale.updateMany({
        where: { schoolId },
        data: { isDefault: false },
      });
    }

    return this.prisma.gradingScale.create({
      data: {
        schoolId,
        name: dto.name,
        type: dto.type ?? 'LETTER_GRADE',
        isDefault: dto.isDefault ?? false,
        bands: dto.bands as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async listGradingScales(organizationId: string, schoolId: string) {
    await this.assertSchool(organizationId, schoolId);
    return this.prisma.gradingScale.findMany({
      where: { schoolId },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
  }

  async updateGradingScale(organizationId: string, scaleId: string, dto: UpdateGradingScaleDto) {
    const scale = await this.prisma.gradingScale.findFirst({
      where: { id: scaleId, school: { organizationId } },
      select: { id: true, schoolId: true },
    });
    if (!scale) throw new NotFoundException('GradingScale', scaleId);

    if (dto.isDefault) {
      await this.prisma.gradingScale.updateMany({
        where: { schoolId: scale.schoolId },
        data: { isDefault: false },
      });
    }

    return this.prisma.gradingScale.update({
      where: { id: scaleId },
      data: {
        name: dto.name,
        type: dto.type,
        isDefault: dto.isDefault,
        bands: dto.bands ? (dto.bands as unknown as Prisma.InputJsonValue) : undefined,
      },
    });
  }

  // --- School Policies -------------------------------------------------------

  async listSchoolPolicies(organizationId: string, schoolId: string, category?: string) {
    await this.assertSchool(organizationId, schoolId);
    return this.prisma.schoolPolicy.findMany({
      where: {
        schoolId,
        ...(category ? { category } : {}),
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  async upsertSchoolPolicy(organizationId: string, schoolId: string, dto: UpsertSchoolPolicyDto) {
    await this.assertSchool(organizationId, schoolId);

    return this.prisma.schoolPolicy.upsert({
      where: {
        schoolId_key: { schoolId, key: dto.key },
      },
      create: {
        schoolId,
        category: dto.category,
        key: dto.key,
        name: dto.name,
        value: dto.value as Prisma.InputJsonValue,
        description: dto.description,
      },
      update: {
        name: dto.name,
        value: dto.value as Prisma.InputJsonValue,
        description: dto.description,
      },
    });
  }

  // --- Document Templates ----------------------------------------------------

  async createDocumentTemplate(
    organizationId: string,
    schoolId: string,
    dto: CreateDocumentTemplateDto,
  ) {
    await this.assertSchool(organizationId, schoolId);
    return this.prisma.documentTemplate.create({
      data: {
        schoolId,
        type: dto.type,
        name: dto.name,
        layout: dto.layout as Prisma.InputJsonValue,
        headerLogo: dto.headerLogo,
        footerText: dto.footerText,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async listDocumentTemplates(organizationId: string, schoolId: string, type?: string) {
    await this.assertSchool(organizationId, schoolId);
    return this.prisma.documentTemplate.findMany({
      where: {
        schoolId,
        ...(type ? { type } : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  async updateDocumentTemplate(
    organizationId: string,
    templateId: string,
    dto: UpdateDocumentTemplateDto,
  ) {
    const template = await this.prisma.documentTemplate.findFirst({
      where: { id: templateId, school: { organizationId } },
      select: { id: true },
    });
    if (!template) throw new NotFoundException('DocumentTemplate', templateId);

    return this.prisma.documentTemplate.update({
      where: { id: templateId },
      data: {
        name: dto.name,
        type: dto.type,
        layout: dto.layout ? (dto.layout as Prisma.InputJsonValue) : undefined,
        headerLogo: dto.headerLogo,
        footerText: dto.footerText,
        isActive: dto.isActive,
      },
    });
  }

  async deleteDocumentTemplate(organizationId: string, templateId: string) {
    const template = await this.prisma.documentTemplate.findFirst({
      where: { id: templateId, school: { organizationId } },
      select: { id: true },
    });
    if (!template) throw new NotFoundException('DocumentTemplate', templateId);

    await this.prisma.documentTemplate.delete({ where: { id: templateId } });
    return { id: templateId, deleted: true };
  }

  // --- SaaS Subscriptions & Quotas & Tenant Controls -------------------------

  private async getOrCreateSubscription(organizationId: string) {
    let sub = await this.prisma.subscription.findFirst({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });

    if (!sub) {
      sub = await this.prisma.subscription.create({
        data: {
          organizationId,
          plan: 'GROWTH',
          status: 'ACTIVE',
          seatsAllowed: 100,
          studentLimit: 2500,
          campusLimit: 5,
          staffLimit: 150,
          storageLimitMb: 10240,
        },
      });
    }

    return sub;
  }

  async getTenantSubscription(organizationId: string) {
    const subscription = await this.getOrCreateSubscription(organizationId);

    const [studentCount, staffCount, campusCount, schoolCount] = await Promise.all([
      this.prisma.student.count({
        where: { school: { organizationId }, deletedAt: null },
      }),
      this.prisma.staff.count({
        where: { school: { organizationId }, deletedAt: null },
      }),
      this.prisma.campus.count({
        where: { school: { organizationId }, deletedAt: null },
      }),
      this.prisma.school.count({
        where: { organizationId, deletedAt: null },
      }),
    ]);

    return {
      subscription,
      usage: {
        students: {
          current: studentCount,
          limit: subscription.studentLimit,
          utilizationPercent: subscription.studentLimit
            ? Math.round((studentCount / subscription.studentLimit) * 100)
            : 0,
        },
        staff: {
          current: staffCount,
          limit: subscription.staffLimit,
          utilizationPercent: subscription.staffLimit
            ? Math.round((staffCount / subscription.staffLimit) * 100)
            : 0,
        },
        campuses: {
          current: campusCount,
          limit: subscription.campusLimit,
          utilizationPercent: subscription.campusLimit
            ? Math.round((campusCount / subscription.campusLimit) * 100)
            : 0,
        },
        schools: {
          current: schoolCount,
        },
      },
    };
  }

  async updateTenantSubscription(organizationId: string, dto: UpdateSubscriptionDto) {
    const existing = await this.getOrCreateSubscription(organizationId);

    return this.prisma.subscription.update({
      where: { id: existing.id },
      data: dto,
    });
  }

  // --- Feature Flags & Tenant Settings ---------------------------------------

  async listFeatureFlags(organizationId: string) {
    const defaultFlags = [
      { key: 'feature.transport', enabled: true, description: 'School bus fleet & route tracking' },
      { key: 'feature.library', enabled: true, description: 'Book inventory, barcode checkout & fines' },
      { key: 'feature.online_payments', enabled: true, description: 'CBE, Telebirr & Chapa payment gateway' },
      { key: 'feature.biometric_attendance', enabled: false, description: 'Biometric card terminal sync' },
      { key: 'feature.mfa_enforced', enabled: false, description: 'Mandatory TOTP 2FA for all staff roles' },
      { key: 'feature.sms_broadcast', enabled: true, description: 'Twilio / Infobip SMS alert gateway' },
    ];

    const customFlags = await this.prisma.featureFlag.findMany({
      where: { organizationId },
    });

    const customMap = new Map(customFlags.map((f) => [f.key, f]));

    return defaultFlags.map((df) => {
      const custom = customMap.get(df.key);
      return {
        key: df.key,
        enabled: custom ? custom.enabled : df.enabled,
        metadata: custom?.metadata ?? {},
        description: df.description,
        isCustomized: Boolean(custom),
      };
    });
  }

  async toggleFeatureFlag(organizationId: string, dto: ToggleFeatureFlagDto) {
    return this.prisma.featureFlag.upsert({
      where: {
        organizationId_key: { organizationId, key: dto.key },
      },
      create: {
        organizationId,
        key: dto.key,
        enabled: dto.enabled,
        metadata: dto.metadata ? (dto.metadata as Prisma.InputJsonValue) : {},
      },
      update: {
        enabled: dto.enabled,
        metadata: dto.metadata ? (dto.metadata as Prisma.InputJsonValue) : {},
      },
    });
  }

  async getTenantSettings(organizationId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        slug: true,
        legalName: true,
        logoUrl: true,
        email: true,
        phone: true,
        address: true,
        timezone: true,
        locale: true,
        currency: true,
        isActive: true,
        settings: true,
      },
    });
    if (!org) throw new NotFoundException('Organization', organizationId);
    return org;
  }

  async updateTenantSettings(organizationId: string, dto: UpdateTenantSettingsDto) {
    return this.prisma.organization.update({
      where: { id: organizationId },
      data: { settings: dto.settings as Prisma.InputJsonValue },
    });
  }
}

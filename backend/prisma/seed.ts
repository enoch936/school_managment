/* eslint-disable no-console */
import { PrismaClient, Gender, StudentStatus } from '@prisma/client';
import * as argon2 from 'argon2';
import { ALL_PERMISSIONS, PERMISSIONS } from '../src/common/constants/permissions';
import { ROLE_KEYS, ROLE_NAMES } from '../src/common/constants/roles';

const prisma = new PrismaClient();

const P = PERMISSIONS;

/**
 * Role -> permission mapping for the built-in system roles. Organizations may
 * create additional custom roles; these are the defaults seeded for every
 * deployment.
 */
const ROLE_PERMISSIONS: Record<string, string[]> = {
  [ROLE_KEYS.PLATFORM_SUPER_ADMIN]: ALL_PERMISSIONS,
  [ROLE_KEYS.SCHOOL_OWNER]: ALL_PERMISSIONS,
  [ROLE_KEYS.SCHOOL_ADMIN]: ALL_PERMISSIONS.filter(
    (p) => p !== PERMISSIONS.PLATFORM_MANAGE,
  ),
  [ROLE_KEYS.CAMPUS_ADMIN]: [
    P.SCHOOL_READ, P.CAMPUS_READ, P.CAMPUS_MANAGE, P.USER_READ,
    P.ACADEMIC_YEAR_READ, P.CLASS_READ, P.CLASS_MANAGE, P.SUBJECT_READ,
    P.STUDENT_READ, P.STUDENT_MANAGE, P.GUARDIAN_READ, P.GUARDIAN_MANAGE,
    P.TEACHER_READ, P.TEACHER_MANAGE, P.STAFF_READ, P.ATTENDANCE_READ,
    P.ATTENDANCE_RECORD, P.ATTENDANCE_APPROVE, P.ASSIGNMENT_READ, P.EXAM_READ,
    P.GRADE_READ, P.GRADE_MANAGE, P.ANNOUNCEMENT_READ, P.ANNOUNCEMENT_MANAGE,
    P.REPORT_READ, P.DOCUMENT_READ, P.DOCUMENT_MANAGE,
  ],
  [ROLE_KEYS.PRINCIPAL]: [
    P.SCHOOL_READ, P.CAMPUS_READ, P.USER_READ, P.ACADEMIC_YEAR_READ,
    P.ACADEMIC_YEAR_MANAGE, P.CLASS_READ, P.CLASS_MANAGE, P.SUBJECT_READ,
    P.SUBJECT_MANAGE, P.TIMETABLE_READ, P.TIMETABLE_MANAGE, P.STUDENT_READ,
    P.GUARDIAN_READ, P.TEACHER_READ, P.TEACHER_MANAGE, P.STAFF_READ,
    P.ATTENDANCE_READ, P.ATTENDANCE_APPROVE, P.ASSIGNMENT_READ, P.EXAM_READ,
    P.EXAM_MANAGE, P.GRADE_READ, P.GRADE_MANAGE, P.GRADE_PUBLISH,
    P.DISCIPLINE_READ, P.DISCIPLINE_MANAGE, P.ANNOUNCEMENT_READ,
    P.ANNOUNCEMENT_MANAGE, P.REPORT_READ, P.REPORT_EXPORT, P.DOCUMENT_READ,
  ],
  [ROLE_KEYS.REGISTRAR]: [
    P.SCHOOL_READ, P.USER_READ, P.STUDENT_READ, P.STUDENT_MANAGE,
    P.GUARDIAN_READ, P.GUARDIAN_MANAGE, P.CLASS_READ, P.CLASS_MANAGE,
    P.ACADEMIC_YEAR_READ, P.REPORT_READ, P.REPORT_EXPORT, P.DOCUMENT_READ,
    P.DOCUMENT_MANAGE,
  ],
  [ROLE_KEYS.ADMISSIONS_OFFICER]: [
    P.STUDENT_READ, P.STUDENT_MANAGE, P.GUARDIAN_READ, P.GUARDIAN_MANAGE,
    P.REPORT_READ, P.DOCUMENT_READ,
  ],
  [ROLE_KEYS.ACADEMIC_COORDINATOR]: [
    P.ACADEMIC_YEAR_READ, P.CLASS_READ, P.CLASS_MANAGE, P.SUBJECT_READ,
    P.SUBJECT_MANAGE, P.TIMETABLE_READ, P.TIMETABLE_MANAGE, P.ASSIGNMENT_READ,
    P.EXAM_READ, P.EXAM_MANAGE, P.GRADE_READ, P.REPORT_READ,
  ],
  [ROLE_KEYS.DEPARTMENT_HEAD]: [
    P.SUBJECT_READ, P.SUBJECT_MANAGE, P.TEACHER_READ, P.TEACHER_MANAGE,
    P.ASSIGNMENT_READ, P.EXAM_READ, P.GRADE_READ, P.REPORT_READ,
  ],
  [ROLE_KEYS.TEACHER]: [
    P.STUDENT_READ, P.CLASS_READ, P.SUBJECT_READ, P.TIMETABLE_READ,
    P.ATTENDANCE_READ, P.ATTENDANCE_RECORD, P.ASSIGNMENT_READ,
    P.ASSIGNMENT_MANAGE, P.EXAM_READ, P.EXAM_MANAGE, P.GRADE_READ,
    P.GRADE_MANAGE,
  ],
  [ROLE_KEYS.ASSISTANT_TEACHER]: [
    P.STUDENT_READ, P.CLASS_READ, P.SUBJECT_READ, P.TIMETABLE_READ,
    P.ATTENDANCE_READ, P.ATTENDANCE_RECORD, P.ASSIGNMENT_READ, P.GRADE_READ,
  ],
  [ROLE_KEYS.STUDENT]: [P.ASSIGNMENT_READ, P.GRADE_READ, P.ANNOUNCEMENT_READ],
  [ROLE_KEYS.PARENT]: [P.GRADE_READ, P.ATTENDANCE_READ, P.INVOICE_READ, P.ANNOUNCEMENT_READ],
  [ROLE_KEYS.ACCOUNTANT]: [
    P.FEE_READ, P.FEE_MANAGE, P.INVOICE_READ, P.INVOICE_MANAGE, P.PAYMENT_READ,
    P.PAYMENT_MANAGE, P.STUDENT_READ, P.REPORT_READ, P.REPORT_EXPORT,
  ],
  [ROLE_KEYS.CASHIER]: [P.INVOICE_READ, P.PAYMENT_READ, P.PAYMENT_MANAGE, P.STUDENT_READ],
  [ROLE_KEYS.HR_MANAGER]: [P.USER_READ, P.USER_MANAGE, P.STAFF_READ, P.STAFF_MANAGE, P.TEACHER_READ, P.REPORT_READ],
  [ROLE_KEYS.PAYROLL_OFFICER]: [P.STAFF_READ, P.REPORT_READ],
  [ROLE_KEYS.LIBRARIAN]: [P.LIBRARY_READ, P.LIBRARY_MANAGE, P.STUDENT_READ],
  [ROLE_KEYS.TRANSPORT_MANAGER]: [P.TRANSPORT_READ, P.TRANSPORT_MANAGE, P.STUDENT_READ],
  [ROLE_KEYS.NURSE]: [P.HEALTH_READ, P.HEALTH_MANAGE, P.STUDENT_READ],
  [ROLE_KEYS.COUNSELOR]: [P.HEALTH_READ, P.DISCIPLINE_READ, P.STUDENT_READ],
  [ROLE_KEYS.EXAM_OFFICER]: [P.EXAM_READ, P.EXAM_MANAGE, P.GRADE_READ, P.GRADE_MANAGE, P.GRADE_PUBLISH, P.REPORT_READ],
  [ROLE_KEYS.IT_SUPPORT]: [P.USER_READ, P.ROLE_READ, P.AUDIT_READ],
  [ROLE_KEYS.AUDITOR]: [P.AUDIT_READ, P.REPORT_READ, P.STUDENT_READ, P.INVOICE_READ, P.PAYMENT_READ],
};

async function main(): Promise<void> {
  console.log('Seeding permissions...');
  await Promise.all(
    ALL_PERMISSIONS.map((key) =>
      prisma.permission.upsert({
        where: { key },
        update: {},
        create: { key, category: key.split(':')[0] },
      }),
    ),
  );

  console.log('Seeding system roles...');
  const roleIdByKey = new Map<string, string>();
  for (const key of Object.values(ROLE_KEYS)) {
    const role = await prisma.role.upsert({
      where: { organizationId_key: { organizationId: null as unknown as string, key } },
      update: { name: ROLE_NAMES[key] ?? key, isSystem: true },
      create: { organizationId: null, key, name: ROLE_NAMES[key] ?? key, isSystem: true },
    }).catch(async () => {
      // Prisma cannot use null in a unique-where for composite; fall back to findFirst.
      const existing = await prisma.role.findFirst({ where: { organizationId: null, key } });
      if (existing) return existing;
      return prisma.role.create({
        data: { organizationId: null, key, name: ROLE_NAMES[key] ?? key, isSystem: true },
      });
    });
    roleIdByKey.set(key, role.id);
  }

  console.log('Mapping role permissions...');
  const permissions = await prisma.permission.findMany();
  const permissionIdByKey = new Map(permissions.map((p) => [p.key, p.id]));
  for (const [roleKey, permKeys] of Object.entries(ROLE_PERMISSIONS)) {
    const roleId = roleIdByKey.get(roleKey);
    if (!roleId) continue;
    await prisma.rolePermission.deleteMany({ where: { roleId } });
    const rows = permKeys
      .map((k) => permissionIdByKey.get(k))
      .filter((id): id is string => Boolean(id))
      .map((permissionId) => ({ roleId, permissionId }));
    if (rows.length) await prisma.rolePermission.createMany({ data: rows, skipDuplicates: true });
  }

  console.log('Seeding platform super admin...');
  const adminEmail = process.env.SEED_SUPER_ADMIN_EMAIL ?? 'admin@example.com';
  const adminPassword = process.env.SEED_SUPER_ADMIN_PASSWORD ?? 'ChangeMe!12345';
  const passwordHash = await argon2.hash(adminPassword, { type: argon2.argon2id });

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { isPlatformAdmin: true, emailVerifiedAt: new Date() },
    create: {
      email: adminEmail,
      passwordHash,
      firstName: 'Platform',
      lastName: 'Administrator',
      isPlatformAdmin: true,
      emailVerifiedAt: new Date(),
    },
  });

  console.log('Seeding demo organization and academic data...');
  const org = await prisma.organization.upsert({
    where: { slug: 'demo-education-group' },
    update: {},
    create: {
      name: process.env.SEED_DEFAULT_ORG_NAME ?? 'Demo Education Group',
      slug: 'demo-education-group',
      email: adminEmail,
      currency: 'ETB',
      timezone: 'Africa/Addis_Ababa',
    },
  });

  await prisma.userOrganization.upsert({
    where: { userId_organizationId: { userId: admin.id, organizationId: org.id } },
    update: { isOwner: true },
    create: { userId: admin.id, organizationId: org.id, isOwner: true },
  });

  const ownerRoleId = roleIdByKey.get(ROLE_KEYS.SCHOOL_OWNER)!;
  await prisma.membership.upsert({
    where: {
      userId_organizationId_schoolId_campusId_roleId: {
        userId: admin.id,
        organizationId: org.id,
        schoolId: null as unknown as string,
        campusId: null as unknown as string,
        roleId: ownerRoleId,
      },
    },
    update: {},
    create: {
      userId: admin.id,
      organizationId: org.id,
      roleId: ownerRoleId,
      status: 'ACTIVE',
      isPrimary: true,
    },
  }).catch(async () => {
    const existing = await prisma.membership.findFirst({
      where: { userId: admin.id, organizationId: org.id },
    });
    if (!existing) {
      await prisma.membership.create({
        data: {
          userId: admin.id,
          organizationId: org.id,
          roleId: ownerRoleId,
          status: 'ACTIVE',
          isPrimary: true,
        },
      });
    }
  });

  const school = await prisma.school.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'BFA' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Bright Future Academy',
      code: 'BFA',
      type: 'K12',
      email: 'info@brightfuture.example',
      phone: '+251900000000',
      address: 'Addis Ababa, Ethiopia',
    },
  });

  const campus = await prisma.campus.upsert({
    where: { schoolId_code: { schoolId: school.id, code: 'MAIN' } },
    update: {},
    create: { schoolId: school.id, name: 'Main Campus', code: 'MAIN', capacity: 1200 },
  });

  const year = await prisma.academicYear.upsert({
    where: { schoolId_name: { schoolId: school.id, name: '2025/2026' } },
    update: { isCurrent: true },
    create: {
      schoolId: school.id,
      name: '2025/2026',
      startDate: new Date('2025-09-01'),
      endDate: new Date('2026-06-30'),
      isCurrent: true,
    },
  });

  await prisma.term.upsert({
    where: { academicYearId_name: { academicYearId: year.id, name: 'Term 1' } },
    update: {},
    create: {
      academicYearId: year.id,
      name: 'Term 1',
      sequence: 1,
      startDate: new Date('2025-09-01'),
      endDate: new Date('2025-12-20'),
      isCurrent: true,
    },
  });

  const subjectSeeds = [
    { code: 'MATH-9', name: 'Mathematics' },
    { code: 'ENG-9', name: 'English' },
    { code: 'BIO-9', name: 'Biology' },
    { code: 'PHY-9', name: 'Physics' },
  ];
  for (const s of subjectSeeds) {
    await prisma.subject.upsert({
      where: { schoolId_code: { schoolId: school.id, code: s.code } },
      update: {},
      create: { schoolId: school.id, code: s.code, name: s.name, isCore: true },
    });
  }

  const classNames = ['Grade 9A', 'Grade 9B', 'Grade 10A'];
  const classes = [] as { id: string; name: string }[];
  for (const name of classNames) {
    const cls = await prisma.class.upsert({
      where: { academicYearId_name: { academicYearId: year.id, name } },
      update: {},
      create: {
        schoolId: school.id,
        campusId: campus.id,
        academicYearId: year.id,
        name,
        capacity: 40,
      },
    });
    classes.push({ id: cls.id, name: cls.name });
  }

  console.log('Seeding demo students and guardians...');
  const firstNames = ['Abel', 'Sara', 'Dawit', 'Hana', 'Yonas', 'Marta', 'Kebede', 'Liya', 'Samuel', 'Bethlehem'];
  const lastNames = ['Tesfaye', 'Bekele', 'Ayele', 'Girma', 'Haile'];
  const statuses: StudentStatus[] = ['ACTIVE', 'ACTIVE', 'ACTIVE', 'APPLICANT'];

  for (let i = 0; i < 24; i += 1) {
    const firstName = firstNames[i % firstNames.length];
    const lastName = lastNames[i % lastNames.length];
    const studentNumber = `STU-2025-${String(i + 1).padStart(4, '0')}`;
    const student = await prisma.student.upsert({
      where: { schoolId_studentNumber: { schoolId: school.id, studentNumber } },
      update: {},
      create: {
        schoolId: school.id,
        campusId: campus.id,
        studentNumber,
        firstName,
        lastName,
        gender: i % 2 === 0 ? Gender.MALE : Gender.FEMALE,
        dateOfBirth: new Date(2011, (i % 12), (i % 27) + 1),
        status: statuses[i % statuses.length],
        enrollmentDate: new Date('2025-09-01'),
      },
    });

    // Enroll active students into a class.
    if (student.status === 'ACTIVE') {
      const cls = classes[i % classes.length];
      await prisma.enrollment.upsert({
        where: { studentId_academicYearId: { studentId: student.id, academicYearId: year.id } },
        update: {},
        create: {
          studentId: student.id,
          schoolId: school.id,
          academicYearId: year.id,
          classId: cls.id,
          status: 'ACTIVE',
        },
      });
    }

    // Create a guardian for every third student.
    if (i % 3 === 0) {
      const guardian = await prisma.guardian.create({
        data: {
          schoolId: school.id,
          firstName: lastNames[(i + 1) % lastNames.length],
          lastName,
          phone: `+2519${String(10000000 + i).slice(0, 8)}`,
          address: 'Addis Ababa',
        },
      });
      await prisma.studentGuardian.create({
        data: {
          studentId: student.id,
          guardianId: guardian.id,
          relation: 'FATHER',
          isPrimary: true,
          isLegalGuardian: true,
        },
      });
    }
  }

  console.log('Seed complete.');
  console.log(`  Super admin: ${adminEmail} / ${adminPassword}`);
  console.log(`  Organization: ${org.name}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });

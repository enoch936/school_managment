import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient({
  datasources: {
    db: { url: 'postgresql://sms:sms_password@localhost:5432/sms?schema=public' },
  },
});

async function main() {
  console.log('Seeding teacher user...');

  const org = await prisma.organization.findFirst({
    where: { name: 'Demo Education Group' },
  });
  if (!org) throw new Error('Demo Education Group not found');

  const school = await prisma.school.findFirst({
    where: { organizationId: org.id },
  });
  if (!school) throw new Error('School not found');

  const teacherRole = await prisma.role.findFirst({
    where: { key: 'teacher' },
  });
  if (!teacherRole) throw new Error('Teacher role not found');

  const academicYear = await prisma.academicYear.findFirst({
    where: { schoolId: school.id },
  });
  if (!academicYear) throw new Error('Academic year not found');

  const grade9A = await prisma.class.findFirst({
    where: { schoolId: school.id, name: 'Grade 9A' },
  });
  if (!grade9A) throw new Error('Grade 9A not found');

  const math = await prisma.subject.findFirst({
    where: { schoolId: school.id, code: 'MATH-9' },
  });
  if (!math) throw new Error('Math subject not found');

  const passwordHash = await argon2.hash('TeacherPass!123', {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  // 1. Upsert User
  const user = await prisma.user.upsert({
    where: { email: 'teacher@example.com' },
    update: {
      passwordHash,
      emailVerifiedAt: new Date(),
    },
    create: {
      email: 'teacher@example.com',
      passwordHash,
      firstName: 'Sara',
      lastName: 'Kebede',
      emailVerifiedAt: new Date(),
      isPlatformAdmin: false,
    },
  });

  // 2. Upsert Membership
  const membership = await prisma.userMembership.upsert({
    where: {
      userId_organizationId_schoolId_campusId_roleId: {
        userId: user.id,
        organizationId: org.id,
        schoolId: school.id,
        campusId: '',
        roleId: teacherRole.id,
      },
    },
    update: {
      status: 'ACTIVE',
    },
    create: {
      userId: user.id,
      organizationId: org.id,
      schoolId: school.id,
      roleId: teacherRole.id,
      status: 'ACTIVE',
    },
  });

  // 3. Upsert Teacher Profile
  const teacher = await prisma.teacher.upsert({
    where: {
      schoolId_employeeCode: {
        schoolId: school.id,
        employeeCode: 'TCH-001',
      },
    },
    update: {
      userId: user.id,
      firstName: 'Sara',
      lastName: 'Kebede',
      email: 'teacher@example.com',
      qualification: 'B.Sc in Mathematics & Education',
    },
    create: {
      schoolId: school.id,
      userId: user.id,
      employeeCode: 'TCH-001',
      firstName: 'Sara',
      lastName: 'Kebede',
      email: 'teacher@example.com',
      qualification: 'B.Sc in Mathematics & Education',
    },
  });

  // 4. Upsert Teacher Assignment
  await prisma.teacherAssignment.upsert({
    where: {
      teacherId_subjectId_classId_sectionId_academicYearId: {
        teacherId: teacher.id,
        subjectId: math.id,
        classId: grade9A.id,
        sectionId: '',
        academicYearId: academicYear.id,
      },
    },
    update: {},
    create: {
      teacherId: teacher.id,
      subjectId: math.id,
      classId: grade9A.id,
      academicYearId: academicYear.id,
    },
  });

  // 5. Add Timetable Entries
  const existingMon = await prisma.timetableEntry.findFirst({
    where: {
      schoolId: school.id,
      classId: grade9A.id,
      dayOfWeek: 1,
      startTime: '08:30',
    },
  });
  if (!existingMon) {
    await prisma.timetableEntry.create({
      data: {
        schoolId: school.id,
        academicYearId: academicYear.id,
        classId: grade9A.id,
        subjectId: math.id,
        teacherId: teacher.id,
        dayOfWeek: 1, // Monday
        startTime: '08:30',
        endTime: '09:15',
      },
    });
  }

  const existingWed = await prisma.timetableEntry.findFirst({
    where: {
      schoolId: school.id,
      classId: grade9A.id,
      dayOfWeek: 3,
      startTime: '10:00',
    },
  });
  if (!existingWed) {
    await prisma.timetableEntry.create({
      data: {
        schoolId: school.id,
        academicYearId: academicYear.id,
        classId: grade9A.id,
        subjectId: math.id,
        teacherId: teacher.id,
        dayOfWeek: 3, // Wednesday
        startTime: '10:00',
        endTime: '10:45',
      },
    });
  }

  // 6. Create Demo Assignment
  const existingAsg = await prisma.assignment.findFirst({
    where: { schoolId: school.id, classId: grade9A.id, subjectId: math.id },
  });
  if (!existingAsg) {
    const dueAt = new Date();
    dueAt.setDate(dueAt.getDate() + 5);

    const assignment = await prisma.assignment.create({
      data: {
        schoolId: school.id,
        classId: grade9A.id,
        subjectId: math.id,
        teacherId: teacher.id,
        title: 'Algebraic Equations & Factoring Problem Set',
        description: 'Solve exercises 1 through 15 on page 42. Show all derivation steps.',
        maxScore: 50,
        dueAt,
        publishedAt: new Date(),
        allowLate: true,
      },
    });

    // Add a submission from a student in Grade 9A
    const student = await prisma.student.findFirst({
      where: { schoolId: school.id },
    });
    if (student) {
      await prisma.submission.create({
        data: {
          assignmentId: assignment.id,
          studentId: student.id,
          content: 'Here are my solutions for the 15 exercises attached as scanned derivations.',
          status: 'SUBMITTED',
          submittedAt: new Date(),
        },
      });
    }
  }

  console.log('Teacher successfully created and enrolled:');
  console.log('  Email: teacher@example.com');
  console.log('  Password: TeacherPass!123');
  console.log('  Teacher Name: Sara Kebede');
  console.log('  Assigned Class: Grade 9A (Mathematics)');
  console.log('  School: Bright Future Academy');
}

main()
  .catch((e) => {
    console.error('Error seeding teacher:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

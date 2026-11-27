-- AlterTable
ALTER TABLE "School" ADD COLUMN     "locale" TEXT NOT NULL DEFAULT 'en',
ADD COLUMN     "taxId" TEXT,
ADD COLUMN     "website" TEXT;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "birthCertificateNo" TEXT,
ADD COLUMN     "bloodGroup" TEXT,
ADD COLUMN     "emergencyContactRelation" TEXT,
ADD COLUMN     "emergencyContactSecondaryPhone" TEXT,
ADD COLUMN     "graduationDate" DATE,
ADD COLUMN     "motherTongue" TEXT,
ADD COLUMN     "nationalId" TEXT,
ADD COLUMN     "previousSchoolAddress" TEXT,
ADD COLUMN     "previousSchoolGrade" TEXT,
ADD COLUMN     "religion" TEXT,
ADD COLUMN     "transferReason" TEXT,
ADD COLUMN     "withdrawalDate" DATE,
ADD COLUMN     "withdrawalReason" TEXT;

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "campusLimit" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "staffLimit" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "storageLimitMb" INTEGER NOT NULL DEFAULT 5120;

-- CreateTable
CREATE TABLE "AcademicCalendarEvent" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'HOLIDAY',
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "isAllDay" BOOLEAN NOT NULL DEFAULT true,
    "affectsAttendance" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "AcademicCalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GradingScale" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'LETTER_GRADE',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "bands" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "GradingScale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolPolicy" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "SchoolPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentTemplate" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "layout" JSONB NOT NULL,
    "headerLogo" TEXT,
    "footerText" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "DocumentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AcademicCalendarEvent_schoolId_startDate_idx" ON "AcademicCalendarEvent"("schoolId", "startDate");

-- CreateIndex
CREATE INDEX "GradingScale_schoolId_isDefault_idx" ON "GradingScale"("schoolId", "isDefault");

-- CreateIndex
CREATE INDEX "SchoolPolicy_schoolId_category_idx" ON "SchoolPolicy"("schoolId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolPolicy_schoolId_key_key" ON "SchoolPolicy"("schoolId", "key");

-- CreateIndex
CREATE INDEX "DocumentTemplate_schoolId_type_idx" ON "DocumentTemplate"("schoolId", "type");

-- AddForeignKey
ALTER TABLE "AcademicCalendarEvent" ADD CONSTRAINT "AcademicCalendarEvent_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradingScale" ADD CONSTRAINT "GradingScale_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolPolicy" ADD CONSTRAINT "SchoolPolicy_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentTemplate" ADD CONSTRAINT "DocumentTemplate_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

import { Injectable, HttpStatus } from '@nestjs/common';
import { InvoiceStatus, PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { DomainException, NotFoundException } from '../../common/exceptions/domain.exception';
import { paginate } from '../../common/pagination/pagination.dto';
import {
  CreateFeeStructureDto,
  CreateInvoiceDto,
  FinanceQueryDto,
  RecordPaymentDto,
} from './dto/finance.dto';

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertSchoolInOrganization(schoolId: string, organizationId: string) {
    const school = await this.prisma.school.findFirst({
      where: { id: schoolId, organizationId, deletedAt: null },
      select: { id: true, currency: true },
    });
    if (!school) {
      throw new DomainException(
        'INVALID_SCHOOL',
        'The selected school does not belong to your organization',
        HttpStatus.BAD_REQUEST,
      );
    }
    return school;
  }

  // --- Fee Structures ---
  async createFeeStructure(organizationId: string, dto: CreateFeeStructureDto) {
    const school = await this.assertSchoolInOrganization(dto.schoolId, organizationId);

    return this.prisma.feeStructure.create({
      data: {
        schoolId: dto.schoolId,
        academicYearId: dto.academicYearId,
        name: dto.name,
        currency: dto.currency ?? school.currency ?? 'ETB',
        items: {
          create: dto.items.map((item, idx) => ({
            category: item.category,
            description: item.description,
            amountMinor: item.amountMinor,
            isMandatory: item.isMandatory ?? true,
            sequence: idx + 1,
          })),
        },
      },
      include: { items: true },
    });
  }

  async getFeeStructures(organizationId: string, schoolId?: string) {
    return this.prisma.feeStructure.findMany({
      where: {
        school: {
          organizationId,
          ...(schoolId ? { id: schoolId } : {}),
        },
      },
      include: { items: true, academicYear: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // --- Invoices ---
  async createInvoice(organizationId: string, dto: CreateInvoiceDto) {
    const school = await this.assertSchoolInOrganization(dto.schoolId, organizationId);

    const student = await this.prisma.student.findFirst({
      where: { id: dto.studentId, schoolId: dto.schoolId, deletedAt: null },
      select: { id: true },
    });
    if (!student) {
      throw new NotFoundException('Student', dto.studentId);
    }

    const subtotalMinor = dto.items.reduce(
      (sum, item) => sum + item.unitMinor * item.quantity,
      0,
    );
    const discountMinor = dto.discountMinor ?? 0;
    const totalMinor = Math.max(0, subtotalMinor - discountMinor);
    const balanceMinor = totalMinor;

    return this.prisma.invoice.create({
      data: {
        schoolId: dto.schoolId,
        studentId: dto.studentId,
        academicYearId: dto.academicYearId,
        invoiceNumber: dto.invoiceNumber,
        issuedAt: new Date(),
        dueDate: new Date(dto.dueDate),
        subtotalMinor,
        discountMinor,
        totalMinor,
        balanceMinor,
        paidMinor: 0,
        status: InvoiceStatus.ISSUED,
        currency: dto.currency ?? school.currency ?? 'ETB',
        items: {
          create: dto.items.map((item, idx) => ({
            category: item.category,
            description: item.description,
            quantity: item.quantity,
            unitMinor: item.unitMinor,
            amountMinor: item.unitMinor * item.quantity,
            sequence: idx + 1,
          })),
        },
      },
      include: {
        items: true,
        student: { select: { firstName: true, lastName: true, studentNumber: true } },
      },
    });
  }

  async getInvoices(organizationId: string, query: FinanceQueryDto) {
    const skip = (query.page - 1) * query.pageSize;
    const take = query.pageSize;

    const where: Prisma.InvoiceWhereInput = {
      school: {
        organizationId,
        ...(query.schoolId ? { id: query.schoolId } : {}),
      },
      ...(query.studentId ? { studentId: query.studentId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const total = await this.prisma.invoice.count({ where });
    const data = await this.prisma.invoice.findMany({
      where,
      skip,
      take,
      orderBy: { issuedAt: 'desc' },
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
    });

    return paginate(data, total, query.page, query.pageSize);
  }

  async getInvoiceById(organizationId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id,
        school: { organizationId },
      },
      include: {
        items: true,
        student: true,
        allocations: {
          include: {
            payment: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice', id);
    }

    return invoice;
  }

  // --- Payment Recording ---
  async recordPayment(organizationId: string, dto: RecordPaymentDto) {
    const invoice = await this.getInvoiceById(organizationId, dto.invoiceId);

    if (invoice.status === InvoiceStatus.PAID) {
      throw new DomainException('ALREADY_PAID', 'This invoice is already fully paid', HttpStatus.BAD_REQUEST);
    }

    if (dto.amountMinor > invoice.balanceMinor) {
      throw new DomainException(
        'EXCESS_PAYMENT',
        `Payment amount (${dto.amountMinor}) exceeds invoice remaining balance (${invoice.balanceMinor})`,
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const receiptNumber = `REC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const payment = await tx.payment.create({
        data: {
          schoolId: invoice.schoolId,
          studentId: invoice.studentId,
          receiptNumber,
          method: dto.method,
          status: PaymentStatus.SUCCEEDED,
          amountMinor: dto.amountMinor,
          currency: invoice.currency,
          reference: dto.reference,
          idempotencyKey: dto.idempotencyKey,
          paidAt: new Date(),
        },
      });

      await tx.paymentAllocation.create({
        data: {
          paymentId: payment.id,
          invoiceId: invoice.id,
          amountMinor: dto.amountMinor,
        },
      });

      const newBalanceMinor = invoice.balanceMinor - dto.amountMinor;
      const newPaidMinor = invoice.paidMinor + dto.amountMinor;
      const newStatus =
        newBalanceMinor === 0 ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID;

      const updatedInvoice = await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          balanceMinor: newBalanceMinor,
          paidMinor: newPaidMinor,
          status: newStatus,
        },
      });

      return {
        payment,
        invoice: updatedInvoice,
      };
    });
  }

  // --- Summary KPIs ---
  async getSummary(organizationId: string, schoolId?: string) {
    const where: Prisma.InvoiceWhereInput = {
      school: {
        organizationId,
        ...(schoolId ? { id: schoolId } : {}),
      },
    };

    const invoices = await this.prisma.invoice.findMany({
      where,
      select: {
        totalMinor: true,
        balanceMinor: true,
        status: true,
        dueDate: true,
        currency: true,
      },
    });

    const now = new Date();
    let totalInvoicedMinor = 0;
    let totalOutstandingMinor = 0;
    let overdueCount = 0;
    const currency = invoices[0]?.currency ?? 'ETB';

    for (const inv of invoices) {
      totalInvoicedMinor += inv.totalMinor;
      totalOutstandingMinor += inv.balanceMinor;
      if (inv.balanceMinor > 0 && inv.dueDate && new Date(inv.dueDate) < now) {
        overdueCount += 1;
      }
    }

    const totalCollectedMinor = totalInvoicedMinor - totalOutstandingMinor;
    const collectionRate =
      totalInvoicedMinor > 0
        ? Math.round((totalCollectedMinor / totalInvoicedMinor) * 100)
        : 0;

    return {
      currency,
      totalInvoicedMinor,
      totalCollectedMinor,
      totalOutstandingMinor,
      collectionRate,
      totalInvoicesCount: invoices.length,
      overdueCount,
    };
  }
}

import { Injectable, HttpStatus } from '@nestjs/common';
import { BookStatus, LoanStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { DomainException, NotFoundException } from '../../common/exceptions/domain.exception';
import { paginate } from '../../common/pagination/pagination.dto';
import {
  CheckoutBookDto,
  CreateBookDto,
  LibraryQueryDto,
  LoanQueryDto,
  ReturnBookDto,
} from './dto/library.dto';

@Injectable()
export class LibraryService {
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

  async createBook(organizationId: string, dto: CreateBookDto) {
    await this.assertSchoolInOrganization(dto.schoolId, organizationId);

    return this.prisma.$transaction(async (tx) => {
      const book = await tx.book.create({
        data: {
          schoolId: dto.schoolId,
          title: dto.title,
          author: dto.author,
          isbn: dto.isbn,
          publisher: dto.publisher,
          publishedYear: dto.publishedYear,
          category: dto.category,
        },
      });

      const copiesData = Array.from({ length: dto.copiesCount }).map((_, idx) => ({
        bookId: book.id,
        barcode: `${dto.isbn ?? 'BK'}-${book.id.slice(0, 4)}-${Date.now()}-${idx + 1}`,
        status: BookStatus.AVAILABLE,
      }));

      await tx.bookCopy.createMany({ data: copiesData });

      return book;
    });
  }

  async getBooks(organizationId: string, query: LibraryQueryDto) {
    const skip = (query.page - 1) * query.pageSize;
    const take = query.pageSize;
    const schoolIds = await this.getOrganizationSchoolIds(organizationId);

    const where: Prisma.BookWhereInput = {
      schoolId: query.schoolId ? query.schoolId : { in: schoolIds },
      ...(query.category ? { category: query.category } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { author: { contains: query.search, mode: 'insensitive' } },
              { isbn: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const total = await this.prisma.book.count({ where });
    const data = await this.prisma.book.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        copies: { select: { id: true, barcode: true, status: true } },
        _count: { select: { copies: true } },
      },
    });

    return paginate(data, total, query.page, query.pageSize);
  }

  async checkoutBook(organizationId: string, dto: CheckoutBookDto) {
    const schoolIds = await this.getOrganizationSchoolIds(organizationId);
    const book = await this.prisma.book.findFirst({
      where: { id: dto.bookId, schoolId: { in: schoolIds } },
      include: {
        copies: {
          where: { status: BookStatus.AVAILABLE },
          take: 1,
        },
      },
    });

    if (!book) {
      throw new NotFoundException('Book', dto.bookId);
    }

    if (book.copies.length === 0) {
      throw new DomainException('NO_COPIES_AVAILABLE', 'No available copies of this book to loan', HttpStatus.CONFLICT);
    }

    const availableCopy = book.copies[0];

    return this.prisma.$transaction(async (tx) => {
      await tx.bookCopy.update({
        where: { id: availableCopy.id },
        data: { status: BookStatus.ON_LOAN },
      });

      return tx.loan.create({
        data: {
          bookCopyId: availableCopy.id,
          studentId: dto.studentId,
          dueAt: new Date(dto.dueAt),
          status: LoanStatus.ACTIVE,
        },
      });
    });
  }

  async returnBook(organizationId: string, loanId: string, dto: ReturnBookDto) {
    const schoolIds = await this.getOrganizationSchoolIds(organizationId);
    const loan = await this.prisma.loan.findFirst({
      where: {
        id: loanId,
        bookCopy: { book: { schoolId: { in: schoolIds } } },
      },
      include: { bookCopy: true },
    });

    if (!loan) {
      throw new NotFoundException('Loan', loanId);
    }

    if (loan.status === LoanStatus.RETURNED) {
      throw new DomainException('ALREADY_RETURNED', 'This loan is already returned', HttpStatus.BAD_REQUEST);
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.bookCopy.update({
        where: { id: loan.bookCopyId },
        data: { status: BookStatus.AVAILABLE },
      });

      return tx.loan.update({
        where: { id: loan.id },
        data: {
          status: LoanStatus.RETURNED,
          returnedAt: new Date(),
          fineMinor: dto.fineMinor ?? 0,
        },
      });
    });
  }

  async getLoans(organizationId: string, query: LoanQueryDto) {
    const skip = (query.page - 1) * query.pageSize;
    const take = query.pageSize;
    const schoolIds = await this.getOrganizationSchoolIds(organizationId);

    const where: Prisma.LoanWhereInput = {
      bookCopy: {
        book: {
          schoolId: query.schoolId ? query.schoolId : { in: schoolIds },
        },
      },
      ...(query.status ? { status: query.status } : {}),
    };

    const total = await this.prisma.loan.count({ where });
    const data = await this.prisma.loan.findMany({
      where,
      skip,
      take,
      orderBy: { borrowedAt: 'desc' },
      include: {
        bookCopy: {
          include: {
            book: { select: { title: true, author: true } },
          },
        },
        student: { select: { studentNumber: true, firstName: true, lastName: true } },
      },
    });

    return paginate(data, total, query.page, query.pageSize);
  }
}

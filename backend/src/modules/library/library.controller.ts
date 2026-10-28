import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ActiveTenant, TenantContext } from '../../common/decorators/active-tenant.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../common/constants/permissions';
import { Audit } from '../audit/audit.decorator';
import { LibraryService } from './library.service';
import {
  CheckoutBookDto,
  CreateBookDto,
  LibraryQueryDto,
  LoanQueryDto,
  ReturnBookDto,
} from './dto/library.dto';

@ApiTags('library')
@ApiBearerAuth()
@Controller('library')
export class LibraryController {
  constructor(private readonly library: LibraryService) {}

  @Post('books')
  @RequirePermissions(PERMISSIONS.LIBRARY_MANAGE)
  @Audit('library.create_book', 'Book')
  createBook(@ActiveTenant() tenant: TenantContext, @Body() dto: CreateBookDto) {
    return this.library.createBook(tenant.organizationId, dto);
  }

  @Get('books')
  @RequirePermissions(PERMISSIONS.LIBRARY_READ)
  getBooks(@ActiveTenant() tenant: TenantContext, @Query() query: LibraryQueryDto) {
    return this.library.getBooks(tenant.organizationId, query);
  }

  @Post('loans')
  @RequirePermissions(PERMISSIONS.LIBRARY_MANAGE)
  @Audit('library.checkout', 'Loan')
  checkout(@ActiveTenant() tenant: TenantContext, @Body() dto: CheckoutBookDto) {
    return this.library.checkoutBook(tenant.organizationId, dto);
  }

  @Post('loans/:id/return')
  @RequirePermissions(PERMISSIONS.LIBRARY_MANAGE)
  @Audit('library.return', 'Loan')
  returnBook(
    @ActiveTenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ReturnBookDto,
  ) {
    return this.library.returnBook(tenant.organizationId, id, dto);
  }

  @Get('loans')
  @RequirePermissions(PERMISSIONS.LIBRARY_READ)
  getLoans(@ActiveTenant() tenant: TenantContext, @Query() query: LoanQueryDto) {
    return this.library.getLoans(tenant.organizationId, query);
  }
}

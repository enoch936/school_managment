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
import { FinanceService } from './finance.service';
import {
  CreateFeeStructureDto,
  CreateInvoiceDto,
  FinanceQueryDto,
  RecordPaymentDto,
} from './dto/finance.dto';

@ApiTags('finance')
@ApiBearerAuth()
@Controller('finance')
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  @Get('summary')
  @RequirePermissions(PERMISSIONS.INVOICE_READ)
  getSummary(
    @ActiveTenant() tenant: TenantContext,
    @Query('schoolId') schoolId?: string,
  ) {
    return this.finance.getSummary(tenant.organizationId, schoolId);
  }

  @Post('fee-structures')
  @RequirePermissions(PERMISSIONS.FEE_MANAGE)
  @Audit('fee_structure.create', 'FeeStructure')
  createFeeStructure(
    @ActiveTenant() tenant: TenantContext,
    @Body() dto: CreateFeeStructureDto,
  ) {
    return this.finance.createFeeStructure(tenant.organizationId, dto);
  }

  @Get('fee-structures')
  @RequirePermissions(PERMISSIONS.FEE_READ)
  getFeeStructures(
    @ActiveTenant() tenant: TenantContext,
    @Query('schoolId') schoolId?: string,
  ) {
    return this.finance.getFeeStructures(tenant.organizationId, schoolId);
  }

  @Post('invoices')
  @RequirePermissions(PERMISSIONS.INVOICE_MANAGE)
  @Audit('invoice.create', 'Invoice')
  createInvoice(
    @ActiveTenant() tenant: TenantContext,
    @Body() dto: CreateInvoiceDto,
  ) {
    return this.finance.createInvoice(tenant.organizationId, dto);
  }

  @Get('invoices')
  @RequirePermissions(PERMISSIONS.INVOICE_READ)
  getInvoices(
    @ActiveTenant() tenant: TenantContext,
    @Query() query: FinanceQueryDto,
  ) {
    return this.finance.getInvoices(tenant.organizationId, query);
  }

  @Get('invoices/:id')
  @RequirePermissions(PERMISSIONS.INVOICE_READ)
  getInvoiceById(
    @ActiveTenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.finance.getInvoiceById(tenant.organizationId, id);
  }

  @Post('payments')
  @RequirePermissions(PERMISSIONS.PAYMENT_MANAGE)
  @Audit('payment.record', 'Payment')
  recordPayment(
    @ActiveTenant() tenant: TenantContext,
    @Body() dto: RecordPaymentDto,
  ) {
    return this.finance.recordPayment(tenant.organizationId, dto);
  }
}

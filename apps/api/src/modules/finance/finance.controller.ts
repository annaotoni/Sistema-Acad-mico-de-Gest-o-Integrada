import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Request } from 'express';
import type { AccessTokenPayload } from '../../common/interfaces/access-token-payload';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { FeatureGuard } from '../../common/guards/feature.guard';
import { RoleGuard } from '../../common/guards/role.guard';
import { FinanceService } from './finance.service';
import { CreateInvoiceSchema } from './dto/create-invoice.dto';
import { ManualPaymentSchema } from './dto/manual-payment.dto';

@Controller('finance')
@UseGuards(FeatureGuard, RoleGuard)
@RequireFeature('financeiro')
export class FinanceController {
  constructor(private readonly service: FinanceService) {}

  private user(req: Request): AccessTokenPayload {
    return (req as unknown as { user: AccessTokenPayload }).user;
  }

  @Post('invoices')
  @Roles(Role.ADMIN, Role.SECRETARIA)
  createInvoice(@Body() body: unknown, @Req() req: Request) {
    const parsed = CreateInvoiceSchema.safeParse(body);
    if (!parsed.success)
      throw new UnprocessableEntityException(parsed.error.flatten());
    return this.service.createInvoice(parsed.data, this.user(req));
  }

  @Get('invoices')
  listInvoices(@Req() req: Request) {
    return this.service.listInvoices(this.user(req));
  }

  @Get('invoices/:id')
  getInvoice(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.service.getInvoice(id, this.user(req));
  }

  @Post('invoices/:id/pix')
  generatePix(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.service.generatePix(id, this.user(req));
  }

  @Post('invoices/:id/boleto')
  generateBoleto(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.service.generateBoleto(id, this.user(req));
  }

  @Post('invoices/:id/manual-payment')
  @Roles(Role.ADMIN, Role.SECRETARIA)
  recordManualPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    const parsed = ManualPaymentSchema.safeParse(body);
    if (!parsed.success)
      throw new UnprocessableEntityException(parsed.error.flatten());
    return this.service.recordManualPayment(id, parsed.data, this.user(req));
  }
}

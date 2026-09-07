import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InvoiceStatus, PaymentMethod, Prisma, Role } from '@prisma/client';
import type { AccessTokenPayload } from '../../common/interfaces/access-token-payload';
import { AuditService } from '../../common/audit/audit.service';
import type { IPaymentGateway } from '../../integrations/payment/payment-gateway.interface';
import { PAYMENT_GATEWAY } from '../../integrations/payment/payment-gateway.interface';
import { NotificationsService } from '../notifications/notifications.service';
import { NOTIFICATION_EVENTS } from '../notifications/notifications-events';
import { FinanceRepository } from './finance.repository';
import type { CreateInvoiceDto } from './dto/create-invoice.dto';
import type { ManualPaymentDto } from './dto/manual-payment.dto';

@Injectable()
export class FinanceService {
  constructor(
    private readonly repo: FinanceRepository,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: IPaymentGateway,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async createInvoice(dto: CreateInvoiceDto, _actor: AccessTokenPayload) {
    return this.repo.createInvoice({
      studentId: dto.studentId,
      classId: dto.classId,
      description: dto.description,
      amount: dto.amount,
      dueDate: new Date(dto.dueDate),
    });
  }

  async listInvoices(user: AccessTokenPayload) {
    if (user.role === Role.ALUNO) {
      return this.repo.findInvoicesByStudent(user.sub);
    }
    if (!user.tenantId) throw new ForbiddenException();
    return this.repo.findInvoicesByTenant(user.tenantId);
  }

  async getInvoice(id: string, user: AccessTokenPayload) {
    const invoice = await this.repo.findInvoiceById(id);
    if (!invoice) throw new NotFoundException('Fatura não encontrada');
    // Aluno só vê as próprias faturas
    if (user.role === Role.ALUNO && invoice.studentId !== user.sub) {
      throw new ForbiddenException();
    }
    return invoice;
  }

  async generatePix(invoiceId: string, user: AccessTokenPayload) {
    const invoice = await this.getInvoice(invoiceId, user);
    if (invoice.status !== InvoiceStatus.PENDENTE) {
      throw new BadRequestException('Fatura não está pendente');
    }

    const result = await this.gateway.createPixCharge({
      gatewayCustomerId: invoice.studentId,
      value: Number(invoice.amount),
      dueDate: invoice.dueDate.toISOString().split('T')[0],
      description: invoice.description,
    });

    await this.repo.updateInvoiceGatewayId(invoiceId, result.gatewayId);

    await this.notifications.publish({
      type: NOTIFICATION_EVENTS.BOLETO_DISPONIVEL,
      userId: invoice.studentId,
      title: 'Cobrança Pix disponível',
      body: `Seu Pix para "${invoice.description}" está disponível.`,
    });

    return result;
  }

  async generateBoleto(invoiceId: string, user: AccessTokenPayload) {
    const invoice = await this.getInvoice(invoiceId, user);
    if (invoice.status !== InvoiceStatus.PENDENTE) {
      throw new BadRequestException('Fatura não está pendente');
    }

    const result = await this.gateway.createBoleto({
      gatewayCustomerId: invoice.studentId,
      value: Number(invoice.amount),
      dueDate: invoice.dueDate.toISOString().split('T')[0],
      description: invoice.description,
    });

    await this.repo.updateInvoiceGatewayId(invoiceId, result.gatewayId);

    await this.notifications.publish({
      type: NOTIFICATION_EVENTS.BOLETO_DISPONIVEL,
      userId: invoice.studentId,
      title: 'Boleto disponível',
      body: `Seu boleto para "${invoice.description}" está disponível.`,
    });

    return result;
  }

  // Baixa manual: restrita a ADMIN/SECRETARIA, sempre auditada
  async recordManualPayment(
    invoiceId: string,
    dto: ManualPaymentDto,
    actor: AccessTokenPayload,
  ) {
    const invoice = await this.repo.findInvoiceById(invoiceId);
    if (!invoice) throw new NotFoundException('Fatura não encontrada');
    if (invoice.status === InvoiceStatus.PAGO) {
      throw new BadRequestException('Fatura já paga');
    }

    const payment = await this.repo.recordManualPaymentAtomic({
      invoiceId,
      paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),
      method: dto.method,
      amount: dto.amount,
      gatewayPayload: { manual: true, notes: dto.notes ?? null },
    });

    await this.audit.log({
      entity: 'Invoice',
      entityId: invoiceId,
      userId: actor.sub,
      action: 'MANUAL_PAYMENT',
      oldValue: { status: invoice.status },
      newValue: { status: InvoiceStatus.PAGO, method: dto.method },
    });

    await this.notifications.publish({
      type: NOTIFICATION_EVENTS.PAGAMENTO_CONFIRMADO,
      userId: invoice.studentId,
      title: 'Pagamento registrado',
      body: `Seu pagamento de "${invoice.description}" foi registrado.`,
    });

    return payment;
  }

  // Chamado pelo webhook — única via automática de marcar PAGO
  async confirmPaymentFromWebhook(data: {
    gatewayId: string;
    method: PaymentMethod;
    amount: number;
    paidAt: Date;
    rawPayload: unknown;
  }) {
    const invoice = await this.repo.findInvoiceByGatewayId(data.gatewayId);
    if (!invoice || invoice.status === InvoiceStatus.PAGO) return;

    const confirmed = await this.repo.confirmPaymentAtomic({
      invoiceId: invoice.id,
      paidAt: data.paidAt,
      method: data.method,
      amount: data.amount,
      gatewayPayload: data.rawPayload as Prisma.InputJsonValue,
    });

    if (!confirmed) return;

    await this.notifications.publish({
      type: NOTIFICATION_EVENTS.PAGAMENTO_CONFIRMADO,
      userId: invoice.studentId,
      title: 'Pagamento confirmado',
      body: `Seu pagamento de "${invoice.description}" foi confirmado.`,
    });
  }

  // Chamado pelo job diário
  async markOverdueInvoices() {
    const overdue = await this.repo.findOverdueInvoices();
    if (!overdue.length) return { marked: 0 };

    await this.repo.markInvoicesOverdue(overdue.map((i) => i.id));

    await Promise.all(
      overdue.map((invoice) =>
        this.notifications.publish({
          type: NOTIFICATION_EVENTS.PAGAMENTO_VENCIDO,
          userId: invoice.studentId,
          title: 'Fatura vencida',
          body: `Sua fatura "${invoice.description}" venceu. Regularize para evitar bloqueio.`,
        }),
      ),
    );

    return { marked: overdue.length };
  }
}

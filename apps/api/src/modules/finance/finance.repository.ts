import { Injectable } from '@nestjs/common';
import { InvoiceStatus, PaymentMethod, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FinanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  createInvoice(data: {
    studentId: string;
    classId?: string;
    description: string;
    amount: number;
    dueDate: Date;
  }) {
    return this.prisma.invoice.create({ data });
  }

  findInvoiceById(id: string) {
    return this.prisma.invoice.findUnique({
      where: { id },
      include: { payments: true },
    });
  }

  findInvoicesByStudent(studentId: string) {
    return this.prisma.invoice.findMany({
      where: { studentId },
      orderBy: { dueDate: 'asc' },
      include: { payments: true },
    });
  }

  findInvoicesByTenant(tenantId: string) {
    return this.prisma.invoice.findMany({
      where: { student: { tenantId } },
      orderBy: { dueDate: 'asc' },
      include: { student: { select: { id: true, email: true } } },
    });
  }

  updateInvoiceStatus(id: string, status: InvoiceStatus, gatewayId?: string) {
    return this.prisma.invoice.update({
      where: { id },
      data: { status, ...(gatewayId ? { gatewayId } : {}) },
    });
  }

  updateInvoiceGatewayId(id: string, gatewayId: string) {
    return this.prisma.invoice.update({ where: { id }, data: { gatewayId } });
  }

  createPayment(data: {
    invoiceId: string;
    paidAt: Date;
    method: PaymentMethod;
    amount: Prisma.Decimal | number;
    gatewayPayload: Prisma.InputJsonValue;
  }) {
    return this.prisma.payment.create({ data });
  }

  // Faturas vencidas para o job diário: PENDENTE com dueDate < hoje
  findOverdueInvoices() {
    return this.prisma.invoice.findMany({
      where: {
        status: InvoiceStatus.PENDENTE,
        dueDate: { lt: new Date() },
      },
      include: { student: { select: { id: true, email: true } } },
    });
  }

  // Busca por gatewayId — webhook de confirmação de pagamento
  findInvoiceByGatewayId(gatewayId: string) {
    return this.prisma.invoice.findFirst({ where: { gatewayId } });
  }

  // Cria pagamento + marca fatura como PAGO em transação atômica — elimina race em retry do gateway
  async confirmPaymentAtomic(data: {
    invoiceId: string;
    paidAt: Date;
    method: PaymentMethod;
    amount: number;
    gatewayPayload: Prisma.InputJsonValue;
  }): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { id: data.invoiceId },
        select: { status: true },
      });
      if (invoice?.status === InvoiceStatus.PAGO) return false;

      const { invoiceId, ...paymentData } = data;
      await tx.payment.create({ data: { invoiceId, ...paymentData } });
      await tx.invoice.update({
        where: { id: invoiceId },
        data: { status: InvoiceStatus.PAGO },
      });
      return true;
    });
  }

  // Baixa manual: pagamento + status em transação — garante consistência do ledger
  async recordManualPaymentAtomic(data: {
    invoiceId: string;
    paidAt: Date;
    method: PaymentMethod;
    amount: Prisma.Decimal | number;
    gatewayPayload: Prisma.InputJsonValue;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const { invoiceId, ...paymentData } = data;
      const payment = await tx.payment.create({
        data: { invoiceId, ...paymentData },
      });
      await tx.invoice.update({
        where: { id: invoiceId },
        data: { status: InvoiceStatus.PAGO },
      });
      return payment;
    });
  }

  markInvoicesOverdue(ids: string[]) {
    return this.prisma.invoice.updateMany({
      where: { id: { in: ids }, status: InvoiceStatus.PENDENTE },
      data: { status: InvoiceStatus.VENCIDO },
    });
  }
}

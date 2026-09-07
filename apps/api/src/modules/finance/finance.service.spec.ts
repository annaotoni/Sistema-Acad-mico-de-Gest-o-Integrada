import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InvoiceStatus, PaymentMethod, Role } from '@prisma/client';
import { FinanceService } from './finance.service';

const mockRepo = {
  createInvoice: jest.fn(),
  findInvoiceById: jest.fn(),
  findInvoicesByStudent: jest.fn(),
  findInvoicesByTenant: jest.fn(),
  updateInvoiceStatus: jest.fn(),
  updateInvoiceGatewayId: jest.fn(),
  createPayment: jest.fn(),
  findOverdueInvoices: jest.fn(),
  findInvoiceByGatewayId: jest.fn(),
  markInvoicesOverdue: jest.fn(),
  confirmPaymentAtomic: jest.fn(),
  recordManualPaymentAtomic: jest.fn(),
};

const mockGateway = {
  createPixCharge: jest.fn(),
  createBoleto: jest.fn(),
};

const mockAudit = { log: jest.fn() };
const mockNotifications = { publish: jest.fn() };

const makeService = () =>
  new FinanceService(
    mockRepo as any,
    mockGateway,
    mockAudit as any,
    mockNotifications as any,
  );

const adminUser = {
  sub: 'admin-1',
  role: Role.ADMIN,
  tenantId: 'tenant-1',
  jti: '',
  iat: 0,
  exp: 0,
};
const alunoUser = {
  sub: 'aluno-1',
  role: Role.ALUNO,
  tenantId: 'tenant-1',
  jti: '',
  iat: 0,
  exp: 0,
};

const pendingInvoice = {
  id: 'inv-1',
  studentId: 'aluno-1',
  description: 'Mensalidade',
  amount: { toString: () => '500' },
  dueDate: new Date('2025-12-31'),
  status: InvoiceStatus.PENDENTE,
  payments: [],
};

beforeEach(() => jest.clearAllMocks());

describe('listInvoices', () => {
  it('aluno só vê as próprias faturas', async () => {
    mockRepo.findInvoicesByStudent.mockResolvedValue([pendingInvoice]);
    const svc = makeService();
    await svc.listInvoices(alunoUser);
    expect(mockRepo.findInvoicesByStudent).toHaveBeenCalledWith('aluno-1');
    expect(mockRepo.findInvoicesByTenant).not.toHaveBeenCalled();
  });

  it('admin sem tenantId lança ForbiddenException', async () => {
    const svc = makeService();
    await expect(
      svc.listInvoices({ ...adminUser, tenantId: null }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('getInvoice', () => {
  it('aluno não vê fatura de outro aluno', async () => {
    mockRepo.findInvoiceById.mockResolvedValue({
      ...pendingInvoice,
      studentId: 'outro-aluno',
    });
    await expect(
      makeService().getInvoice('inv-1', alunoUser),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('lança NotFoundException se não existir', async () => {
    mockRepo.findInvoiceById.mockResolvedValue(null);
    await expect(
      makeService().getInvoice('inv-x', adminUser),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('generatePix', () => {
  it('rejeita fatura já paga', async () => {
    mockRepo.findInvoiceById.mockResolvedValue({
      ...pendingInvoice,
      status: InvoiceStatus.PAGO,
    });
    await expect(
      makeService().generatePix('inv-1', adminUser),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('chama gateway e retorna resultado', async () => {
    mockRepo.findInvoiceById.mockResolvedValue(pendingInvoice);
    mockGateway.createPixCharge.mockResolvedValue({
      gatewayId: 'gw-1',
      qrCode: 'qr',
      copyPaste: 'cp',
      expiresAt: new Date(),
    });
    mockRepo.updateInvoiceGatewayId.mockResolvedValue({});
    mockNotifications.publish.mockResolvedValue(undefined);

    const result = await makeService().generatePix('inv-1', adminUser);
    expect(result.gatewayId).toBe('gw-1');
    expect(mockRepo.updateInvoiceGatewayId).toHaveBeenCalledWith(
      'inv-1',
      'gw-1',
    );
  });
});

describe('recordManualPayment', () => {
  it('rejeita fatura já paga', async () => {
    mockRepo.findInvoiceById.mockResolvedValue({
      ...pendingInvoice,
      status: InvoiceStatus.PAGO,
    });
    await expect(
      makeService().recordManualPayment(
        'inv-1',
        { method: 'PIX', amount: 500 },
        adminUser,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('cria pagamento e gera AuditLog', async () => {
    mockRepo.findInvoiceById.mockResolvedValue(pendingInvoice);
    mockRepo.recordManualPaymentAtomic.mockResolvedValue({ id: 'pay-1' });
    mockAudit.log.mockResolvedValue({});
    mockNotifications.publish.mockResolvedValue(undefined);

    await makeService().recordManualPayment(
      'inv-1',
      { method: 'PIX', amount: 500 },
      adminUser,
    );
    expect(mockAudit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'MANUAL_PAYMENT' }),
    );
  });
});

describe('markOverdueInvoices', () => {
  it('não faz nada se não há vencidas', async () => {
    mockRepo.findOverdueInvoices.mockResolvedValue([]);
    const result = await makeService().markOverdueInvoices();
    expect(result).toEqual({ marked: 0 });
    expect(mockRepo.markInvoicesOverdue).not.toHaveBeenCalled();
  });

  it('marca como VENCIDO e notifica', async () => {
    const overdue = [{ ...pendingInvoice, studentId: 'aluno-1' }];
    mockRepo.findOverdueInvoices.mockResolvedValue(overdue);
    mockRepo.markInvoicesOverdue.mockResolvedValue({ count: 1 });
    mockNotifications.publish.mockResolvedValue(undefined);

    const result = await makeService().markOverdueInvoices();
    expect(result).toEqual({ marked: 1 });
    expect(mockNotifications.publish).toHaveBeenCalledTimes(1);
  });
});

describe('confirmPaymentFromWebhook', () => {
  it('ignora se invoice já está PAGO', async () => {
    mockRepo.findInvoiceByGatewayId.mockResolvedValue({
      ...pendingInvoice,
      status: InvoiceStatus.PAGO,
    });
    await makeService().confirmPaymentFromWebhook({
      gatewayId: 'gw-1',
      method: PaymentMethod.PIX,
      amount: 500,
      paidAt: new Date(),
      rawPayload: {},
    });
    expect(mockRepo.createPayment).not.toHaveBeenCalled();
  });

  it('cria Payment e marca PAGO', async () => {
    mockRepo.findInvoiceByGatewayId.mockResolvedValue(pendingInvoice);
    mockRepo.confirmPaymentAtomic.mockResolvedValue(true);
    mockNotifications.publish.mockResolvedValue(undefined);

    await makeService().confirmPaymentFromWebhook({
      gatewayId: 'gw-1',
      method: PaymentMethod.PIX,
      amount: 500,
      paidAt: new Date(),
      rawPayload: {},
    });
    expect(mockRepo.confirmPaymentAtomic).toHaveBeenCalledWith(
      expect.objectContaining({ invoiceId: 'inv-1' }),
    );
  });
});

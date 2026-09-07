import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PaymentMethod } from '@prisma/client';
import { WebhooksController } from './webhooks.controller';

const TOKEN = 'a'.repeat(32);

const mockFinance = { confirmPaymentFromWebhook: jest.fn() };
const mockConfig = { getOrThrow: jest.fn().mockReturnValue(TOKEN) };

const makeController = () =>
  new WebhooksController(mockFinance as never, mockConfig as never);

const validBody = {
  event: 'PAYMENT_RECEIVED',
  payment: {
    id: 'pay_123',
    value: 150.0,
    billingType: 'PIX',
    confirmedDate: '2024-09-01',
  },
};

beforeEach(() => jest.clearAllMocks());

describe('handlePayment', () => {
  it('rejeita token ausente', async () => {
    await expect(
      makeController().handlePayment(undefined as never, validBody),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejeita token inválido', async () => {
    await expect(
      makeController().handlePayment('token-errado', validBody),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejeita payload malformado', async () => {
    await expect(
      makeController().handlePayment(TOKEN, { event: 123 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('ignora eventos que não são de pagamento', async () => {
    const result = await makeController().handlePayment(TOKEN, {
      event: 'PAYMENT_CREATED',
    });
    expect(result).toEqual({ ignored: true });
    expect(mockFinance.confirmPaymentFromWebhook).not.toHaveBeenCalled();
  });

  it('ignora evento sem objeto payment', async () => {
    const result = await makeController().handlePayment(TOKEN, {
      event: 'PAYMENT_RECEIVED',
    });
    expect(result).toEqual({ ignored: true });
  });

  it('processa PAYMENT_RECEIVED com PIX corretamente', async () => {
    mockFinance.confirmPaymentFromWebhook.mockResolvedValue(undefined);
    const result = await makeController().handlePayment(TOKEN, validBody);
    expect(result).toEqual({ ok: true });
    expect(mockFinance.confirmPaymentFromWebhook).toHaveBeenCalledWith(
      expect.objectContaining({
        gatewayId: 'pay_123',
        method: PaymentMethod.PIX,
        amount: 150.0,
      }),
    );
  });

  it('processa PAYMENT_CONFIRMED com BOLETO corretamente', async () => {
    mockFinance.confirmPaymentFromWebhook.mockResolvedValue(undefined);
    const result = await makeController().handlePayment(TOKEN, {
      ...validBody,
      event: 'PAYMENT_CONFIRMED',
      payment: { ...validBody.payment, billingType: 'BOLETO' },
    });
    expect(result).toEqual({ ok: true });
    expect(mockFinance.confirmPaymentFromWebhook).toHaveBeenCalledWith(
      expect.objectContaining({ method: PaymentMethod.BOLETO }),
    );
  });

  it('propaga erro do finance service', async () => {
    mockFinance.confirmPaymentFromWebhook.mockRejectedValue(
      new Error('DB error'),
    );
    await expect(
      makeController().handlePayment(TOKEN, validBody),
    ).rejects.toThrow('DB error');
  });
});

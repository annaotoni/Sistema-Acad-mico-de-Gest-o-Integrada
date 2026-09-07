import { timingSafeEqual } from 'crypto';
import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentMethod } from '@prisma/client';
import { z } from 'zod';
import { FinanceService } from '../modules/finance/finance.service';

const PaymentWebhookSchema = z.object({
  event: z.string(),
  payment: z
    .object({
      id: z.string(),
      value: z.number(),
      billingType: z.string(),
      confirmedDate: z.string().optional(),
    })
    .optional(),
});

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);
  private readonly asaasToken: string;

  constructor(
    private readonly finance: FinanceService,
    config: ConfigService,
  ) {
    this.asaasToken = config.getOrThrow<string>('ASAAS_WEBHOOK_TOKEN');
  }

  @Post('pagamentos')
  @HttpCode(HttpStatus.OK)
  async handlePayment(
    @Headers('asaas-access-token') token: string,
    @Body() body: Record<string, unknown>,
  ) {
    // Webhook sem autenticação de sessão — valida apenas assinatura do gateway
    const tokenBuf = Buffer.from(token ?? '');
    const expectedBuf = Buffer.from(this.asaasToken);
    if (
      !token ||
      tokenBuf.length !== expectedBuf.length ||
      !timingSafeEqual(tokenBuf, expectedBuf)
    ) {
      this.logger.warn('Webhook rejeitado: token inválido ou ausente');
      throw new UnauthorizedException();
    }

    const parsed = PaymentWebhookSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('Payload de webhook inválido');
    }

    const { event, payment } = parsed.data;

    if (event !== 'PAYMENT_RECEIVED' && event !== 'PAYMENT_CONFIRMED') {
      return { ignored: true };
    }

    if (!payment) return { ignored: true };

    const method: PaymentMethod =
      payment.billingType === 'BOLETO'
        ? PaymentMethod.BOLETO
        : PaymentMethod.PIX;

    await this.finance.confirmPaymentFromWebhook({
      gatewayId: payment.id,
      method,
      amount: payment.value,
      paidAt: new Date(payment.confirmedDate ?? new Date()),
      rawPayload: body,
    });

    return { ok: true };
  }
}

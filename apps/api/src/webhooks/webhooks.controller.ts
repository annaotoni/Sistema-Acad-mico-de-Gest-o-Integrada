import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentMethod } from '@prisma/client';
import { FinanceService } from '../modules/finance/finance.service';

@Controller('webhooks')
export class WebhooksController {
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
    if (token !== this.asaasToken) throw new UnauthorizedException();

    const event = body['event'] as string | undefined;
    if (event !== 'PAYMENT_RECEIVED' && event !== 'PAYMENT_CONFIRMED') {
      return { ignored: true };
    }

    const payment = body['payment'] as Record<string, unknown> | undefined;
    if (!payment) return { ignored: true };

    const billingType = String(payment['billingType'] ?? '');
    const method: PaymentMethod = billingType === 'BOLETO' ? PaymentMethod.BOLETO : PaymentMethod.PIX;

    await this.finance.confirmPaymentFromWebhook({
      gatewayId: String(payment['id'] ?? ''),
      method,
      amount: Number(payment['value'] ?? 0),
      paidAt: new Date(String(payment['confirmedDate'] ?? new Date())),
      rawPayload: body,
    });

    return { ok: true };
  }
}

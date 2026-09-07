import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  BoletoResult,
  IPaymentGateway,
  PaymentChargeInput,
  PixChargeResult,
} from './payment-gateway.interface';

@Injectable()
export class AsaasGateway implements IPaymentGateway {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = config.getOrThrow<string>('ASAAS_BASE_URL');
    this.apiKey = config.getOrThrow<string>('ASAAS_API_KEY');
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        access_token: this.apiKey,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      throw new InternalServerErrorException(
        `Asaas API error ${res.status}: ${await res.text()}`,
      );
    }

    return res.json() as Promise<T>;
  }

  async createPixCharge(input: PaymentChargeInput): Promise<PixChargeResult> {
    const payment = await this.request<{ id: string }>('POST', '/payments', {
      ...input,
      billingType: 'PIX',
    });

    const qr = await this.request<{
      encodedImage: string;
      payload: string;
      expirationDate: string;
    }>('GET', `/payments/${payment.id}/pixQrCode`);

    return {
      gatewayId: payment.id,
      qrCode: qr.encodedImage,
      copyPaste: qr.payload,
      expiresAt: new Date(qr.expirationDate),
    };
  }

  async createBoleto(input: PaymentChargeInput): Promise<BoletoResult> {
    const payment = await this.request<{ id: string }>('POST', '/payments', {
      ...input,
      billingType: 'BOLETO',
    });

    const slip = await this.request<{
      bankSlipUrl: string;
      identificationField: string;
      expirationDate: string;
    }>('GET', `/payments/${payment.id}/identificationField`);

    return {
      gatewayId: payment.id,
      digitableLine: slip.identificationField,
      barcodeUrl: slip.bankSlipUrl,
      pdfUrl: slip.bankSlipUrl,
      expiresAt: new Date(slip.expirationDate),
    };
  }
}

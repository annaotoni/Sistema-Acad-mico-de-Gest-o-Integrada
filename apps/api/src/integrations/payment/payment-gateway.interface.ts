export interface PixChargeResult {
  gatewayId: string;
  qrCode: string;
  copyPaste: string;
  expiresAt: Date;
}

export interface BoletoResult {
  gatewayId: string;
  digitableLine: string;
  barcodeUrl: string;
  pdfUrl: string;
  expiresAt: Date;
}

export interface PaymentChargeInput {
  gatewayCustomerId: string;
  value: number;
  dueDate: string; // YYYY-MM-DD
  description: string;
}

export const PAYMENT_GATEWAY = 'PAYMENT_GATEWAY';

export interface IPaymentGateway {
  createPixCharge(input: PaymentChargeInput): Promise<PixChargeResult>;
  createBoleto(input: PaymentChargeInput): Promise<BoletoResult>;
}

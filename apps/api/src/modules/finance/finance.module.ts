import { Module } from '@nestjs/common';
import { PAYMENT_GATEWAY } from '../../integrations/payment/payment-gateway.interface';
import { AsaasGateway } from '../../integrations/payment/asaas.gateway';
import { NotificationsModule } from '../notifications/notifications.module';
import { FinanceRepository } from './finance.repository';
import { FinanceService } from './finance.service';
import { FinanceController } from './finance.controller';

@Module({
  imports: [NotificationsModule],
  controllers: [FinanceController],
  providers: [
    FinanceRepository,
    FinanceService,
    { provide: PAYMENT_GATEWAY, useClass: AsaasGateway },
  ],
  exports: [FinanceService],
})
export class FinanceModule {}

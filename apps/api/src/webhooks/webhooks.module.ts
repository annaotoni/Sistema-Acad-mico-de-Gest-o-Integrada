import { Module } from '@nestjs/common';
import { FinanceModule } from '../modules/finance/finance.module';
import { WebhooksController } from './webhooks.controller';

@Module({
  imports: [FinanceModule],
  controllers: [WebhooksController],
})
export class WebhooksModule {}

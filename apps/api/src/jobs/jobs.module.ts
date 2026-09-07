import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { FinanceModule } from '../modules/finance/finance.module';
import { OVERDUE_INVOICES_QUEUE } from './processors/overdue-invoices.processor';
import { OverdueInvoicesProcessor } from './processors/overdue-invoices.processor';
import { OverdueInvoicesScheduler } from './schedulers/overdue-invoices.scheduler';

@Module({
  imports: [
    BullModule.registerQueue({ name: OVERDUE_INVOICES_QUEUE }),
    FinanceModule,
  ],
  providers: [OverdueInvoicesProcessor, OverdueInvoicesScheduler],
})
export class JobsModule {}

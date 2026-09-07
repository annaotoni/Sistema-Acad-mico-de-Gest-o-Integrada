import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { FinanceService } from '../../modules/finance/finance.service';

export const OVERDUE_INVOICES_QUEUE = 'overdue-invoices';

@Processor(OVERDUE_INVOICES_QUEUE)
export class OverdueInvoicesProcessor extends WorkerHost {
  private readonly logger = new Logger(OverdueInvoicesProcessor.name);

  constructor(private readonly finance: FinanceService) {
    super();
  }

  async process(_job: Job): Promise<void> {
    const result = await this.finance.markOverdueInvoices();
    this.logger.log(`Faturas marcadas como vencidas: ${result.marked}`);
  }
}

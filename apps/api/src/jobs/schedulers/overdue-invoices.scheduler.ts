import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { OVERDUE_INVOICES_QUEUE } from '../processors/overdue-invoices.processor';

@Injectable()
export class OverdueInvoicesScheduler implements OnModuleInit {
  constructor(
    @InjectQueue(OVERDUE_INVOICES_QUEUE) private readonly queue: Queue,
  ) {}

  async onModuleInit() {
    // Job recorrente diário às 06:00 UTC — só registra uma vez
    await this.queue.upsertJobScheduler(
      'daily-overdue-check',
      { pattern: '0 6 * * *' },
      { name: 'check-overdue', data: {} },
    );
  }
}

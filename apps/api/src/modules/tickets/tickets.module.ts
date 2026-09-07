import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { TicketsRepository } from './tickets.repository';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';

@Module({
  imports: [NotificationsModule],
  controllers: [TicketsController],
  providers: [TicketsRepository, TicketsService],
  exports: [TicketsService],
})
export class TicketsModule {}

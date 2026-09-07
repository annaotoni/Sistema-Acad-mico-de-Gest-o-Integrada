import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { NotificationProcessor } from '../../jobs/processors/notification.processor';
import { NotificationsController } from './notifications.controller';
import { NotificationsRepository } from './notifications.repository';
import {
  NotificationsService,
  NOTIFICATIONS_QUEUE,
} from './notifications.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: NOTIFICATIONS_QUEUE }),
    MailModule,
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsRepository,
    NotificationProcessor,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}

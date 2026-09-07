import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { LiveClassesRepository } from './live-classes.repository';
import { LiveClassesService } from './live-classes.service';
import { LiveClassesController } from './live-classes.controller';

@Module({
  imports: [NotificationsModule],
  controllers: [LiveClassesController],
  providers: [LiveClassesRepository, LiveClassesService],
  exports: [LiveClassesService],
})
export class LiveClassesModule {}

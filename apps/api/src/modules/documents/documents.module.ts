import { Module } from '@nestjs/common';
import { PdfService } from '../../integrations/pdf/pdf.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { DocumentsRepository } from './documents.repository';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';

@Module({
  imports: [NotificationsModule],
  controllers: [DocumentsController],
  providers: [DocumentsRepository, DocumentsService, PdfService],
})
export class DocumentsModule {}

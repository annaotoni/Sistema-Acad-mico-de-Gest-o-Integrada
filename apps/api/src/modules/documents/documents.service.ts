import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DocumentStatus, Role } from '@prisma/client';
import type { AccessTokenPayload } from '../../common/interfaces/access-token-payload';
import { AuditService } from '../../common/audit/audit.service';
import { PdfService } from '../../integrations/pdf/pdf.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NOTIFICATION_EVENTS } from '../notifications/notifications-events';
import { DocumentsRepository } from './documents.repository';
import type { RequestDocumentDto } from './dto/request-document.dto';
import type { ReviewDocumentDto } from './dto/review-document.dto';

// Máquina de estados: SOLICITADO → EM_ANALISE → EMITIDO | RECUSADO
const TERMINAL = new Set<DocumentStatus>([DocumentStatus.EMITIDO, DocumentStatus.RECUSADO]);

@Injectable()
export class DocumentsService {
  constructor(
    private readonly repo: DocumentsRepository,
    private readonly pdf: PdfService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  create(dto: RequestDocumentDto, user: AccessTokenPayload) {
    return this.repo.create({ studentId: user.sub, type: dto.type, notes: dto.notes });
  }

  async listDocuments(user: AccessTokenPayload) {
    if (user.role === Role.ALUNO) return this.repo.findByStudent(user.sub);
    if (!user.tenantId) throw new ForbiddenException();
    return this.repo.findByTenant(user.tenantId);
  }

  async getDocument(id: string, user: AccessTokenPayload) {
    const doc = await this.repo.findById(id);
    if (!doc) throw new NotFoundException('Documento não encontrado');
    if (user.role === Role.ALUNO && doc.studentId !== user.sub) throw new ForbiddenException();
    return doc;
  }

  async review(id: string, dto: ReviewDocumentDto, actor: AccessTokenPayload) {
    const doc = await this.repo.findById(id);
    if (!doc) throw new NotFoundException('Documento não encontrado');
    if (TERMINAL.has(doc.status)) throw new BadRequestException('Documento já finalizado');

    // Primeiro passo: mover para EM_ANALISE se ainda SOLICITADO
    if (doc.status === DocumentStatus.SOLICITADO) {
      await this.repo.update(id, {
        status: DocumentStatus.EM_ANALISE,
        reviewedById: actor.sub,
        reviewedAt: new Date(),
      });
    }

    if (dto.action === 'reject') {
      await this.repo.update(id, {
        status: DocumentStatus.RECUSADO,
        notes: dto.notes,
        reviewedById: actor.sub,
        reviewedAt: new Date(),
      });
      await this.audit.log({
        entity: 'Document',
        entityId: id,
        userId: actor.sub,
        action: 'RECUSADO',
        oldValue: { status: doc.status },
        newValue: { status: DocumentStatus.RECUSADO, notes: dto.notes },
      });
      await this.notifications.publish({
        type: NOTIFICATION_EVENTS.DOCUMENTO_EMITIDO,
        userId: doc.studentId,
        title: 'Documento recusado',
        body: `Sua solicitação de "${doc.type}" foi recusada.`,
      });
      return this.repo.findById(id);
    }

    // Aprovação: gera PDF e armazena URL
    const pdfBuffer = await this.pdf.generate({
      title: doc.type,
      studentName: doc.student.email,
      studentEmail: doc.student.email,
      documentType: doc.type,
      issuedAt: new Date(),
      body: `Este documento certifica a solicitação do tipo "${doc.type}" pelo aluno.`,
    });

    // ponytail: salva base64 como fileUrl — trocar por storage real quando tiver S3/GCS
    const fileUrl = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;

    await this.repo.update(id, {
      status: DocumentStatus.EMITIDO,
      fileUrl,
      notes: dto.notes,
      reviewedById: actor.sub,
      reviewedAt: new Date(),
    });

    await this.audit.log({
      entity: 'Document',
      entityId: id,
      userId: actor.sub,
      action: 'EMITIDO',
      oldValue: { status: doc.status },
      newValue: { status: DocumentStatus.EMITIDO },
    });

    await this.notifications.publish({
      type: NOTIFICATION_EVENTS.DOCUMENTO_EMITIDO,
      userId: doc.studentId,
      title: 'Documento emitido',
      body: `Seu documento "${doc.type}" está disponível para download.`,
    });

    return this.repo.findById(id);
  }
}

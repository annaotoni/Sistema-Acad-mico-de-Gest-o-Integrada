import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role, TicketStatus } from '@prisma/client';
import type { AccessTokenPayload } from '../../common/interfaces/access-token-payload';
import { NotificationsService } from '../notifications/notifications.service';
import { NOTIFICATION_EVENTS } from '../notifications/notifications-events';
import { TicketsRepository } from './tickets.repository';
import type { CreateTicketDto } from './dto/create-ticket.dto';
import type { CreateMessageDto } from './dto/create-message.dto';
import type { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';

// Transições válidas: ABERTO e EM_ATENDIMENTO podem avançar; terminais não
const TERMINAL = new Set<TicketStatus>([TicketStatus.RESOLVIDO, TicketStatus.FECHADO]);

@Injectable()
export class TicketsService {
  constructor(
    private readonly repo: TicketsRepository,
    private readonly notifications: NotificationsService,
  ) {}

  async create(dto: CreateTicketDto, user: AccessTokenPayload) {
    const ticket = await this.repo.create({ studentId: user.sub, subject: dto.subject });
    await this.repo.addMessage({ ticketId: ticket.id, authorId: user.sub, content: dto.message });
    return this.repo.findById(ticket.id);
  }

  async list(user: AccessTokenPayload) {
    if (user.role === Role.ALUNO) return this.repo.findByStudent(user.sub);
    if (!user.tenantId) throw new ForbiddenException();
    return this.repo.findByTenant(user.tenantId);
  }

  async getTicket(id: string, user: AccessTokenPayload) {
    const ticket = await this.repo.findById(id);
    if (!ticket) throw new NotFoundException('Protocolo não encontrado');
    if (user.role === Role.ALUNO && ticket.studentId !== user.sub) throw new ForbiddenException();
    return ticket;
  }

  async addMessage(id: string, dto: CreateMessageDto, user: AccessTokenPayload) {
    const ticket = await this.repo.findById(id);
    if (!ticket) throw new NotFoundException('Protocolo não encontrado');
    if (user.role === Role.ALUNO && ticket.studentId !== user.sub) throw new ForbiddenException();
    if (TERMINAL.has(ticket.status)) throw new BadRequestException('Protocolo encerrado');

    // Secretaria ao responder: mover para EM_ATENDIMENTO se ainda ABERTO
    if (user.role !== Role.ALUNO && ticket.status === TicketStatus.ABERTO) {
      await this.repo.updateStatus(id, TicketStatus.EM_ATENDIMENTO);
    }

    const message = await this.repo.addMessage({ ticketId: id, authorId: user.sub, content: dto.content });

    // Notifica o aluno quando a secretaria responde
    if (user.role !== Role.ALUNO) {
      await this.notifications.publish({
        type: NOTIFICATION_EVENTS.PROTOCOLO_RESPONDIDO,
        userId: ticket.studentId,
        title: 'Protocolo respondido',
        body: `Seu protocolo "${ticket.subject}" recebeu uma resposta.`,
      });
    }

    return message;
  }

  async updateStatus(id: string, dto: UpdateTicketStatusDto, actor: AccessTokenPayload) {
    const ticket = await this.repo.findById(id);
    if (!ticket) throw new NotFoundException('Protocolo não encontrado');
    if (TERMINAL.has(ticket.status)) throw new BadRequestException('Protocolo já encerrado');
    return this.repo.updateStatus(id, dto.status);
  }
}

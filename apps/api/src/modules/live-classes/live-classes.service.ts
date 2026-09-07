import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LiveClassStatus, Role } from '@prisma/client';
import type { AccessTokenPayload } from '../../common/interfaces/access-token-payload';
import { NotificationsService } from '../notifications/notifications.service';
import { NOTIFICATION_EVENTS } from '../notifications/notifications-events';
import { LiveClassesRepository } from './live-classes.repository';
import type { CreateLiveClassDto } from './dto/create-live-class.dto';
import type { UpdateLiveClassDto } from './dto/update-live-class.dto';

// Máquina de estados: AGENDADA → AO_VIVO → ENCERRADA (sem retorno)
const TRANSITIONS: Record<LiveClassStatus, LiveClassStatus[]> = {
  [LiveClassStatus.AGENDADA]: [LiveClassStatus.AO_VIVO],
  [LiveClassStatus.AO_VIVO]: [LiveClassStatus.ENCERRADA],
  [LiveClassStatus.ENCERRADA]: [],
};

@Injectable()
export class LiveClassesService {
  constructor(
    private readonly repo: LiveClassesRepository,
    private readonly notifications: NotificationsService,
  ) {}

  create(dto: CreateLiveClassDto, _actor: AccessTokenPayload) {
    return this.repo.create({
      classId: dto.classId,
      title: dto.title,
      scheduledAt: new Date(dto.scheduledAt),
      videoLink: dto.videoLink,
    });
  }

  async listByClass(classId: string, _user: AccessTokenPayload) {
    return this.repo.findByClass(classId);
  }

  async getUpcoming(user: AccessTokenPayload) {
    if (user.role !== Role.ALUNO) throw new ForbiddenException('Apenas alunos');
    return this.repo.findUpcomingForStudent(user.sub);
  }

  async update(
    id: string,
    dto: UpdateLiveClassDto,
    _actor: AccessTokenPayload,
  ) {
    const liveClass = await this.repo.findById(id);
    if (!liveClass) throw new NotFoundException('Aula ao vivo não encontrada');

    if (dto.status) {
      const allowed = TRANSITIONS[liveClass.status];
      if (!allowed.includes(dto.status)) {
        throw new BadRequestException(
          `Transição inválida: ${liveClass.status} → ${dto.status}`,
        );
      }

      // Encerrada com gravação: vincula como Material publicado
      if (dto.status === LiveClassStatus.ENCERRADA && dto.recordingUrl) {
        const material = await this.repo.createRecordingMaterial({
          classId: liveClass.classId,
          title: `Gravação — ${liveClass.title}`,
          url: dto.recordingUrl,
        });
        await this.repo.setRecordingMaterial(id, material.id);
      }
    }

    const updated = await this.repo.update(id, {
      ...(dto.videoLink ? { videoLink: dto.videoLink } : {}),
      ...(dto.status ? { status: dto.status } : {}),
    });

    // Notificações são disparadas após persistir o estado — falha aqui não reverte a transição
    if (dto.status === LiveClassStatus.AO_VIVO) {
      this.notifyClassStudents(liveClass.classId, liveClass.title).catch(
        () => undefined,
      );
    }

    return updated;
  }

  private async notifyClassStudents(classId: string, title: string) {
    const studentIds = await this.repo.findActiveStudentIds(classId);
    await Promise.all(
      studentIds.map((userId) =>
        this.notifications.publish({
          type: NOTIFICATION_EVENTS.AULA_COMECANDO,
          userId,
          title: 'Aula ao vivo começando',
          body: `A aula "${title}" está começando agora.`,
        }),
      ),
    );
  }
}

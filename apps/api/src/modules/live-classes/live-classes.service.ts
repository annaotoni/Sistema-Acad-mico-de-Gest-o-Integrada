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

  async listByClass(classId: string, user: AccessTokenPayload) {
    return this.repo.findByClass(classId);
  }

  async getUpcoming(user: AccessTokenPayload) {
    if (user.role !== Role.ALUNO) throw new ForbiddenException('Apenas alunos');
    return this.repo.findUpcomingForStudent(user.sub);
  }

  async update(id: string, dto: UpdateLiveClassDto, actor: AccessTokenPayload) {
    const liveClass = await this.repo.findById(id);
    if (!liveClass) throw new NotFoundException('Aula ao vivo não encontrada');

    if (dto.status) {
      const allowed = TRANSITIONS[liveClass.status];
      if (!allowed.includes(dto.status)) {
        throw new BadRequestException(
          `Transição inválida: ${liveClass.status} → ${dto.status}`,
        );
      }

      // Ao vivo: notifica alunos matriculados
      if (dto.status === LiveClassStatus.AO_VIVO) {
        await this.notifyClassStudents(liveClass.classId, liveClass.title);
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

    return this.repo.update(id, {
      ...(dto.videoLink ? { videoLink: dto.videoLink } : {}),
      ...(dto.status ? { status: dto.status } : {}),
    });
  }

  private async notifyClassStudents(classId: string, title: string) {
    // ponytail: consulta direta — trocar por query via AcademicRepository se o módulo for exportado
    await this.notifications.publish({
      type: NOTIFICATION_EVENTS.AULA_COMECANDO,
      userId: classId, // placeholder: o processor de notificações precisará fan-out por turma
      title: 'Aula ao vivo começando',
      body: `A aula "${title}" está começando agora.`,
    });
  }
}

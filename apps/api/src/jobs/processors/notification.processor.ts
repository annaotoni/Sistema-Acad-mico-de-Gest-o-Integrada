import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { NotificationChannel } from '@prisma/client';
import { Job } from 'bullmq';
import { MailService } from '../../modules/mail/mail.service';
import { NotificationsRepository } from '../../modules/notifications/notifications.repository';
import type { NotificationEvent } from '../../modules/notifications/notifications-events';
import { NOTIFICATIONS_QUEUE } from '../../modules/notifications/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';

@Processor(NOTIFICATIONS_QUEUE)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly repo: NotificationsRepository,
    private readonly mail: MailService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<NotificationEvent>): Promise<void> {
    const { type, userId, title, body } = job.data;

    // Cria notificação in-app
    await this.repo.createNotification({ userId, type, title, body });

    // Verifica preferência de e-mail (padrão: habilitado)
    const pref = await this.repo.findPref(userId, NotificationChannel.EMAIL, type);
    if (pref?.enabled === false) return;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user) return;

    try {
      await this.mail.sendNotificationEmail(user.email, title, title, body);
    } catch (err) {
      // E-mail falhou mas a notificação in-app já foi salva
      this.logger.warn(`Falha ao enviar e-mail para ${user.email}: ${String(err)}`);
    }
  }
}

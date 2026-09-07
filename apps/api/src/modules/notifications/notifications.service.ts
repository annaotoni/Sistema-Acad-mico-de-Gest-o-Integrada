import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import type { AccessTokenPayload } from '../../common/interfaces/access-token-payload';
import { NotificationsRepository } from './notifications.repository';
import type { NotificationEvent } from './notifications-events';
import type { UpdateNotificationPrefDto } from './dto/update-notification-pref.dto';

export const NOTIFICATIONS_QUEUE = 'notifications';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectQueue(NOTIFICATIONS_QUEUE) private readonly queue: Queue,
    private readonly repo: NotificationsRepository,
  ) {}

  // Publicação via fila — não bloqueia a request de origem
  publish(event: NotificationEvent) {
    return this.queue.add('send', event);
  }

  listNotifications(user: AccessTokenPayload) {
    return this.repo.findByUser(user.sub);
  }

  countUnread(user: AccessTokenPayload) {
    return this.repo.countUnread(user.sub).then((count) => ({ count }));
  }

  markAsRead(notificationId: string, user: AccessTokenPayload) {
    return this.repo.markAsRead(notificationId, user.sub);
  }

  markAllAsRead(user: AccessTokenPayload) {
    return this.repo.markAllAsRead(user.sub);
  }

  getPrefs(user: AccessTokenPayload) {
    return this.repo.findPrefsByUser(user.sub);
  }

  updatePref(user: AccessTokenPayload, dto: UpdateNotificationPrefDto) {
    return this.repo.upsertPref({ userId: user.sub, ...dto });
  }
}

import { Injectable } from '@nestjs/common';
import { NotificationChannel } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  createNotification(data: {
    userId: string;
    type: string;
    title: string;
    body: string;
  }) {
    return this.prisma.notification.create({ data });
  }

  findByUser(userId: string, limit = 50) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  countUnread(userId: string) {
    return this.prisma.notification.count({
      where: { userId, readAt: null },
    });
  }

  markAsRead(id: string, _userId: string) {
    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  findPref(userId: string, channel: NotificationChannel, eventType: string) {
    return this.prisma.notificationPref.findUnique({
      where: { userId_channel_eventType: { userId, channel, eventType } },
    });
  }

  findPrefsByUser(userId: string) {
    return this.prisma.notificationPref.findMany({ where: { userId } });
  }

  upsertPref(data: {
    userId: string;
    channel: NotificationChannel;
    eventType: string;
    enabled: boolean;
  }) {
    return this.prisma.notificationPref.upsert({
      where: {
        userId_channel_eventType: {
          userId: data.userId,
          channel: data.channel,
          eventType: data.eventType,
        },
      },
      update: { enabled: data.enabled },
      create: data,
    });
  }
}

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  log(data: {
    entity: string;
    entityId: string;
    userId: string;
    action: string;
    oldValue?: unknown;
    newValue?: unknown;
  }) {
    return this.prisma.auditLog.create({
      data: {
        entity: data.entity,
        entityId: data.entityId,
        userId: data.userId,
        action: data.action,
        oldValue: data.oldValue !== undefined
          ? (data.oldValue as Prisma.InputJsonValue)
          : undefined,
        newValue: data.newValue !== undefined
          ? (data.newValue as Prisma.InputJsonValue)
          : undefined,
      },
    });
  }
}

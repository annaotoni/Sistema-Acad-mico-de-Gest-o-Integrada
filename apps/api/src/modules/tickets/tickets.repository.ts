import { Injectable } from '@nestjs/common';
import { TicketStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TicketsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: { studentId: string; subject: string }) {
    return this.prisma.ticket.create({ data });
  }

  findById(id: string) {
    return this.prisma.ticket.findUnique({
      where: { id },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        student: { select: { id: true, email: true } },
      },
    });
  }

  findByStudent(studentId: string) {
    return this.prisma.ticket.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  findByTenant(tenantId: string) {
    return this.prisma.ticket.findMany({
      where: { student: { tenantId } },
      orderBy: { createdAt: 'desc' },
      include: { student: { select: { id: true, email: true } } },
    });
  }

  addMessage(data: { ticketId: string; authorId: string; content: string }) {
    return this.prisma.ticketMessage.create({ data });
  }

  updateStatus(id: string, status: TicketStatus) {
    return this.prisma.ticket.update({
      where: { id },
      data: {
        status,
        ...(status === TicketStatus.RESOLVIDO || status === TicketStatus.FECHADO
          ? { closedAt: new Date() }
          : {}),
      },
    });
  }
}

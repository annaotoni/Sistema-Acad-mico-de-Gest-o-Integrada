import { Injectable } from '@nestjs/common';
import { DocumentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DocumentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: { studentId: string; type: string; notes?: string }) {
    return this.prisma.document.create({ data });
  }

  findById(id: string) {
    return this.prisma.document.findUnique({
      where: { id },
      include: { student: { select: { id: true, email: true } } },
    });
  }

  findByStudent(studentId: string) {
    return this.prisma.document.findMany({
      where: { studentId },
      orderBy: { requestedAt: 'desc' },
    });
  }

  findByTenant(tenantId: string) {
    return this.prisma.document.findMany({
      where: { student: { tenantId } },
      orderBy: { requestedAt: 'desc' },
      include: { student: { select: { id: true, email: true } } },
    });
  }

  update(
    id: string,
    data: {
      status?: DocumentStatus;
      fileUrl?: string;
      notes?: string;
      reviewedById?: string;
      reviewedAt?: Date;
    },
  ) {
    return this.prisma.document.update({ where: { id }, data });
  }
}

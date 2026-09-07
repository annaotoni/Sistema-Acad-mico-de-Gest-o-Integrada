import { Injectable } from '@nestjs/common';
import { LiveClassStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class LiveClassesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: {
    classId: string;
    title: string;
    scheduledAt: Date;
    videoLink?: string;
  }) {
    return this.prisma.liveClass.create({ data });
  }

  findById(id: string) {
    return this.prisma.liveClass.findUnique({ where: { id } });
  }

  findByClass(classId: string) {
    return this.prisma.liveClass.findMany({
      where: { classId },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  // Próximas aulas ao vivo para turmas onde o aluno tem matrícula ativa
  findUpcomingForStudent(studentId: string) {
    return this.prisma.liveClass.findMany({
      where: {
        status: LiveClassStatus.AGENDADA,
        scheduledAt: { gte: new Date() },
        class: {
          enrollments: { some: { studentId, status: 'ATIVA' } },
        },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 10,
    });
  }

  update(id: string, data: { videoLink?: string; status?: LiveClassStatus }) {
    return this.prisma.liveClass.update({ where: { id }, data });
  }

  // IDs dos alunos com matrícula ativa na turma
  async findActiveStudentIds(classId: string): Promise<string[]> {
    const rows = await this.prisma.enrollment.findMany({
      where: { classId, status: 'ATIVA' },
      select: { studentId: true },
    });
    return rows.map((r) => r.studentId);
  }

  // Vincula gravação como Material à aula encerrada
  setRecordingMaterial(id: string, materialId: string) {
    return this.prisma.liveClass.update({
      where: { id },
      data: { recordingMaterialId: materialId },
    });
  }

  createRecordingMaterial(data: {
    classId: string;
    title: string;
    url: string;
  }) {
    return this.prisma.material.create({
      data: { ...data, type: 'video', status: 'PUBLISHED' },
    });
  }
}

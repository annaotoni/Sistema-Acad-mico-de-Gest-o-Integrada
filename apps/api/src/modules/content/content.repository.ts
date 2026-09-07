import { Injectable } from '@nestjs/common';
import { ContentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ContentRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ── Lições ────────────────────────────────────────────────────────────────

  createLesson(data: {
    classId: string;
    title: string;
    description?: string;
    order?: number;
  }) {
    return this.prisma.lesson.create({ data: { order: 0, ...data } });
  }

  findLessonsByClass(classId: string, onlyPublished: boolean) {
    return this.prisma.lesson.findMany({
      where: {
        classId,
        ...(onlyPublished ? { status: ContentStatus.PUBLISHED } : {}),
      },
      include: { materials: onlyPublished ? { where: { status: ContentStatus.PUBLISHED } } : true },
      orderBy: { order: 'asc' },
    });
  }

  findLessonById(id: string) {
    return this.prisma.lesson.findUnique({
      where: { id },
      include: { materials: true },
    });
  }

  updateLessonStatus(id: string, status: ContentStatus) {
    return this.prisma.lesson.update({ where: { id }, data: { status } });
  }

  // ── Materiais ─────────────────────────────────────────────────────────────

  createMaterial(data: {
    classId: string;
    title: string;
    url: string;
    type: string;
    lessonId?: string;
  }) {
    return this.prisma.material.create({ data });
  }

  findMaterialsByClass(classId: string, onlyPublished: boolean) {
    return this.prisma.material.findMany({
      where: {
        classId,
        ...(onlyPublished ? { status: ContentStatus.PUBLISHED } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findMaterialById(id: string) {
    return this.prisma.material.findUnique({ where: { id } });
  }

  updateMaterialStatus(id: string, status: ContentStatus) {
    return this.prisma.material.update({ where: { id }, data: { status } });
  }
}

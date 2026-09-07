import { Injectable, NotFoundException } from '@nestjs/common';
import type { AccessTokenPayload } from '../../common/interfaces/access-token-payload';
import { ContentRepository } from './content.repository';
import type { CreateLessonDto } from './dto/create-lesson.dto';
import type { CreateMaterialDto } from './dto/create-material.dto';
import type { UpdateContentStatusDto } from './dto/update-content-status.dto';

@Injectable()
export class ContentService {
  constructor(private readonly repo: ContentRepository) {}

  // ── Lições ────────────────────────────────────────────────────────────────

  createLesson(classId: string, dto: CreateLessonDto) {
    return this.repo.createLesson({ classId, ...dto });
  }

  listLessons(classId: string, user: AccessTokenPayload) {
    // Aluno só acessa conteúdo publicado
    return this.repo.findLessonsByClass(classId, user.role === 'ALUNO');
  }

  async updateLessonStatus(lessonId: string, dto: UpdateContentStatusDto) {
    const lesson = await this.repo.findLessonById(lessonId);
    if (!lesson) throw new NotFoundException('Aula não encontrada');
    return this.repo.updateLessonStatus(lessonId, dto.status);
  }

  // ── Materiais ─────────────────────────────────────────────────────────────

  createMaterial(classId: string, dto: CreateMaterialDto) {
    return this.repo.createMaterial({ classId, ...dto });
  }

  listMaterials(classId: string, user: AccessTokenPayload) {
    return this.repo.findMaterialsByClass(classId, user.role === 'ALUNO');
  }

  async updateMaterialStatus(materialId: string, dto: UpdateContentStatusDto) {
    const material = await this.repo.findMaterialById(materialId);
    if (!material) throw new NotFoundException('Material não encontrado');
    return this.repo.updateMaterialStatus(materialId, dto.status);
  }
}

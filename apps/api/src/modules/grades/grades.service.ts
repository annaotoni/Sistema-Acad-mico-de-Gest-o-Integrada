import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../../common/audit/audit.service';
import type { AccessTokenPayload } from '../../common/interfaces/access-token-payload';
import { GradesRepository } from './grades.repository';
import type { CreateGradeDto } from './dto/create-grade.dto';
import type { UpdateGradeDto } from './dto/update-grade.dto';

@Injectable()
export class GradesService {
  constructor(
    private readonly repo: GradesRepository,
    private readonly audit: AuditService,
  ) {}

  createGrade(classId: string, dto: CreateGradeDto, user: AccessTokenPayload) {
    return this.repo.createGrade({ classId, ...dto, gradedById: user.sub });
  }

  listGrades(classId: string, user: AccessTokenPayload) {
    if (user.role === 'ALUNO') {
      return this.repo.findGradesByStudentAndClass(user.sub, classId);
    }
    return this.repo.findGradesByClass(classId);
  }

  async updateGrade(gradeId: string, dto: UpdateGradeDto, user: AccessTokenPayload) {
    const grade = await this.repo.findGradeById(gradeId);
    if (!grade) throw new NotFoundException('Nota não encontrada');

    await this.audit.log({
      entity: 'Grade',
      entityId: gradeId,
      userId: user.sub,
      action: 'UPDATE',
      oldValue: { value: grade.value, label: grade.label },
      newValue: dto,
    });

    return this.repo.updateGrade(gradeId, dto);
  }
}

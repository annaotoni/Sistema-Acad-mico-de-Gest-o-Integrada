import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../../common/audit/audit.service';
import type { AccessTokenPayload } from '../../common/interfaces/access-token-payload';
import { AttendanceRepository } from './attendance.repository';
import type { RecordAttendanceDto } from './dto/record-attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(
    private readonly repo: AttendanceRepository,
    private readonly audit: AuditService,
  ) {}

  async recordBulk(
    classId: string,
    dto: RecordAttendanceDto,
    user: AccessTokenPayload,
  ) {
    const date = new Date(dto.date);
    const studentIds = dto.records.map((r) => r.studentId);

    // Busca todos os registros existentes de uma só query antes de upsertá-los
    const existingRows = await this.repo.findRecords(
      classId,
      studentIds,
      dto.lessonId,
      date,
    );
    const existingMap = new Map(existingRows.map((r) => [r.studentId, r]));

    return Promise.all(
      dto.records.map(async (entry) => {
        const existing = existingMap.get(entry.studentId);
        const record = await this.repo.upsertRecord({
          classId,
          studentId: entry.studentId,
          lessonId: dto.lessonId,
          present: entry.present,
          date,
          recordedById: user.sub,
        });

        if (existing && existing.present !== entry.present) {
          await this.audit.log({
            entity: 'AttendanceRecord',
            entityId: record.id,
            userId: user.sub,
            action: 'UPDATE',
            oldValue: { present: existing.present },
            newValue: { present: entry.present },
          });
        }

        return record;
      }),
    );
  }

  async listAttendance(classId: string, user?: AccessTokenPayload) {
    const records = await this.repo.findByClass(classId);
    // Aluno vê apenas sua própria frequência; outros perfis veem a turma inteira
    if (user?.role === 'ALUNO') {
      return records.filter((r) => r.studentId === user.sub);
    }
    return records;
  }

  async updateAttendance(
    recordId: string,
    present: boolean,
    user: AccessTokenPayload,
  ) {
    const record = await this.repo.findById(recordId);
    if (!record)
      throw new NotFoundException('Registro de presença não encontrado');

    if (record.present !== present) {
      await this.audit.log({
        entity: 'AttendanceRecord',
        entityId: recordId,
        userId: user.sub,
        action: 'UPDATE',
        oldValue: { present: record.present },
        newValue: { present },
      });
    }

    return this.repo.updatePresent(recordId, present, user.sub);
  }
}

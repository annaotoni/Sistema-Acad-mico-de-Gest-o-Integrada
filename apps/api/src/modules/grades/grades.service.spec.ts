import { NotFoundException } from '@nestjs/common';
import type { AccessTokenPayload } from '../../common/interfaces/access-token-payload';
import { GradesService } from './grades.service';

const professor: AccessTokenPayload = { sub: 'p1', jti: 'j1', role: 'PROFESSOR', tenantId: 't1', iat: 0, exp: 0 };
const aluno: AccessTokenPayload = { sub: 'a1', jti: 'j2', role: 'ALUNO', tenantId: 't1', iat: 0, exp: 0 };

const mockRepo = {
  createGrade: jest.fn(),
  findGradesByClass: jest.fn(),
  findGradesByStudentAndClass: jest.fn(),
  findGradeById: jest.fn(),
  updateGrade: jest.fn(),
};
const mockAudit = { log: jest.fn() };

describe('GradesService', () => {
  let service: GradesService;

  beforeEach(() => {
    service = new GradesService(mockRepo as never, mockAudit as never);
    jest.clearAllMocks();
  });

  describe('listGrades', () => {
    it('ALUNO só vê próprias notas', () => {
      mockRepo.findGradesByStudentAndClass.mockResolvedValue([]);
      service.listGrades('c1', aluno);
      expect(mockRepo.findGradesByStudentAndClass).toHaveBeenCalledWith('a1', 'c1');
    });

    it('PROFESSOR vê todas as notas da turma', () => {
      mockRepo.findGradesByClass.mockResolvedValue([]);
      service.listGrades('c1', professor);
      expect(mockRepo.findGradesByClass).toHaveBeenCalledWith('c1');
    });
  });

  describe('updateGrade', () => {
    it('lança NotFoundException para nota inexistente', async () => {
      mockRepo.findGradeById.mockResolvedValue(null);
      await expect(
        service.updateGrade('g1', { value: 8 }, professor),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('gera AuditLog com valores antigo e novo', async () => {
      mockRepo.findGradeById.mockResolvedValue({ value: 7, label: 'P1' });
      mockRepo.updateGrade.mockResolvedValue({});
      mockAudit.log.mockResolvedValue({});
      await service.updateGrade('g1', { value: 9 }, professor);
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: 'Grade',
          entityId: 'g1',
          action: 'UPDATE',
          oldValue: { value: 7, label: 'P1' },
          newValue: { value: 9 },
        }),
      );
    });
  });
});

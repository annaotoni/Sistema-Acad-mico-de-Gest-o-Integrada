import { NotFoundException } from '@nestjs/common';
import type { AccessTokenPayload } from '../../common/interfaces/access-token-payload';
import { AttendanceService } from './attendance.service';

const professor: AccessTokenPayload = { sub: 'p1', jti: 'j1', role: 'PROFESSOR', tenantId: 't1', iat: 0, exp: 0 };

const mockRepo = {
  findRecord: jest.fn(),
  upsertRecord: jest.fn(),
  findByClass: jest.fn(),
  findById: jest.fn(),
  updatePresent: jest.fn(),
};
const mockAudit = { log: jest.fn() };

describe('AttendanceService', () => {
  let service: AttendanceService;

  beforeEach(() => {
    service = new AttendanceService(mockRepo as never, mockAudit as never);
    jest.clearAllMocks();
  });

  describe('recordBulk', () => {
    it('gera AuditLog quando presença é alterada', async () => {
      mockRepo.findRecord.mockResolvedValue({ present: true });
      mockRepo.upsertRecord.mockResolvedValue({ id: 'r1', present: false });
      mockAudit.log.mockResolvedValue({});
      await service.recordBulk(
        'c1',
        { date: '2024-09-01', records: [{ studentId: 'a1', present: false }] },
        professor,
      );
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'UPDATE', oldValue: { present: true } }),
      );
    });

    it('não gera AuditLog quando presença não muda', async () => {
      mockRepo.findRecord.mockResolvedValue({ present: true });
      mockRepo.upsertRecord.mockResolvedValue({ id: 'r1', present: true });
      mockAudit.log.mockResolvedValue({});
      await service.recordBulk(
        'c1',
        { date: '2024-09-01', records: [{ studentId: 'a1', present: true }] },
        professor,
      );
      expect(mockAudit.log).not.toHaveBeenCalled();
    });
  });

  describe('updateAttendance', () => {
    it('lança NotFoundException para registro inexistente', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.updateAttendance('r1', false, professor)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('gera AuditLog na alteração de presença', async () => {
      mockRepo.findById.mockResolvedValue({ present: true });
      mockRepo.updatePresent.mockResolvedValue({});
      mockAudit.log.mockResolvedValue({});
      await service.updateAttendance('r1', false, professor);
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ oldValue: { present: true }, newValue: { present: false } }),
      );
    });
  });
});

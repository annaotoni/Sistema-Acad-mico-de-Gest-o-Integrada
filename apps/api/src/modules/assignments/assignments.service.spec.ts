import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { AccessTokenPayload } from '../../common/interfaces/access-token-payload';
import { AssignmentsService } from './assignments.service';

const aluno: AccessTokenPayload = {
  sub: 'a1',
  jti: 'j1',
  role: 'ALUNO',
  tenantId: 't1',
  iat: 0,
  exp: 0,
};
const professor: AccessTokenPayload = {
  sub: 'p1',
  jti: 'j2',
  role: 'PROFESSOR',
  tenantId: 't1',
  iat: 0,
  exp: 0,
};

const mockRepo = {
  createAssignment: jest.fn(),
  findAssignmentsByClass: jest.fn(),
  findAssignmentById: jest.fn(),
  findSubmission: jest.fn(),
  createSubmission: jest.fn(),
  findSubmissionsByAssignment: jest.fn(),
  findSubmissionById: jest.fn(),
  gradeSubmission: jest.fn(),
};

const mockAudit = { log: jest.fn().mockResolvedValue(undefined) };

describe('AssignmentsService', () => {
  let service: AssignmentsService;

  beforeEach(() => {
    service = new AssignmentsService(mockRepo as never, mockAudit as never);
    jest.clearAllMocks();
  });

  describe('submit', () => {
    it('lança NotFoundException para atividade inexistente', async () => {
      mockRepo.findAssignmentById.mockResolvedValue(null);
      await expect(service.submit('a1', aluno, {})).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('lança ConflictException para entrega duplicada', async () => {
      mockRepo.findAssignmentById.mockResolvedValue({
        dueDate: new Date('2099-01-01'),
        maxScore: 10,
      });
      mockRepo.findSubmission.mockResolvedValue({ id: 's1' });
      await expect(service.submit('a1', aluno, {})).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('marca is_late quando entregue após o prazo', async () => {
      mockRepo.findAssignmentById.mockResolvedValue({
        dueDate: new Date('2000-01-01'),
        maxScore: 10,
      });
      mockRepo.findSubmission.mockResolvedValue(null);
      mockRepo.createSubmission.mockResolvedValue({ isLate: true });
      await service.submit('a1', aluno, { content: 'resp' });
      expect(mockRepo.createSubmission).toHaveBeenCalledWith(
        expect.objectContaining({ isLate: true }),
      );
    });

    it('não marca is_late quando entregue antes do prazo', async () => {
      mockRepo.findAssignmentById.mockResolvedValue({
        dueDate: new Date('2099-01-01'),
        maxScore: 10,
      });
      mockRepo.findSubmission.mockResolvedValue(null);
      mockRepo.createSubmission.mockResolvedValue({ isLate: false });
      await service.submit('a1', aluno, { content: 'resp' });
      expect(mockRepo.createSubmission).toHaveBeenCalledWith(
        expect.objectContaining({ isLate: false }),
      );
    });
  });

  describe('gradeSubmission', () => {
    it('lança BadRequestException quando nota excede o máximo', async () => {
      mockRepo.findSubmissionById.mockResolvedValue({ assignmentId: 'a1' });
      mockRepo.findAssignmentById.mockResolvedValue({ maxScore: 10 });
      await expect(
        service.gradeSubmission('s1', { score: 11 }, professor),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('persiste correção com nota válida', async () => {
      mockRepo.findSubmissionById.mockResolvedValue({ assignmentId: 'a1' });
      mockRepo.findAssignmentById.mockResolvedValue({ maxScore: 10 });
      mockRepo.gradeSubmission.mockResolvedValue({ score: 8 });
      await expect(
        service.gradeSubmission('s1', { score: 8 }, professor),
      ).resolves.toEqual({ score: 8 });
    });
  });
});

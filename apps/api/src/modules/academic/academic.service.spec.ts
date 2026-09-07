import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ClassStatus, EnrollmentStatus } from '@prisma/client';
import type { AccessTokenPayload } from '../../common/interfaces/access-token-payload';
import { AcademicService } from './academic.service';

const adminUser: AccessTokenPayload = {
  sub: 'u1', jti: 'j1', role: 'ADMIN', tenantId: 't1', iat: 0, exp: 0,
};
const professorUser: AccessTokenPayload = {
  sub: 'p1', jti: 'j2', role: 'PROFESSOR', tenantId: 't1', iat: 0, exp: 0,
};
const alunoUser: AccessTokenPayload = {
  sub: 'a1', jti: 'j3', role: 'ALUNO', tenantId: 't1', iat: 0, exp: 0,
};

const mockRepo = {
  createCourse: jest.fn(),
  findCoursesByTenant: jest.fn(),
  findCourseById: jest.fn(),
  createDiscipline: jest.fn(),
  createAcademicPeriod: jest.fn(),
  findPeriodsByTenant: jest.fn(),
  createClass: jest.fn(),
  findClassById: jest.fn(),
  findClassesByTenant: jest.fn(),
  findClassesByTeacher: jest.fn(),
  findClassesByStudent: jest.fn(),
  updateClassStatus: jest.fn(),
  findEnrollment: jest.fn(),
  countActiveEnrollments: jest.fn(),
  createEnrollment: jest.fn(),
  findEnrollmentsByClass: jest.fn(),
  updateEnrollmentStatus: jest.fn(),
  findEnrollmentById: jest.fn(),
  findTeacherAssignment: jest.fn(),
  createTeacherAssignment: jest.fn(),
  deleteTeacherAssignment: jest.fn(),
};

describe('AcademicService', () => {
  let service: AcademicService;

  beforeEach(() => {
    service = new AcademicService(mockRepo as never);
    jest.clearAllMocks();
  });

  // ── Máquina de estados da turma ───────────────────────────────────────────

  describe('updateClassStatus', () => {
    it('ABERTA → EM_ANDAMENTO: transição válida', async () => {
      mockRepo.findClassById.mockResolvedValue({ status: ClassStatus.ABERTA, maxStudents: null });
      mockRepo.updateClassStatus.mockResolvedValue({});
      await expect(
        service.updateClassStatus('c1', ClassStatus.EM_ANDAMENTO),
      ).resolves.toBeDefined();
    });

    it('EM_ANDAMENTO → ENCERRADA: transição válida', async () => {
      mockRepo.findClassById.mockResolvedValue({ status: ClassStatus.EM_ANDAMENTO, maxStudents: null });
      mockRepo.updateClassStatus.mockResolvedValue({});
      await expect(
        service.updateClassStatus('c1', ClassStatus.ENCERRADA),
      ).resolves.toBeDefined();
    });

    it('ABERTA → ENCERRADA: transição inválida', async () => {
      mockRepo.findClassById.mockResolvedValue({ status: ClassStatus.ABERTA, maxStudents: null });
      await expect(
        service.updateClassStatus('c1', ClassStatus.ENCERRADA),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('ENCERRADA → qualquer: transição inválida', async () => {
      mockRepo.findClassById.mockResolvedValue({ status: ClassStatus.ENCERRADA, maxStudents: null });
      await expect(
        service.updateClassStatus('c1', ClassStatus.ABERTA),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('turma inexistente lança NotFoundException', async () => {
      mockRepo.findClassById.mockResolvedValue(null);
      await expect(
        service.updateClassStatus('c1', ClassStatus.EM_ANDAMENTO),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // ── Matrículas ────────────────────────────────────────────────────────────

  describe('enroll', () => {
    it('bloqueia matrícula em turma ENCERRADA', async () => {
      mockRepo.findClassById.mockResolvedValue({ status: ClassStatus.ENCERRADA, maxStudents: null });
      await expect(
        service.enroll('c1', { studentId: 'a1' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('bloqueia quando turma está sem vagas', async () => {
      mockRepo.findClassById.mockResolvedValue({ status: ClassStatus.ABERTA, maxStudents: 2 });
      mockRepo.countActiveEnrollments.mockResolvedValue(2);
      await expect(
        service.enroll('c1', { studentId: 'a1' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('bloqueia aluno já matriculado', async () => {
      mockRepo.findClassById.mockResolvedValue({ status: ClassStatus.ABERTA, maxStudents: null });
      mockRepo.findEnrollment.mockResolvedValue({ id: 'e1' });
      await expect(
        service.enroll('c1', { studentId: 'a1' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('matricula com sucesso quando há vagas', async () => {
      mockRepo.findClassById.mockResolvedValue({ status: ClassStatus.ABERTA, maxStudents: 10 });
      mockRepo.countActiveEnrollments.mockResolvedValue(5);
      mockRepo.findEnrollment.mockResolvedValue(null);
      mockRepo.createEnrollment.mockResolvedValue({ id: 'e2' });
      await expect(
        service.enroll('c1', { studentId: 'a1' }),
      ).resolves.toEqual({ id: 'e2' });
    });
  });

  // ── Listagem de turmas por role ───────────────────────────────────────────

  describe('listClasses', () => {
    it('ADMIN vê turmas do tenant', async () => {
      mockRepo.findClassesByTenant.mockResolvedValue([]);
      await service.listClasses(adminUser);
      expect(mockRepo.findClassesByTenant).toHaveBeenCalledWith('t1');
    });

    it('PROFESSOR vê apenas suas turmas', async () => {
      mockRepo.findClassesByTeacher.mockResolvedValue([]);
      await service.listClasses(professorUser);
      expect(mockRepo.findClassesByTeacher).toHaveBeenCalledWith('p1');
    });

    it('ALUNO vê apenas turmas com matrícula ativa', async () => {
      mockRepo.findClassesByStudent.mockResolvedValue([]);
      await service.listClasses(alunoUser);
      expect(mockRepo.findClassesByStudent).toHaveBeenCalledWith('a1');
    });
  });

  // ── Vínculo de professor ──────────────────────────────────────────────────

  describe('assignTeacher', () => {
    it('bloqueia vínculo em turma ENCERRADA', async () => {
      mockRepo.findClassById.mockResolvedValue({ status: ClassStatus.ENCERRADA });
      await expect(
        service.assignTeacher('c1', 'p1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('bloqueia professor já vinculado', async () => {
      mockRepo.findClassById.mockResolvedValue({ status: ClassStatus.ABERTA });
      mockRepo.findTeacherAssignment.mockResolvedValue({ id: 'ta1' });
      await expect(
        service.assignTeacher('c1', 'p1'),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });
});

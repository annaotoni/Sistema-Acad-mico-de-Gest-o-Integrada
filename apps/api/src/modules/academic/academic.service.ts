import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClassStatus, EnrollmentStatus } from '@prisma/client';
import type { AccessTokenPayload } from '../../common/interfaces/access-token-payload';
import { AcademicRepository } from './academic.repository';
import type { CreateAcademicPeriodDto } from './dto/create-academic-period.dto';
import type { CreateClassDto } from './dto/create-class.dto';
import type { CreateCourseDto } from './dto/create-course.dto';
import type { CreateDisciplineDto } from './dto/create-discipline.dto';
import type { CreateEnrollmentDto } from './dto/create-enrollment.dto';

// Turma só avança sequencialmente; não permite voltar de estado.
const VALID_TRANSITIONS: Record<ClassStatus, ClassStatus[]> = {
  ABERTA: [ClassStatus.EM_ANDAMENTO],
  EM_ANDAMENTO: [ClassStatus.ENCERRADA],
  ENCERRADA: [],
};

@Injectable()
export class AcademicService {
  constructor(private readonly repo: AcademicRepository) {}

  // ── Cursos ────────────────────────────────────────────────────────────────

  createCourse(user: AccessTokenPayload, dto: CreateCourseDto) {
    if (!user.tenantId) throw new ForbiddenException('Usuário sem tenant');
    return this.repo.createCourse({ tenantId: user.tenantId, ...dto });
  }

  listCourses(user: AccessTokenPayload) {
    if (!user.tenantId) return [];
    return this.repo.findCoursesByTenant(user.tenantId);
  }

  async getCourse(id: string) {
    const course = await this.repo.findCourseById(id);
    if (!course) throw new NotFoundException('Curso não encontrado');
    return course;
  }

  async createDiscipline(courseId: string, dto: CreateDisciplineDto) {
    const course = await this.repo.findCourseById(courseId);
    if (!course) throw new NotFoundException('Curso não encontrado');
    return this.repo.createDiscipline({ courseId, ...dto });
  }

  // ── Períodos letivos ──────────────────────────────────────────────────────

  createAcademicPeriod(user: AccessTokenPayload, dto: CreateAcademicPeriodDto) {
    if (!user.tenantId) throw new ForbiddenException('Usuário sem tenant');
    return this.repo.createAcademicPeriod({
      tenantId: user.tenantId,
      name: dto.name,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
    });
  }

  listAcademicPeriods(user: AccessTokenPayload) {
    if (!user.tenantId) return [];
    return this.repo.findPeriodsByTenant(user.tenantId);
  }

  // ── Turmas ────────────────────────────────────────────────────────────────

  createClass(dto: CreateClassDto) {
    return this.repo.createClass(dto);
  }

  listClasses(user: AccessTokenPayload) {
    if (user.role === 'PROFESSOR')
      return this.repo.findClassesByTeacher(user.sub);
    if (user.role === 'ALUNO') return this.repo.findClassesByStudent(user.sub);
    if (!user.tenantId) return [];
    return this.repo.findClassesByTenant(user.tenantId);
  }

  async getClass(classId: string) {
    const cls = await this.repo.findClassById(classId);
    if (!cls) throw new NotFoundException('Turma não encontrada');
    return cls;
  }

  async updateClassStatus(classId: string, target: ClassStatus) {
    const cls = await this.repo.findClassById(classId);
    if (!cls) throw new NotFoundException('Turma não encontrada');

    if (!VALID_TRANSITIONS[cls.status].includes(target)) {
      throw new BadRequestException(
        `Transição inválida: ${cls.status} → ${target}`,
      );
    }
    return this.repo.updateClassStatus(classId, target);
  }

  // ── Matrículas ────────────────────────────────────────────────────────────

  async enroll(classId: string, dto: CreateEnrollmentDto) {
    const cls = await this.repo.findClassById(classId);
    if (!cls) throw new NotFoundException('Turma não encontrada');
    if (cls.status === ClassStatus.ENCERRADA) {
      throw new BadRequestException(
        'Turma encerrada não aceita novas matrículas',
      );
    }

    if (cls.maxStudents) {
      const active = await this.repo.countActiveEnrollments(classId);
      if (active >= cls.maxStudents) {
        throw new BadRequestException('Turma sem vagas disponíveis');
      }
    }

    const existing = await this.repo.findEnrollment(dto.studentId, classId);
    if (existing)
      throw new ConflictException('Aluno já matriculado nesta turma');

    return this.repo.createEnrollment(dto.studentId, classId);
  }

  listEnrollments(classId: string) {
    return this.repo.findEnrollmentsByClass(classId);
  }

  async updateEnrollmentStatus(enrollmentId: string, status: EnrollmentStatus) {
    const enrollment = await this.repo.findEnrollmentById(enrollmentId);
    if (!enrollment) throw new NotFoundException('Matrícula não encontrada');
    return this.repo.updateEnrollmentStatus(enrollmentId, status);
  }

  // ── Vínculos de professor ─────────────────────────────────────────────────

  async assignTeacher(classId: string, teacherId: string) {
    const cls = await this.repo.findClassById(classId);
    if (!cls) throw new NotFoundException('Turma não encontrada');
    if (cls.status === ClassStatus.ENCERRADA) {
      throw new BadRequestException(
        'Turma encerrada não aceita novos vínculos',
      );
    }

    const existing = await this.repo.findTeacherAssignment(teacherId, classId);
    if (existing)
      throw new ConflictException('Professor já vinculado a esta turma');

    return this.repo.createTeacherAssignment(teacherId, classId);
  }

  async removeTeacher(classId: string, teacherId: string) {
    const existing = await this.repo.findTeacherAssignment(teacherId, classId);
    if (!existing) throw new NotFoundException('Vínculo não encontrado');
    return this.repo.deleteTeacherAssignment(teacherId, classId);
  }
}

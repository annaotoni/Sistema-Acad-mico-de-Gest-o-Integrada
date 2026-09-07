import { Injectable } from '@nestjs/common';
import { ClassStatus, EnrollmentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const CLASS_INCLUDE = {
  discipline: { include: { course: true } },
  period: true,
  _count: { select: { enrollments: true, teacherAssignments: true } },
} as const;

@Injectable()
export class AcademicRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ── Cursos ────────────────────────────────────────────────────────────────

  createCourse(data: {
    tenantId: string;
    name: string;
    code: string;
    description?: string;
  }) {
    return this.prisma.course.create({ data });
  }

  findCoursesByTenant(tenantId: string) {
    return this.prisma.course.findMany({
      where: { tenantId },
      include: { disciplines: true },
      orderBy: { name: 'asc' },
    });
  }

  findCourseById(id: string) {
    return this.prisma.course.findUnique({
      where: { id },
      include: { disciplines: true },
    });
  }

  createDiscipline(data: {
    courseId: string;
    name: string;
    code: string;
    workloadHours: number;
  }) {
    return this.prisma.discipline.create({ data });
  }

  // ── Períodos letivos ──────────────────────────────────────────────────────

  createAcademicPeriod(data: {
    tenantId: string;
    name: string;
    startDate: Date;
    endDate: Date;
  }) {
    return this.prisma.academicPeriod.create({ data });
  }

  findPeriodsByTenant(tenantId: string) {
    return this.prisma.academicPeriod.findMany({
      where: { tenantId },
      orderBy: { startDate: 'desc' },
    });
  }

  // ── Turmas ────────────────────────────────────────────────────────────────

  createClass(data: {
    disciplineId: string;
    periodId: string;
    code: string;
    maxStudents?: number;
  }) {
    return this.prisma.class.create({ data, include: CLASS_INCLUDE });
  }

  findClassById(id: string) {
    return this.prisma.class.findUnique({
      where: { id },
      include: {
        ...CLASS_INCLUDE,
        teacherAssignments: {
          include: { teacher: { select: { id: true, email: true } } },
        },
      },
    });
  }

  findClassesByTenant(tenantId: string) {
    return this.prisma.class.findMany({
      where: { discipline: { course: { tenantId } } },
      include: CLASS_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  findClassesByTeacher(teacherId: string) {
    return this.prisma.class.findMany({
      where: { teacherAssignments: { some: { teacherId } } },
      include: CLASS_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  findClassesByStudent(studentId: string) {
    return this.prisma.class.findMany({
      where: {
        enrollments: { some: { studentId, status: EnrollmentStatus.ATIVA } },
      },
      include: CLASS_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  updateClassStatus(id: string, status: ClassStatus) {
    return this.prisma.class.update({ where: { id }, data: { status } });
  }

  // ── Matrículas ────────────────────────────────────────────────────────────

  findEnrollment(studentId: string, classId: string) {
    return this.prisma.enrollment.findUnique({
      where: { studentId_classId: { studentId, classId } },
    });
  }

  countActiveEnrollments(classId: string) {
    return this.prisma.enrollment.count({
      where: { classId, status: EnrollmentStatus.ATIVA },
    });
  }

  createEnrollment(studentId: string, classId: string) {
    return this.prisma.enrollment.create({
      data: { studentId, classId },
    });
  }

  findEnrollmentsByClass(classId: string) {
    return this.prisma.enrollment.findMany({
      where: { classId },
      include: { student: { select: { id: true, email: true } } },
      orderBy: { enrolledAt: 'asc' },
    });
  }

  updateEnrollmentStatus(id: string, status: EnrollmentStatus) {
    return this.prisma.enrollment.update({ where: { id }, data: { status } });
  }

  findEnrollmentById(id: string) {
    return this.prisma.enrollment.findUnique({ where: { id } });
  }

  // ── Vínculos de professor ─────────────────────────────────────────────────

  findTeacherAssignment(teacherId: string, classId: string) {
    return this.prisma.teacherAssignment.findUnique({
      where: { teacherId_classId: { teacherId, classId } },
    });
  }

  createTeacherAssignment(teacherId: string, classId: string) {
    return this.prisma.teacherAssignment.create({
      data: { teacherId, classId },
    });
  }

  deleteTeacherAssignment(teacherId: string, classId: string) {
    return this.prisma.teacherAssignment.delete({
      where: { teacherId_classId: { teacherId, classId } },
    });
  }
}

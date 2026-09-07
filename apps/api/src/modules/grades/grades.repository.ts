import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GradesRepository {
  constructor(private readonly prisma: PrismaService) {}

  createGrade(data: {
    classId: string;
    studentId: string;
    label: string;
    value: number;
    gradedById: string;
  }) {
    return this.prisma.grade.create({ data });
  }

  findGradesByClass(classId: string) {
    return this.prisma.grade.findMany({
      where: { classId },
      include: { student: { select: { id: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  findGradesByStudentAndClass(studentId: string, classId: string) {
    return this.prisma.grade.findMany({
      where: { studentId, classId },
      orderBy: { createdAt: 'desc' },
    });
  }

  findGradeById(id: string) {
    return this.prisma.grade.findUnique({ where: { id } });
  }

  updateGrade(id: string, data: { value?: number; label?: string }) {
    return this.prisma.grade.update({ where: { id }, data });
  }
}

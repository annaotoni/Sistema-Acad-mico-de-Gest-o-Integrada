import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AssignmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  createAssignment(data: {
    classId: string;
    title: string;
    description?: string;
    dueDate: Date;
    maxScore: number;
    lessonId?: string;
  }) {
    return this.prisma.assignment.create({
      data: { ...data, maxScore: data.maxScore },
    });
  }

  findAssignmentsByClass(classId: string) {
    return this.prisma.assignment.findMany({
      where: { classId },
      orderBy: { dueDate: 'asc' },
    });
  }

  findAssignmentById(id: string) {
    return this.prisma.assignment.findUnique({ where: { id } });
  }

  findSubmission(assignmentId: string, studentId: string) {
    return this.prisma.submission.findUnique({
      where: { assignmentId_studentId: { assignmentId, studentId } },
    });
  }

  createSubmission(data: {
    assignmentId: string;
    studentId: string;
    content?: string;
    fileUrl?: string;
    isLate: boolean;
  }) {
    return this.prisma.submission.create({ data });
  }

  findSubmissionsByAssignment(assignmentId: string) {
    return this.prisma.submission.findMany({
      where: { assignmentId },
      include: { student: { select: { id: true, email: true } } },
      orderBy: { submittedAt: 'asc' },
    });
  }

  findSubmissionById(id: string) {
    return this.prisma.submission.findUnique({ where: { id } });
  }

  gradeSubmission(
    id: string,
    data: { score: number; feedback?: string; gradedById: string },
  ) {
    return this.prisma.submission.update({
      where: { id },
      data: {
        score: data.score,
        feedback: data.feedback,
        gradedById: data.gradedById,
        gradedAt: new Date(),
      },
    });
  }
}

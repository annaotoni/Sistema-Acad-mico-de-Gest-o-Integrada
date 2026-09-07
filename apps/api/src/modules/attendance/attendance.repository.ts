import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AttendanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  findRecord(
    classId: string,
    studentId: string,
    lessonId: string | undefined,
    date: Date,
  ) {
    return this.prisma.attendanceRecord.findFirst({
      where: { classId, studentId, lessonId: lessonId ?? null, date },
    });
  }

  findRecords(
    classId: string,
    studentIds: string[],
    lessonId: string | undefined,
    date: Date,
  ) {
    return this.prisma.attendanceRecord.findMany({
      where: {
        classId,
        studentId: { in: studentIds },
        lessonId: lessonId ?? null,
        date,
      },
    });
  }

  upsertRecord(data: {
    classId: string;
    studentId: string;
    lessonId?: string;
    present: boolean;
    date: Date;
    recordedById: string;
  }) {
    return this.prisma.attendanceRecord.upsert({
      where: {
        classId_studentId_lessonId_date: {
          classId: data.classId,
          studentId: data.studentId,
          lessonId: data.lessonId ?? '',
          date: data.date,
        },
      },
      update: { present: data.present, recordedById: data.recordedById },
      create: { ...data },
    });
  }

  findByClass(classId: string) {
    return this.prisma.attendanceRecord.findMany({
      where: { classId },
      include: { student: { select: { id: true, email: true } } },
      orderBy: [{ date: 'desc' }, { studentId: 'asc' }],
    });
  }

  findById(id: string) {
    return this.prisma.attendanceRecord.findUnique({ where: { id } });
  }

  updatePresent(id: string, present: boolean, recordedById: string) {
    return this.prisma.attendanceRecord.update({
      where: { id },
      data: { present, recordedById },
    });
  }
}

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AccessTokenPayload } from '../../common/interfaces/access-token-payload';
import { AssignmentsRepository } from './assignments.repository';
import type { CreateAssignmentDto } from './dto/create-assignment.dto';
import type { CreateSubmissionDto } from './dto/create-submission.dto';
import type { GradeSubmissionDto } from './dto/grade-submission.dto';

@Injectable()
export class AssignmentsService {
  constructor(private readonly repo: AssignmentsRepository) {}

  createAssignment(classId: string, dto: CreateAssignmentDto) {
    return this.repo.createAssignment({
      classId,
      title: dto.title,
      description: dto.description,
      dueDate: new Date(dto.dueDate),
      maxScore: dto.maxScore,
      lessonId: dto.lessonId,
    });
  }

  listAssignments(classId: string) {
    return this.repo.findAssignmentsByClass(classId);
  }

  async getAssignment(assignmentId: string) {
    const a = await this.repo.findAssignmentById(assignmentId);
    if (!a) throw new NotFoundException('Atividade não encontrada');
    return a;
  }

  async submit(assignmentId: string, user: AccessTokenPayload, dto: CreateSubmissionDto) {
    const assignment = await this.repo.findAssignmentById(assignmentId);
    if (!assignment) throw new NotFoundException('Atividade não encontrada');

    const existing = await this.repo.findSubmission(assignmentId, user.sub);
    if (existing) throw new ConflictException('Entrega já realizada para esta atividade');

    // Entrega aceita após prazo, mas marcada como atrasada
    const isLate = new Date() > assignment.dueDate;
    return this.repo.createSubmission({
      assignmentId,
      studentId: user.sub,
      content: dto.content,
      fileUrl: dto.fileUrl,
      isLate,
    });
  }

  async listSubmissions(assignmentId: string) {
    const assignment = await this.repo.findAssignmentById(assignmentId);
    if (!assignment) throw new NotFoundException('Atividade não encontrada');
    return this.repo.findSubmissionsByAssignment(assignmentId);
  }

  async gradeSubmission(submissionId: string, dto: GradeSubmissionDto, user: AccessTokenPayload) {
    const submission = await this.repo.findSubmissionById(submissionId);
    if (!submission) throw new NotFoundException('Entrega não encontrada');

    const assignment = await this.repo.findAssignmentById(submission.assignmentId);
    if (dto.score > Number(assignment!.maxScore)) {
      throw new BadRequestException(
        `Nota ${dto.score} excede o máximo permitido (${assignment!.maxScore})`,
      );
    }

    return this.repo.gradeSubmission(submissionId, { ...dto, gradedById: user.sub });
  }
}

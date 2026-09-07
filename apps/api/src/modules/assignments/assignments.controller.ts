import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequireScope } from '../../common/decorators/require-scope.decorator';
import { RoleGuard } from '../../common/guards/role.guard';
import { ScopeGuard } from '../../common/guards/scope.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AccessTokenPayload } from '../../common/interfaces/access-token-payload';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { GradeSubmissionDto } from './dto/grade-submission.dto';

@UseGuards(JwtAuthGuard, RoleGuard, ScopeGuard)
@Controller('classes')
export class AssignmentsController {
  constructor(private readonly service: AssignmentsService) {}

  @Roles('ADMIN', 'SECRETARIA', 'PROFESSOR')
  @Post(':classId/assignments')
  createAssignment(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Body() dto: CreateAssignmentDto,
  ) {
    return this.service.createAssignment(classId, dto);
  }

  @Get(':classId/assignments')
  @RequireScope('class')
  listAssignments(@Param('classId', ParseUUIDPipe) classId: string) {
    return this.service.listAssignments(classId);
  }

  @Get(':classId/assignments/:assignmentId')
  @RequireScope('class')
  getAssignment(@Param('assignmentId', ParseUUIDPipe) assignmentId: string) {
    return this.service.getAssignment(assignmentId);
  }

  // Aluno submete para si mesmo — studentId vem do token
  @Roles('ALUNO')
  @Post(':classId/assignments/:assignmentId/submissions')
  @RequireScope('class')
  submit(
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: CreateSubmissionDto,
  ) {
    return this.service.submit(assignmentId, user, dto);
  }

  @Roles('ADMIN', 'SECRETARIA', 'PROFESSOR')
  @Get(':classId/assignments/:assignmentId/submissions')
  @RequireScope('class')
  listSubmissions(@Param('assignmentId', ParseUUIDPipe) assignmentId: string) {
    return this.service.listSubmissions(assignmentId);
  }

  @Roles('ADMIN', 'SECRETARIA', 'PROFESSOR')
  @Patch(':classId/assignments/:assignmentId/submissions/:submissionId/grade')
  @RequireScope('class')
  gradeSubmission(
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: GradeSubmissionDto,
  ) {
    return this.service.gradeSubmission(submissionId, dto, user);
  }
}

import {
  Body,
  Controller,
  Delete,
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
import { AcademicService } from './academic.service';
import { AssignTeacherDto } from './dto/assign-teacher.dto';
import { CreateClassDto } from './dto/create-class.dto';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { UpdateClassStatusDto } from './dto/update-class-status.dto';
import { UpdateEnrollmentStatusDto } from './dto/update-enrollment-status.dto';

@UseGuards(JwtAuthGuard, RoleGuard, ScopeGuard)
@Controller('classes')
export class ClassesController {
  constructor(private readonly service: AcademicService) {}

  @Roles('ADMIN', 'SECRETARIA')
  @Post()
  createClass(@Body() dto: CreateClassDto) {
    return this.service.createClass(dto);
  }

  @Get()
  listClasses(@CurrentUser() user: AccessTokenPayload) {
    return this.service.listClasses(user);
  }

  @Get(':classId')
  @RequireScope('class')
  getClass(@Param('classId', ParseUUIDPipe) classId: string) {
    return this.service.getClass(classId);
  }

  @Roles('ADMIN', 'SECRETARIA')
  @Patch(':classId/status')
  updateClassStatus(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Body() dto: UpdateClassStatusDto,
  ) {
    return this.service.updateClassStatus(classId, dto.status);
  }

  // ── Matrículas ────────────────────────────────────────────────────────────

  @Roles('ADMIN', 'SECRETARIA')
  @Post(':classId/enrollments')
  enroll(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Body() dto: CreateEnrollmentDto,
  ) {
    return this.service.enroll(classId, dto);
  }

  @Roles('ADMIN', 'SECRETARIA', 'PROFESSOR')
  @Get(':classId/enrollments')
  @RequireScope('class')
  listEnrollments(@Param('classId', ParseUUIDPipe) classId: string) {
    return this.service.listEnrollments(classId);
  }

  @Roles('ADMIN', 'SECRETARIA')
  @Patch(':classId/enrollments/:enrollmentId/status')
  updateEnrollmentStatus(
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
    @Body() dto: UpdateEnrollmentStatusDto,
  ) {
    return this.service.updateEnrollmentStatus(enrollmentId, dto.status);
  }

  // ── Vínculos de professor ─────────────────────────────────────────────────

  @Roles('ADMIN', 'SECRETARIA')
  @Post(':classId/teachers')
  assignTeacher(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Body() dto: AssignTeacherDto,
  ) {
    return this.service.assignTeacher(classId, dto.teacherId);
  }

  @Roles('ADMIN', 'SECRETARIA')
  @Delete(':classId/teachers/:teacherId')
  removeTeacher(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('teacherId', ParseUUIDPipe) teacherId: string,
  ) {
    return this.service.removeTeacher(classId, teacherId);
  }
}

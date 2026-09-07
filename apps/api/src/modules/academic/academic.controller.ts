import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleGuard } from '../../common/guards/role.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AccessTokenPayload } from '../../common/interfaces/access-token-payload';
import { AcademicService } from './academic.service';
import { CreateAcademicPeriodDto } from './dto/create-academic-period.dto';
import { CreateCourseDto } from './dto/create-course.dto';
import { CreateDisciplineDto } from './dto/create-discipline.dto';

@UseGuards(JwtAuthGuard, RoleGuard)
@Controller()
export class AcademicController {
  constructor(private readonly service: AcademicService) {}

  // ── Cursos ────────────────────────────────────────────────────────────────

  @Roles('ADMIN', 'SECRETARIA')
  @Post('courses')
  createCourse(@CurrentUser() user: AccessTokenPayload, @Body() dto: CreateCourseDto) {
    return this.service.createCourse(user, dto);
  }

  @Get('courses')
  listCourses(@CurrentUser() user: AccessTokenPayload) {
    return this.service.listCourses(user);
  }

  @Get('courses/:courseId')
  getCourse(@Param('courseId', ParseUUIDPipe) courseId: string) {
    return this.service.getCourse(courseId);
  }

  @Roles('ADMIN', 'SECRETARIA')
  @Post('courses/:courseId/disciplines')
  createDiscipline(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() dto: CreateDisciplineDto,
  ) {
    return this.service.createDiscipline(courseId, dto);
  }

  // ── Períodos letivos ──────────────────────────────────────────────────────

  @Roles('ADMIN', 'SECRETARIA')
  @Post('academic-periods')
  createAcademicPeriod(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: CreateAcademicPeriodDto,
  ) {
    return this.service.createAcademicPeriod(user, dto);
  }

  @Get('academic-periods')
  listAcademicPeriods(@CurrentUser() user: AccessTokenPayload) {
    return this.service.listAcademicPeriods(user);
  }
}

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
import { GradesService } from './grades.service';
import { CreateGradeDto } from './dto/create-grade.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';

@UseGuards(JwtAuthGuard, RoleGuard, ScopeGuard)
@Controller('classes')
export class GradesController {
  constructor(private readonly service: GradesService) {}

  @Roles('ADMIN', 'SECRETARIA', 'PROFESSOR')
  @Post(':classId/grades')
  @RequireScope('class')
  createGrade(
    @Param('classId', ParseUUIDPipe) classId: string,
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: CreateGradeDto,
  ) {
    return this.service.createGrade(classId, dto, user);
  }

  @Get(':classId/grades')
  @RequireScope('class')
  listGrades(
    @Param('classId', ParseUUIDPipe) classId: string,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    return this.service.listGrades(classId, user);
  }

  @Roles('ADMIN', 'SECRETARIA', 'PROFESSOR')
  @Patch(':classId/grades/:gradeId')
  @RequireScope('class')
  updateGrade(
    @Param('gradeId', ParseUUIDPipe) gradeId: string,
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: UpdateGradeDto,
  ) {
    return this.service.updateGrade(gradeId, dto, user);
  }
}

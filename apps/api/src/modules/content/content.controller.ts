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
import { ContentService } from './content.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateContentStatusDto } from './dto/update-content-status.dto';

@UseGuards(JwtAuthGuard, RoleGuard, ScopeGuard)
@Controller('classes')
export class ContentController {
  constructor(private readonly service: ContentService) {}

  // ── Lições ────────────────────────────────────────────────────────────────

  @Roles('ADMIN', 'SECRETARIA', 'PROFESSOR')
  @Post(':classId/lessons')
  createLesson(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Body() dto: CreateLessonDto,
  ) {
    return this.service.createLesson(classId, dto);
  }

  @Get(':classId/lessons')
  @RequireScope('class')
  listLessons(
    @Param('classId', ParseUUIDPipe) classId: string,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    return this.service.listLessons(classId, user);
  }

  @Roles('ADMIN', 'SECRETARIA', 'PROFESSOR')
  @Patch(':classId/lessons/:lessonId/status')
  updateLessonStatus(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Body() dto: UpdateContentStatusDto,
  ) {
    return this.service.updateLessonStatus(lessonId, dto);
  }

  // ── Materiais ─────────────────────────────────────────────────────────────

  @Roles('ADMIN', 'SECRETARIA', 'PROFESSOR')
  @Post(':classId/materials')
  createMaterial(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Body() dto: CreateMaterialDto,
  ) {
    return this.service.createMaterial(classId, dto);
  }

  @Get(':classId/materials')
  @RequireScope('class')
  listMaterials(
    @Param('classId', ParseUUIDPipe) classId: string,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    return this.service.listMaterials(classId, user);
  }

  @Roles('ADMIN', 'SECRETARIA', 'PROFESSOR')
  @Patch(':classId/materials/:materialId/status')
  updateMaterialStatus(
    @Param('materialId', ParseUUIDPipe) materialId: string,
    @Body() dto: UpdateContentStatusDto,
  ) {
    return this.service.updateMaterialStatus(materialId, dto);
  }
}

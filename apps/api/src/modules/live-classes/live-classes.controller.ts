import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Request } from 'express';
import type { AccessTokenPayload } from '../../common/interfaces/access-token-payload';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { RequireScope } from '../../common/decorators/require-scope.decorator';
import { FeatureGuard } from '../../common/guards/feature.guard';
import { RoleGuard } from '../../common/guards/role.guard';
import { ScopeGuard } from '../../common/guards/scope.guard';
import { LiveClassesService } from './live-classes.service';
import { CreateLiveClassSchema } from './dto/create-live-class.dto';
import { UpdateLiveClassSchema } from './dto/update-live-class.dto';

@Controller('live-classes')
@UseGuards(FeatureGuard, RoleGuard, ScopeGuard)
@RequireFeature('aulas-ao-vivo')
export class LiveClassesController {
  constructor(private readonly service: LiveClassesService) {}

  private user(req: Request): AccessTokenPayload {
    return (req as unknown as { user: AccessTokenPayload }).user;
  }

  @Post()
  @Roles(Role.PROFESSOR, Role.ADMIN, Role.SECRETARIA)
  create(@Body() body: unknown, @Req() req: Request) {
    const parsed = CreateLiveClassSchema.safeParse(body);
    if (!parsed.success)
      throw new UnprocessableEntityException(parsed.error.flatten());
    return this.service.create(parsed.data, this.user(req));
  }

  // Próximas aulas do aluno logado (não filtra por turma, não precisa de ScopeGuard aqui)
  @Get('upcoming')
  @Roles(Role.ALUNO)
  getUpcoming(@Req() req: Request) {
    return this.service.getUpcoming(this.user(req));
  }

  @Get('class/:classId')
  @RequireScope('class')
  listByClass(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Req() req: Request,
  ) {
    return this.service.listByClass(classId, this.user(req));
  }

  @Patch(':id')
  @Roles(Role.PROFESSOR, Role.ADMIN)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    const parsed = UpdateLiveClassSchema.safeParse(body);
    if (!parsed.success)
      throw new UnprocessableEntityException(parsed.error.flatten());
    return this.service.update(id, parsed.data, this.user(req));
  }
}

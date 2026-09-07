import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleGuard } from '../../common/guards/role.guard';
import type { AccessTokenPayload } from '../../common/interfaces/access-token-payload';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';

const UpdateRoleSchema = z.object({ role: z.nativeEnum(Role) });

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async me(@CurrentUser() currentUser: AccessTokenPayload) {
    const user = await this.usersService.findById(currentUser.sub);
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      emailVerifiedAt: user.emailVerifiedAt,
      createdAt: user.createdAt,
    };
  }

  @Patch(':id/role')
  @UseGuards(RoleGuard)
  @Roles(Role.ADMIN)
  updateRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
    @CurrentUser() actor: AccessTokenPayload,
  ) {
    const parsed = UpdateRoleSchema.safeParse(body);
    if (!parsed.success)
      throw new UnprocessableEntityException(parsed.error.flatten());
    return this.usersService.updateRole(id, parsed.data.role, actor.sub);
  }
}

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
import { FeatureGuard } from '../../common/guards/feature.guard';
import { RoleGuard } from '../../common/guards/role.guard';
import { TicketsService } from './tickets.service';
import { CreateTicketSchema } from './dto/create-ticket.dto';
import { CreateMessageSchema } from './dto/create-message.dto';
import { UpdateTicketStatusSchema } from './dto/update-ticket-status.dto';

@Controller('tickets')
@UseGuards(FeatureGuard, RoleGuard)
@RequireFeature('tickets')
export class TicketsController {
  constructor(private readonly service: TicketsService) {}

  private user(req: Request): AccessTokenPayload {
    return (req as unknown as { user: AccessTokenPayload }).user;
  }

  @Post()
  @Roles(Role.ALUNO)
  create(@Body() body: unknown, @Req() req: Request) {
    const parsed = CreateTicketSchema.safeParse(body);
    if (!parsed.success)
      throw new UnprocessableEntityException(parsed.error.flatten());
    return this.service.create(parsed.data, this.user(req));
  }

  @Get()
  list(@Req() req: Request) {
    return this.service.list(this.user(req));
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.service.getTicket(id, this.user(req));
  }

  @Post(':id/messages')
  addMessage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    const parsed = CreateMessageSchema.safeParse(body);
    if (!parsed.success)
      throw new UnprocessableEntityException(parsed.error.flatten());
    return this.service.addMessage(id, parsed.data, this.user(req));
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN, Role.SECRETARIA)
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    const parsed = UpdateTicketStatusSchema.safeParse(body);
    if (!parsed.success)
      throw new UnprocessableEntityException(parsed.error.flatten());
    return this.service.updateStatus(id, parsed.data, this.user(req));
  }
}

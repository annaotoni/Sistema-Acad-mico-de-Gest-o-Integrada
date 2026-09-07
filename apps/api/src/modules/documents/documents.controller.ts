import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
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
import { DocumentsService } from './documents.service';
import { RequestDocumentSchema } from './dto/request-document.dto';
import { ReviewDocumentSchema } from './dto/review-document.dto';

@Controller('documents')
@UseGuards(FeatureGuard, RoleGuard)
@RequireFeature('documentos')
export class DocumentsController {
  constructor(private readonly service: DocumentsService) {}

  private user(req: Request): AccessTokenPayload {
    return (req as unknown as { user: AccessTokenPayload }).user;
  }

  @Post()
  @Roles(Role.ALUNO)
  create(@Body() body: unknown, @Req() req: Request) {
    const parsed = RequestDocumentSchema.safeParse(body);
    if (!parsed.success)
      throw new UnprocessableEntityException(parsed.error.flatten());
    return this.service.create(parsed.data, this.user(req));
  }

  @Get()
  list(@Req() req: Request) {
    return this.service.listDocuments(this.user(req));
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.service.getDocument(id, this.user(req));
  }

  @Post(':id/review')
  @Roles(Role.ADMIN, Role.SECRETARIA)
  review(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    const parsed = ReviewDocumentSchema.safeParse(body);
    if (!parsed.success)
      throw new UnprocessableEntityException(parsed.error.flatten());
    return this.service.review(id, parsed.data, this.user(req));
  }
}

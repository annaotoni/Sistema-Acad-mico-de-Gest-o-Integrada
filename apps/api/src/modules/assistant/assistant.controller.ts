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
import { z } from 'zod';
import type { Request } from 'express';
import type { AccessTokenPayload } from '../../common/interfaces/access-token-payload';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { FeatureGuard } from '../../common/guards/feature.guard';
import { AgentService } from './agent.service';

const ChatSchema = z.object({
  message: z.string().min(1).max(2000),
  conversationId: z.string().uuid().optional(),
});

@Controller('assistant')
@UseGuards(FeatureGuard)
@RequireFeature('assistant')
export class AssistantController {
  constructor(private readonly agent: AgentService) {}

  private user(req: Request): AccessTokenPayload {
    return (req as any).user as AccessTokenPayload;
  }

  @Post('chat')
  chat(@Body() body: unknown, @Req() req: Request) {
    const parsed = ChatSchema.safeParse(body);
    if (!parsed.success) throw new UnprocessableEntityException(parsed.error.flatten());
    return this.agent.chat(parsed.data.conversationId, parsed.data.message, this.user(req));
  }

  @Get('conversations')
  listConversations(@Req() req: Request) {
    return this.agent.listConversations(this.user(req));
  }

  @Get('conversations/:id')
  getConversation(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.agent.getConversation(id, this.user(req));
  }
}

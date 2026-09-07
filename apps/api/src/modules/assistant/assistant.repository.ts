import { Injectable } from '@nestjs/common';
import { MessageRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AssistantRepository {
  constructor(private readonly prisma: PrismaService) {}

  createConversation(userId: string) {
    return this.prisma.conversation.create({ data: { userId } });
  }

  findConversation(id: string, userId: string) {
    return this.prisma.conversation.findFirst({
      where: { id, userId },
      include: { messages: { orderBy: { createdAt: 'asc' }, take: 20 } },
    });
  }

  listConversations(userId: string) {
    return this.prisma.conversation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  addMessage(data: {
    conversationId: string;
    role: MessageRole;
    content: string;
    toolCallsJson?: unknown;
  }) {
    return this.prisma.message.create({
      data: {
        conversationId: data.conversationId,
        role: data.role,
        content: data.content,
        toolCallsJson: data.toolCallsJson ?? undefined,
      },
    });
  }
}

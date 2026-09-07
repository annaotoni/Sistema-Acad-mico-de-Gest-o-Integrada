import { Inject, Injectable } from '@nestjs/common';
import { MessageRole } from '@prisma/client';
import type { AccessTokenPayload } from '../../common/interfaces/access-token-payload';
import type {
  ILlmProvider,
  LlmContentBlock,
  LlmMessage,
} from '../../integrations/llm/llm-provider.interface';
import { LLM_PROVIDER } from '../../integrations/llm/llm-provider.interface';
import { AssistantRepository } from './assistant.repository';
import { RagService } from './rag/rag.service';
import { ToolsService } from './tools/tools.service';

const SYSTEM_PROMPT = `Você é um assistente do portal acadêmico. Responda apenas perguntas sobre:
matrícula, notas, frequência, atividades, aulas ao vivo, faturas, documentos e protocolos do aluno.
Para qualquer assunto fora do domínio acadêmico, informe educadamente que não pode ajudar.
Nunca invente dados, datas ou status — use apenas o que as ferramentas retornarem.
Responda sempre em português (Brasil).`;

@Injectable()
export class AgentService {
  constructor(
    private readonly repo: AssistantRepository,
    private readonly tools: ToolsService,
    private readonly rag: RagService,
    @Inject(LLM_PROVIDER) private readonly llm: ILlmProvider,
  ) {}

  async chat(
    conversationId: string | undefined,
    userMessage: string,
    user: AccessTokenPayload,
  ): Promise<{ conversationId: string; reply: string }> {
    const conv =
      conversationId
        ? await this.repo.findConversation(conversationId, user.sub)
        : null;

    const convo = conv ?? (await this.repo.createConversation(user.sub));

    await this.repo.addMessage({
      conversationId: convo.id,
      role: MessageRole.USER,
      content: userMessage,
    });

    // Histórico recente do banco para contexto da conversa
    const history: LlmMessage[] = ((convo as any).messages ?? []).map((m: any) => ({
      role: m.role === MessageRole.USER ? 'user' : 'assistant',
      content: m.content,
    }));
    history.push({ role: 'user', content: userMessage });

    // RAG: busca conhecimento institucional para enriquecer o contexto
    const ragContext = await this.rag.search(userMessage, user.tenantId);
    const systemPrompt = ragContext
      ? `${SYSTEM_PROMPT}\n\nConhecimento institucional relevante:\n${ragContext}`
      : SYSTEM_PROMPT;

    const toolDefs = this.tools.getToolDefinitions();
    let messages = [...history];

    // Loop de tool-calling: continua até stop_reason === 'end_turn'
    // ponytail: máximo 5 iterações para evitar loop infinito em caso de bug no provider
    let iterations = 0;
    let finalText = '';

    while (iterations < 5) {
      iterations++;
      const response = await this.llm.chat(messages, toolDefs, systemPrompt);

      if (response.stop_reason === 'end_turn') {
        finalText = this.extractText(response.content);
        break;
      }

      if (response.stop_reason === 'tool_use') {
        const assistantMsg: LlmMessage = { role: 'assistant', content: response.content };
        messages.push(assistantMsg);

        const toolResults: LlmContentBlock[] = [];
        for (const block of response.content) {
          if (block.type !== 'tool_use') continue;
          const result = await this.tools.execute(block.name!, block.input ?? {}, user);
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify(result),
          });
        }

        messages.push({ role: 'user', content: toolResults });
        continue;
      }

      // stop_reason desconhecido — extrai texto e encerra
      finalText = this.extractText(response.content);
      break;
    }

    if (!finalText) finalText = 'Não consegui processar sua solicitação. Tente novamente.';

    await this.repo.addMessage({
      conversationId: convo.id,
      role: MessageRole.ASSISTANT,
      content: finalText,
    });

    return { conversationId: convo.id, reply: finalText };
  }

  listConversations(user: AccessTokenPayload) {
    return this.repo.listConversations(user.sub);
  }

  async getConversation(id: string, user: AccessTokenPayload) {
    return this.repo.findConversation(id, user.sub);
  }

  private extractText(blocks: LlmContentBlock[]): string {
    return blocks
      .filter((b) => b.type === 'text')
      .map((b) => b.text ?? '')
      .join('');
  }
}

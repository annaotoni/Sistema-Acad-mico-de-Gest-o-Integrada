import { Role } from '@prisma/client';
import { AgentService } from './agent.service';

const mockRepo = {
  createConversation: jest.fn(),
  findConversation: jest.fn(),
  listConversations: jest.fn(),
  addMessage: jest.fn(),
};
const mockTools = {
  getToolDefinitions: jest.fn().mockReturnValue([]),
  execute: jest.fn(),
};
const mockRag = { search: jest.fn() };
const mockLlm = { chat: jest.fn() };

const makeService = () =>
  new AgentService(mockRepo as any, mockTools as any, mockRag as any, mockLlm as any);

const aluno = { sub: 'aluno-1', role: Role.ALUNO, tenantId: 'tenant-1', jti: '', iat: 0, exp: 0 };

beforeEach(() => jest.clearAllMocks());

describe('chat', () => {
  it('cria nova conversa quando não existe conversationId', async () => {
    mockRepo.createConversation.mockResolvedValue({ id: 'conv-1', messages: [] });
    mockRepo.addMessage.mockResolvedValue({});
    mockRag.search.mockResolvedValue('');
    mockLlm.chat.mockResolvedValue({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'Olá!' }],
    });

    const result = await makeService().chat(undefined, 'Oi', aluno);
    expect(result.conversationId).toBe('conv-1');
    expect(result.reply).toBe('Olá!');
    expect(mockRepo.createConversation).toHaveBeenCalledWith('aluno-1');
  });

  it('executa tool e retorna resposta final', async () => {
    mockRepo.createConversation.mockResolvedValue({ id: 'conv-2', messages: [] });
    mockRepo.addMessage.mockResolvedValue({});
    mockRag.search.mockResolvedValue('');
    mockTools.execute.mockResolvedValue([{ id: 'inv-1', status: 'PENDENTE' }]);

    // Primeira chamada: LLM pede tool
    mockLlm.chat
      .mockResolvedValueOnce({
        stop_reason: 'tool_use',
        content: [{ type: 'tool_use', id: 'tu-1', name: 'consultarFaturas', input: {} }],
      })
      // Segunda chamada: LLM responde com texto
      .mockResolvedValueOnce({
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'Você tem 1 fatura pendente.' }],
      });

    const result = await makeService().chat(undefined, 'Minhas faturas?', aluno);
    expect(mockTools.execute).toHaveBeenCalledWith('consultarFaturas', {}, aluno);
    expect(result.reply).toBe('Você tem 1 fatura pendente.');
  });

  it('encerra após máximo de iterações sem loop infinito', async () => {
    mockRepo.createConversation.mockResolvedValue({ id: 'conv-3', messages: [] });
    mockRepo.addMessage.mockResolvedValue({});
    mockRag.search.mockResolvedValue('');
    mockTools.execute.mockResolvedValue({});

    // Sempre retorna tool_use — deve parar em 5 iterações
    mockLlm.chat.mockResolvedValue({
      stop_reason: 'tool_use',
      content: [{ type: 'tool_use', id: 'tu-1', name: 'consultarFaturas', input: {} }],
    });

    const result = await makeService().chat(undefined, 'loop?', aluno);
    expect(mockLlm.chat).toHaveBeenCalledTimes(5);
    expect(result.reply).toBe('Não consegui processar sua solicitação. Tente novamente.');
  });

  it('enriquece system prompt com contexto RAG quando disponível', async () => {
    mockRepo.createConversation.mockResolvedValue({ id: 'conv-4', messages: [] });
    mockRepo.addMessage.mockResolvedValue({});
    mockRag.search.mockResolvedValue('Calendário: provas em dezembro.');
    mockLlm.chat.mockResolvedValue({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'Provas em dezembro.' }],
    });

    await makeService().chat(undefined, 'Quando são as provas?', aluno);

    const [, , systemPrompt] = mockLlm.chat.mock.calls[0];
    expect(systemPrompt).toContain('Calendário: provas em dezembro.');
  });
});

import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Role, TicketStatus } from '@prisma/client';
import { TicketsService } from './tickets.service';

const mockRepo = {
  create: jest.fn(),
  findById: jest.fn(),
  findByStudent: jest.fn(),
  findByTenant: jest.fn(),
  addMessage: jest.fn(),
  updateStatus: jest.fn(),
};
const mockNotifications = { publish: jest.fn() };

const makeService = () =>
  new TicketsService(mockRepo as any, mockNotifications as any);

const aluno = {
  sub: 'aluno-1',
  role: Role.ALUNO,
  tenantId: 'tenant-1',
  jti: '',
  iat: 0,
  exp: 0,
};
const secretaria = {
  sub: 'sec-1',
  role: Role.SECRETARIA,
  tenantId: 'tenant-1',
  jti: '',
  iat: 0,
  exp: 0,
};

const abertoTicket = {
  id: 'tkt-1',
  studentId: 'aluno-1',
  subject: 'Problema na matrícula',
  status: TicketStatus.ABERTO,
  messages: [],
  student: { id: 'aluno-1', email: 'aluno@test.com' },
};

beforeEach(() => jest.clearAllMocks());

describe('getTicket', () => {
  it('aluno não acessa ticket de outro aluno', async () => {
    mockRepo.findById.mockResolvedValue({
      ...abertoTicket,
      studentId: 'outro',
    });
    await expect(
      makeService().getTicket('tkt-1', aluno),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('lança NotFoundException quando não existe', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(
      makeService().getTicket('tkt-x', secretaria),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('addMessage', () => {
  it('bloqueia mensagem em ticket encerrado', async () => {
    mockRepo.findById.mockResolvedValue({
      ...abertoTicket,
      status: TicketStatus.RESOLVIDO,
    });
    await expect(
      makeService().addMessage('tkt-1', { content: 'oi' }, aluno),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('secretaria responde: avança para EM_ATENDIMENTO e notifica aluno', async () => {
    mockRepo.findById.mockResolvedValue(abertoTicket);
    mockRepo.updateStatus.mockResolvedValue({});
    mockRepo.addMessage.mockResolvedValue({ id: 'msg-1' });
    mockNotifications.publish.mockResolvedValue(undefined);

    await makeService().addMessage(
      'tkt-1',
      { content: 'Resposta' },
      secretaria,
    );
    expect(mockRepo.updateStatus).toHaveBeenCalledWith(
      'tkt-1',
      TicketStatus.EM_ATENDIMENTO,
    );
    expect(mockNotifications.publish).toHaveBeenCalled();
  });

  it('aluno responde: não avança status nem notifica', async () => {
    mockRepo.findById.mockResolvedValue({
      ...abertoTicket,
      status: TicketStatus.EM_ATENDIMENTO,
    });
    mockRepo.addMessage.mockResolvedValue({ id: 'msg-2' });

    await makeService().addMessage('tkt-1', { content: 'Ok obrigado' }, aluno);
    expect(mockRepo.updateStatus).not.toHaveBeenCalled();
    expect(mockNotifications.publish).not.toHaveBeenCalled();
  });
});

describe('updateStatus', () => {
  it('rejeita atualização em ticket já encerrado', async () => {
    mockRepo.findById.mockResolvedValue({
      ...abertoTicket,
      status: TicketStatus.FECHADO,
    });
    await expect(
      makeService().updateStatus(
        'tkt-1',
        { status: TicketStatus.RESOLVIDO },
        secretaria,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

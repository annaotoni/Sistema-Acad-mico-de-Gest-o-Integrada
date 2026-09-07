import type { AccessTokenPayload } from '../../common/interfaces/access-token-payload';
import { NOTIFICATION_EVENTS } from './notifications-events';
import { NotificationsService } from './notifications.service';

const user: AccessTokenPayload = { sub: 'u1', jti: 'j1', role: 'ALUNO', tenantId: 't1', iat: 0, exp: 0 };

const mockQueue = { add: jest.fn() };
const mockRepo = {
  findByUser: jest.fn(),
  countUnread: jest.fn(),
  markAsRead: jest.fn(),
  markAllAsRead: jest.fn(),
  findPrefsByUser: jest.fn(),
  upsertPref: jest.fn(),
};

describe('NotificationsService', () => {
  let service: NotificationsService;

  beforeEach(() => {
    service = new NotificationsService(mockQueue as never, mockRepo as never);
    jest.clearAllMocks();
  });

  it('publish enfileira o evento no BullMQ', async () => {
    mockQueue.add.mockResolvedValue({ id: '1' });
    await service.publish({ type: NOTIFICATION_EVENTS.NOTA_LANCADA, userId: 'u1', title: 'Nota', body: 'Sua nota foi lançada' });
    expect(mockQueue.add).toHaveBeenCalledWith('send', expect.objectContaining({ type: 'nota.lancada' }));
  });

  it('countUnread retorna objeto { count }', async () => {
    mockRepo.countUnread.mockResolvedValue(3);
    const result = await service.countUnread(user);
    expect(result).toEqual({ count: 3 });
  });

  it('markAllAsRead delega para o repositório com userId', async () => {
    mockRepo.markAllAsRead.mockResolvedValue({ count: 5 });
    await service.markAllAsRead(user);
    expect(mockRepo.markAllAsRead).toHaveBeenCalledWith('u1');
  });

  it('updatePref faz upsert com dados do usuário logado', async () => {
    mockRepo.upsertPref.mockResolvedValue({});
    await service.updatePref(user, { channel: 'EMAIL', eventType: 'nota.lancada', enabled: false });
    expect(mockRepo.upsertPref).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1', enabled: false }),
    );
  });
});

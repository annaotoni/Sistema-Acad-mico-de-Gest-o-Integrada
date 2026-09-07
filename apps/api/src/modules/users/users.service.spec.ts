import { NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};
const mockAudit = { log: jest.fn() };

const makeService = () => new UsersService(mockPrisma as any, mockAudit as any);

const existingUser = {
  id: 'user-1',
  email: 'aluno@test.com',
  role: Role.ALUNO,
  tenantId: 'tenant-1',
};

beforeEach(() => jest.clearAllMocks());

describe('updateRole', () => {
  it('lança NotFoundException se usuário não existe', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    await expect(
      makeService().updateRole('user-x', Role.PROFESSOR, 'admin-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(mockAudit.log).not.toHaveBeenCalled();
  });

  it('atualiza role e registra AuditLog com valor antigo e novo', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(existingUser);
    mockPrisma.user.update.mockResolvedValue({
      ...existingUser,
      role: Role.PROFESSOR,
    });
    mockAudit.log.mockResolvedValue({});

    const result = await makeService().updateRole(
      'user-1',
      Role.PROFESSOR,
      'admin-1',
    );

    expect(result.role).toBe(Role.PROFESSOR);
    expect(mockAudit.log).toHaveBeenCalledWith({
      entity: 'User',
      entityId: 'user-1',
      userId: 'admin-1',
      action: 'ROLE_CHANGE',
      oldValue: { role: Role.ALUNO },
      newValue: { role: Role.PROFESSOR },
    });
  });

  it('AuditLog registrado mesmo que role seja igual (idempotência deliberada)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(existingUser);
    mockPrisma.user.update.mockResolvedValue(existingUser);
    mockAudit.log.mockResolvedValue({});

    await makeService().updateRole('user-1', Role.ALUNO, 'admin-1');
    expect(mockAudit.log).toHaveBeenCalled();
  });
});

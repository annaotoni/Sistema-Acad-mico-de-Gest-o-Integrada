import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DocumentStatus, Role } from '@prisma/client';
import { DocumentsService } from './documents.service';

const mockRepo = {
  create: jest.fn(),
  findById: jest.fn(),
  findByStudent: jest.fn(),
  findByTenant: jest.fn(),
  update: jest.fn(),
};
const mockPdf = { generate: jest.fn() };
const mockNotifications = { publish: jest.fn() };
const mockAudit = { log: jest.fn() };

const makeService = () =>
  new DocumentsService(mockRepo as any, mockPdf as any, mockNotifications as any, mockAudit as any);

const secretaria = { sub: 'sec-1', role: Role.SECRETARIA, tenantId: 'tenant-1', jti: '', iat: 0, exp: 0 };
const aluno = { sub: 'aluno-1', role: Role.ALUNO, tenantId: 'tenant-1', jti: '', iat: 0, exp: 0 };

const solicitadoDoc = {
  id: 'doc-1',
  studentId: 'aluno-1',
  type: 'Declaração de Matrícula',
  status: DocumentStatus.SOLICITADO,
  fileUrl: null,
  notes: null,
  student: { id: 'aluno-1', email: 'aluno@test.com' },
};

beforeEach(() => jest.clearAllMocks());

describe('getDocument', () => {
  it('aluno não vê documento de outro aluno', async () => {
    mockRepo.findById.mockResolvedValue({ ...solicitadoDoc, studentId: 'outro' });
    await expect(makeService().getDocument('doc-1', aluno)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('lança NotFoundException quando não existe', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(makeService().getDocument('doc-x', secretaria)).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('review', () => {
  it('recusa documento, grava AuditLog e notifica', async () => {
    mockRepo.findById.mockResolvedValue(solicitadoDoc);
    mockRepo.update.mockResolvedValue({});
    mockAudit.log.mockResolvedValue({});
    mockNotifications.publish.mockResolvedValue(undefined);

    await makeService().review('doc-1', { action: 'reject', notes: 'Inválido' }, secretaria);

    expect(mockRepo.update).toHaveBeenCalledWith('doc-1', expect.objectContaining({ status: DocumentStatus.RECUSADO }));
    expect(mockAudit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'RECUSADO' }));
    expect(mockNotifications.publish).toHaveBeenCalled();
  });

  it('aprova: gera PDF, marca EMITIDO e grava AuditLog', async () => {
    mockRepo.findById
      .mockResolvedValueOnce(solicitadoDoc)
      .mockResolvedValueOnce({ ...solicitadoDoc, status: DocumentStatus.EMITIDO });
    mockRepo.update.mockResolvedValue({});
    mockPdf.generate.mockResolvedValue(Buffer.from('pdf'));
    mockAudit.log.mockResolvedValue({});
    mockNotifications.publish.mockResolvedValue(undefined);

    await makeService().review('doc-1', { action: 'approve' }, secretaria);

    expect(mockPdf.generate).toHaveBeenCalled();
    expect(mockRepo.update).toHaveBeenCalledWith('doc-1', expect.objectContaining({ status: DocumentStatus.EMITIDO }));
    expect(mockAudit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'EMITIDO' }));
  });

  it('rejeita ação em documento já finalizado', async () => {
    mockRepo.findById.mockResolvedValue({ ...solicitadoDoc, status: DocumentStatus.EMITIDO });
    await expect(makeService().review('doc-1', { action: 'approve' }, secretaria))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(mockAudit.log).not.toHaveBeenCalled();
  });
});

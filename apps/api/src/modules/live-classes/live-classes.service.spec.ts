import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { LiveClassStatus, Role } from '@prisma/client';
import { LiveClassesService } from './live-classes.service';

const mockRepo = {
  create: jest.fn(),
  findById: jest.fn(),
  findByClass: jest.fn(),
  findUpcomingForStudent: jest.fn(),
  findActiveStudentIds: jest.fn(),
  update: jest.fn(),
  setRecordingMaterial: jest.fn(),
  createRecordingMaterial: jest.fn(),
};
const mockNotifications = { publish: jest.fn() };

const makeService = () =>
  new LiveClassesService(mockRepo as any, mockNotifications as any);

const professor = {
  sub: 'prof-1',
  role: Role.PROFESSOR,
  tenantId: 'tenant-1',
  jti: '',
  iat: 0,
  exp: 0,
};
const aluno = {
  sub: 'aluno-1',
  role: Role.ALUNO,
  tenantId: 'tenant-1',
  jti: '',
  iat: 0,
  exp: 0,
};

const agendadaClass = {
  id: 'lc-1',
  classId: 'class-1',
  title: 'Aula de Cálculo',
  status: LiveClassStatus.AGENDADA,
};

beforeEach(() => jest.clearAllMocks());

describe('getUpcoming', () => {
  it('proíbe acesso de não-aluno', async () => {
    await expect(makeService().getUpcoming(professor)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('retorna próximas aulas do aluno', async () => {
    mockRepo.findUpcomingForStudent.mockResolvedValue([agendadaClass]);
    const result = await makeService().getUpcoming(aluno);
    expect(result).toHaveLength(1);
    expect(mockRepo.findUpcomingForStudent).toHaveBeenCalledWith('aluno-1');
  });
});

describe('update', () => {
  it('lança NotFoundException se não existe', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(
      makeService().update('lc-x', {}, professor),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejeita transição inválida AGENDADA → ENCERRADA', async () => {
    mockRepo.findById.mockResolvedValue(agendadaClass);
    await expect(
      makeService().update(
        'lc-1',
        { status: LiveClassStatus.ENCERRADA },
        professor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('permite AGENDADA → AO_VIVO e notifica', async () => {
    mockRepo.findById.mockResolvedValue(agendadaClass);
    mockRepo.findActiveStudentIds.mockResolvedValue(['aluno-1']);
    mockRepo.update.mockResolvedValue({
      ...agendadaClass,
      status: LiveClassStatus.AO_VIVO,
    });
    mockNotifications.publish.mockResolvedValue(undefined);

    await makeService().update(
      'lc-1',
      { status: LiveClassStatus.AO_VIVO },
      professor,
    );
    expect(mockNotifications.publish).toHaveBeenCalled();
    expect(mockRepo.update).toHaveBeenCalledWith('lc-1', {
      status: LiveClassStatus.AO_VIVO,
    });
  });

  it('AO_VIVO → ENCERRADA com gravação vincula material', async () => {
    mockRepo.findById.mockResolvedValue({
      ...agendadaClass,
      status: LiveClassStatus.AO_VIVO,
    });
    mockRepo.createRecordingMaterial.mockResolvedValue({ id: 'mat-1' });
    mockRepo.setRecordingMaterial.mockResolvedValue({});
    mockRepo.update.mockResolvedValue({});
    mockNotifications.publish.mockResolvedValue(undefined);

    await makeService().update(
      'lc-1',
      { status: LiveClassStatus.ENCERRADA, recordingUrl: 'https://rec.url' },
      professor,
    );
    expect(mockRepo.createRecordingMaterial).toHaveBeenCalled();
    expect(mockRepo.setRecordingMaterial).toHaveBeenCalledWith('lc-1', 'mat-1');
  });
});

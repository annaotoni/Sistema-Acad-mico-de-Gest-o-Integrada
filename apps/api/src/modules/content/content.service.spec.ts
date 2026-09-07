import { NotFoundException } from '@nestjs/common';
import { ContentStatus } from '@prisma/client';
import type { AccessTokenPayload } from '../../common/interfaces/access-token-payload';
import { ContentService } from './content.service';

const mockRepo = {
  createLesson: jest.fn(),
  findLessonsByClass: jest.fn(),
  findLessonById: jest.fn(),
  updateLessonStatus: jest.fn(),
  createMaterial: jest.fn(),
  findMaterialsByClass: jest.fn(),
  findMaterialById: jest.fn(),
  updateMaterialStatus: jest.fn(),
};

const aluno: AccessTokenPayload = { sub: 'a1', jti: 'j1', role: 'ALUNO', tenantId: 't1', iat: 0, exp: 0 };
const professor: AccessTokenPayload = { sub: 'p1', jti: 'j2', role: 'PROFESSOR', tenantId: 't1', iat: 0, exp: 0 };

describe('ContentService', () => {
  let service: ContentService;

  beforeEach(() => {
    service = new ContentService(mockRepo as never);
    jest.clearAllMocks();
  });

  it('listLessons filtra PUBLISHED para ALUNO', () => {
    mockRepo.findLessonsByClass.mockResolvedValue([]);
    service.listLessons('c1', aluno);
    expect(mockRepo.findLessonsByClass).toHaveBeenCalledWith('c1', true);
  });

  it('listLessons retorna todos para PROFESSOR', () => {
    mockRepo.findLessonsByClass.mockResolvedValue([]);
    service.listLessons('c1', professor);
    expect(mockRepo.findLessonsByClass).toHaveBeenCalledWith('c1', false);
  });

  it('listMaterials filtra PUBLISHED para ALUNO', () => {
    mockRepo.findMaterialsByClass.mockResolvedValue([]);
    service.listMaterials('c1', aluno);
    expect(mockRepo.findMaterialsByClass).toHaveBeenCalledWith('c1', true);
  });

  it('updateLessonStatus lança NotFoundException para lição inexistente', async () => {
    mockRepo.findLessonById.mockResolvedValue(null);
    await expect(
      service.updateLessonStatus('l1', { status: ContentStatus.PUBLISHED }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updateMaterialStatus lança NotFoundException para material inexistente', async () => {
    mockRepo.findMaterialById.mockResolvedValue(null);
    await expect(
      service.updateMaterialStatus('m1', { status: ContentStatus.PUBLISHED }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EnrollmentStatus } from '@prisma/client';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import type { AccessTokenPayload } from '../interfaces/access-token-payload';
import { SCOPE_KEY } from '../decorators/require-scope.decorator';

@Injectable()
export class ScopeGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const scope = this.reflector.getAllAndOverride<string | undefined>(
      SCOPE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!scope) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const user = req.user as AccessTokenPayload;

    if (scope === 'class') {
      // Admin e Secretaria têm acesso irrestrito
      if (user.role === 'ADMIN' || user.role === 'SECRETARIA') return true;

      const classId = req.params['classId'] as string;
      if (!classId) throw new ForbiddenException('classId ausente na rota');

      if (user.role === 'PROFESSOR') {
        const link = await this.prisma.teacherAssignment.findUnique({
          where: { teacherId_classId: { teacherId: user.sub, classId } },
          select: { id: true },
        });
        if (!link) throw new ForbiddenException('Professor não vinculado à turma');
        return true;
      }

      if (user.role === 'ALUNO') {
        const link = await this.prisma.enrollment.findUnique({
          where: { studentId_classId: { studentId: user.sub, classId } },
          select: { status: true },
        });
        if (link?.status !== EnrollmentStatus.ATIVA) {
          throw new ForbiddenException('Matrícula inativa ou inexistente');
        }
        return true;
      }
    }

    return true;
  }
}

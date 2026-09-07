import { Injectable, NotFoundException } from '@nestjs/common';
import { Role, User } from '@prisma/client';
import { AuditService } from '../../common/audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByIdWithMfa(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        mfaEnabled: true,
        mfaSecret: true,
        role: true,
        tenantId: true,
      },
    });
  }

  // Troca de role sempre auditada — ponto único de alteração de permissão
  async updateRole(targetId: string, newRole: Role, actorId: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    const updated = await this.prisma.user.update({
      where: { id: targetId },
      data: { role: newRole },
    });

    await this.audit.log({
      entity: 'User',
      entityId: targetId,
      userId: actorId,
      action: 'ROLE_CHANGE',
      oldValue: { role: user.role },
      newValue: { role: newRole },
    });

    return updated;
  }
}

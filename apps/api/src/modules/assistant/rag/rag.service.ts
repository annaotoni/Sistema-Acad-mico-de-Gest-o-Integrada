import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

// ponytail: busca textual simples com ILIKE — trocar por pgvector (SELECT ... <=> embedding)
// quando a extensão vector for habilitada via migration e os documentos reindexados
@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Busca conhecimento institucional por similaridade textual
  async search(query: string, tenantId: string | null): Promise<string> {
    try {
      const rows = await (this.prisma as any).$queryRaw<{ content: string }[]>`
        SELECT content
        FROM knowledge_base
        WHERE tenant_id = ${tenantId}
          AND content ILIKE ${'%' + query.split(' ').join('%') + '%'}
        ORDER BY created_at DESC
        LIMIT 3
      `;
      if (!rows.length) return '';
      return rows.map((r) => r.content).join('\n\n');
    } catch {
      // Tabela ainda não existe (migration pendente) — retorna vazio sem travar
      this.logger.debug('knowledge_base table not found, skipping RAG');
      return '';
    }
  }

  // Ingere documento institucional na base de conhecimento
  async ingest(data: {
    tenantId: string;
    title: string;
    content: string;
    source: string;
  }): Promise<void> {
    await (this.prisma as any).$executeRaw`
      INSERT INTO knowledge_base (id, tenant_id, title, content, source, created_at)
      VALUES (gen_random_uuid(), ${data.tenantId}, ${data.title}, ${data.content}, ${data.source}, now())
      ON CONFLICT (tenant_id, source) DO UPDATE
        SET content = EXCLUDED.content, title = EXCLUDED.title
    `;
  }
}

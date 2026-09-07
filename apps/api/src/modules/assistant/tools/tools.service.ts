import { Injectable } from '@nestjs/common';
import type { AccessTokenPayload } from '../../../common/interfaces/access-token-payload';
import { FinanceService } from '../../finance/finance.service';
import { GradesService } from '../../grades/grades.service';
import { AttendanceService } from '../../attendance/attendance.service';
import { LiveClassesService } from '../../live-classes/live-classes.service';
import { DocumentsService } from '../../documents/documents.service';
import { TicketsService } from '../../tickets/tickets.service';
import { AssignmentsService } from '../../assignments/assignments.service';
import type { LlmTool } from '../../../integrations/llm/llm-provider.interface';

// Toda tool executa no contexto de segurança do req.user — mesma filtragem dos services
@Injectable()
export class ToolsService {
  constructor(
    private readonly finance: FinanceService,
    private readonly grades: GradesService,
    private readonly attendance: AttendanceService,
    private readonly liveClasses: LiveClassesService,
    private readonly documents: DocumentsService,
    private readonly tickets: TicketsService,
    private readonly assignments: AssignmentsService,
  ) {}

  // Definições enviadas ao LLM para tool-calling
  getToolDefinitions(): LlmTool[] {
    return [
      {
        name: 'consultarFaturas',
        description:
          'Lista faturas e mensalidades do aluno logado, com status e vencimento.',
        input_schema: { type: 'object', properties: {} },
      },
      {
        name: 'consultarNotas',
        description:
          'Retorna as notas do aluno logado. Informe classId se quiser filtrar por turma.',
        input_schema: {
          type: 'object',
          properties: {
            classId: { type: 'string', description: 'ID da turma (opcional)' },
          },
        },
      },
      {
        name: 'consultarFrequencia',
        description:
          'Retorna o registro de frequência do aluno logado em uma turma.',
        input_schema: {
          type: 'object',
          properties: {
            classId: { type: 'string', description: 'ID da turma' },
          },
          required: ['classId'],
        },
      },
      {
        name: 'proximasAulasAoVivo',
        description:
          'Lista as próximas aulas ao vivo agendadas para o aluno logado.',
        input_schema: { type: 'object', properties: {} },
      },
      {
        name: 'statusDocumento',
        description:
          'Lista os documentos solicitados pelo aluno logado e seus status.',
        input_schema: { type: 'object', properties: {} },
      },
      {
        name: 'meusProtocolos',
        description: 'Lista os protocolos (tickets) abertos pelo aluno logado.',
        input_schema: { type: 'object', properties: {} },
      },
      {
        name: 'proximosPrazos',
        description:
          'Lista atividades com prazo próximo em uma turma específica do aluno.',
        input_schema: {
          type: 'object',
          properties: {
            classId: { type: 'string', description: 'ID da turma' },
          },
          required: ['classId'],
        },
      },
    ];
  }

  // Executa a tool pelo nome, passando o usuário logado — não reimplementa regra nenhuma
  async execute(
    name: string,
    input: Record<string, unknown>,
    user: AccessTokenPayload,
  ): Promise<unknown> {
    switch (name) {
      case 'consultarFaturas':
        return this.finance.listInvoices(user);

      case 'consultarNotas':
        if (!input['classId'])
          return { error: 'classId é obrigatório para consultar notas' };
        return this.grades.listGrades(input['classId'] as string, user);

      case 'consultarFrequencia':
        if (!input['classId']) return { error: 'classId é obrigatório' };
        return this.attendance.listAttendance(input['classId'] as string, user);

      case 'proximasAulasAoVivo':
        return this.liveClasses.getUpcoming(user);

      case 'statusDocumento':
        return this.documents.listDocuments(user);

      case 'meusProtocolos':
        return this.tickets.list(user);

      case 'proximosPrazos':
        if (!input['classId']) return { error: 'classId é obrigatório' };
        return this.assignments.listAssignments(input['classId'] as string);

      default:
        return { error: `Tool desconhecida: ${name}` };
    }
  }
}

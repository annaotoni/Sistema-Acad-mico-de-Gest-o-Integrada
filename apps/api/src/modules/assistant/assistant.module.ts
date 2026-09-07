import { Module } from '@nestjs/common';
import { LLM_PROVIDER } from '../../integrations/llm/llm-provider.interface';
import { AnthropicProvider } from '../../integrations/llm/anthropic.provider';
import { AttendanceModule } from '../attendance/attendance.module';
import { AssignmentsModule } from '../assignments/assignments.module';
import { DocumentsModule } from '../documents/documents.module';
import { FinanceModule } from '../finance/finance.module';
import { GradesModule } from '../grades/grades.module';
import { LiveClassesModule } from '../live-classes/live-classes.module';
import { TicketsModule } from '../tickets/tickets.module';
import { AssistantRepository } from './assistant.repository';
import { AgentService } from './agent.service';
import { RagService } from './rag/rag.service';
import { ToolsService } from './tools/tools.service';
import { AssistantController } from './assistant.controller';

@Module({
  imports: [
    FinanceModule,
    GradesModule,
    AttendanceModule,
    LiveClassesModule,
    DocumentsModule,
    TicketsModule,
    AssignmentsModule,
  ],
  controllers: [AssistantController],
  providers: [
    AssistantRepository,
    AgentService,
    RagService,
    ToolsService,
    { provide: LLM_PROVIDER, useClass: AnthropicProvider },
  ],
})
export class AssistantModule {}

import { Module } from '@nestjs/common';
import { RoleGuard } from '../../common/guards/role.guard';
import { ScopeGuard } from '../../common/guards/scope.guard';
import { AssignmentsController } from './assignments.controller';
import { AssignmentsRepository } from './assignments.repository';
import { AssignmentsService } from './assignments.service';

@Module({
  controllers: [AssignmentsController],
  providers: [AssignmentsService, AssignmentsRepository, RoleGuard, ScopeGuard],
  exports: [AssignmentsService],
})
export class AssignmentsModule {}

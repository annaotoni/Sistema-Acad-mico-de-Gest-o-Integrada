import { Module } from '@nestjs/common';
import { RoleGuard } from '../../common/guards/role.guard';
import { ScopeGuard } from '../../common/guards/scope.guard';
import { GradesController } from './grades.controller';
import { GradesRepository } from './grades.repository';
import { GradesService } from './grades.service';

@Module({
  controllers: [GradesController],
  providers: [GradesService, GradesRepository, RoleGuard, ScopeGuard],
})
export class GradesModule {}

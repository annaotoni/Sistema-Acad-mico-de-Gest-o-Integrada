import { Module } from '@nestjs/common';
import { RoleGuard } from '../../common/guards/role.guard';
import { ScopeGuard } from '../../common/guards/scope.guard';
import { AttendanceController } from './attendance.controller';
import { AttendanceRepository } from './attendance.repository';
import { AttendanceService } from './attendance.service';

@Module({
  controllers: [AttendanceController],
  providers: [AttendanceService, AttendanceRepository, RoleGuard, ScopeGuard],
  exports: [AttendanceService],
})
export class AttendanceModule {}

import {
  Body,
  Controller,
  Get,
  Param,
  ParseBoolPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequireScope } from '../../common/decorators/require-scope.decorator';
import { RoleGuard } from '../../common/guards/role.guard';
import { ScopeGuard } from '../../common/guards/scope.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AccessTokenPayload } from '../../common/interfaces/access-token-payload';
import { AttendanceService } from './attendance.service';
import { RecordAttendanceDto } from './dto/record-attendance.dto';

@UseGuards(JwtAuthGuard, RoleGuard, ScopeGuard)
@Controller('classes')
export class AttendanceController {
  constructor(private readonly service: AttendanceService) {}

  @Roles('ADMIN', 'SECRETARIA', 'PROFESSOR')
  @Post(':classId/attendance')
  @RequireScope('class')
  recordBulk(
    @Param('classId', ParseUUIDPipe) classId: string,
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: RecordAttendanceDto,
  ) {
    return this.service.recordBulk(classId, dto, user);
  }

  @Get(':classId/attendance')
  @RequireScope('class')
  listAttendance(@Param('classId', ParseUUIDPipe) classId: string) {
    return this.service.listAttendance(classId);
  }

  @Roles('ADMIN', 'SECRETARIA', 'PROFESSOR')
  @Patch(':classId/attendance/:recordId')
  @RequireScope('class')
  updateAttendance(
    @Param('recordId', ParseUUIDPipe) recordId: string,
    @Query('present', ParseBoolPipe) present: boolean,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    return this.service.updateAttendance(recordId, present, user);
  }
}

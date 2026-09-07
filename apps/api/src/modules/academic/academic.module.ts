import { Module } from '@nestjs/common';
import { FeatureGuard } from '../../common/guards/feature.guard';
import { RoleGuard } from '../../common/guards/role.guard';
import { ScopeGuard } from '../../common/guards/scope.guard';
import { AcademicController } from './academic.controller';
import { AcademicRepository } from './academic.repository';
import { AcademicService } from './academic.service';
import { ClassesController } from './classes.controller';

@Module({
  controllers: [AcademicController, ClassesController],
  providers: [AcademicService, AcademicRepository, FeatureGuard, RoleGuard, ScopeGuard],
  exports: [AcademicService],
})
export class AcademicModule {}

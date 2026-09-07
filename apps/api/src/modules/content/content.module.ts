import { Module } from '@nestjs/common';
import { RoleGuard } from '../../common/guards/role.guard';
import { ScopeGuard } from '../../common/guards/scope.guard';
import { ContentController } from './content.controller';
import { ContentRepository } from './content.repository';
import { ContentService } from './content.service';

@Module({
  controllers: [ContentController],
  providers: [ContentService, ContentRepository, RoleGuard, ScopeGuard],
})
export class ContentModule {}

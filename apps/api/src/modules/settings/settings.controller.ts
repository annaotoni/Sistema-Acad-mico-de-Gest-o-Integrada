import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AccessTokenPayload } from '../../common/interfaces/access-token-payload';
import { SettingsService } from './settings.service';

@UseGuards(JwtAuthGuard)
@Controller('me')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get('features')
  getFeatures(@CurrentUser() user: AccessTokenPayload) {
    return this.settings.resolveFeatures(user);
  }
}

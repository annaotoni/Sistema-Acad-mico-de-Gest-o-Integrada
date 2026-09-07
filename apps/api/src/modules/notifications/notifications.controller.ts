import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AccessTokenPayload } from '../../common/interfaces/access-token-payload';
import { NotificationsService } from './notifications.service';
import { UpdateNotificationPrefDto } from './dto/update-notification-pref.dto';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: AccessTokenPayload) {
    return this.service.listNotifications(user);
  }

  @Get('count')
  count(@CurrentUser() user: AccessTokenPayload) {
    return this.service.countUnread(user);
  }

  @Patch(':id/read')
  markAsRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    return this.service.markAsRead(id, user);
  }

  @Patch('read-all')
  markAllAsRead(@CurrentUser() user: AccessTokenPayload) {
    return this.service.markAllAsRead(user);
  }

  @Get('prefs')
  getPrefs(@CurrentUser() user: AccessTokenPayload) {
    return this.service.getPrefs(user);
  }

  @Put('prefs')
  updatePref(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: UpdateNotificationPrefDto,
  ) {
    return this.service.updatePref(user, dto);
  }
}

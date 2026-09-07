import { IsBoolean, IsEnum, IsString } from 'class-validator';
import { NotificationChannel } from '@prisma/client';

export class UpdateNotificationPrefDto {
  @IsEnum(NotificationChannel)
  channel!: NotificationChannel;

  @IsString()
  eventType!: string;

  @IsBoolean()
  enabled!: boolean;
}

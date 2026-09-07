import { IsEnum } from 'class-validator';
import { ContentStatus } from '@prisma/client';

export class UpdateContentStatusDto {
  @IsEnum(ContentStatus)
  status!: ContentStatus;
}

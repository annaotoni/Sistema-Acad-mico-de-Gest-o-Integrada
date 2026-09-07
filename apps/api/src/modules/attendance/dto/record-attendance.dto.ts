import { Type } from 'class-transformer';
import {
  IsArray,
  IsISO8601,
  IsOptional,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { AttendanceEntryDto } from './attendance-entry.dto';

export class RecordAttendanceDto {
  @IsISO8601({ strict: true })
  date!: string;

  @IsUUID()
  @IsOptional()
  lessonId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceEntryDto)
  records!: AttendanceEntryDto[];
}

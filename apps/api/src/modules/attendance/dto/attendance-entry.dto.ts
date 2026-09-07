import { IsBoolean, IsUUID } from 'class-validator';

export class AttendanceEntryDto {
  @IsUUID()
  studentId!: string;

  @IsBoolean()
  present!: boolean;
}

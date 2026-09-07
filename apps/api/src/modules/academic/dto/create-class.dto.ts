import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateClassDto {
  @IsUUID()
  disciplineId!: string;

  @IsUUID()
  periodId!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  maxStudents?: number;
}

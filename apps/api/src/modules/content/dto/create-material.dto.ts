import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateMaterialDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  url!: string;

  @IsString()
  @IsNotEmpty()
  type!: string;

  @IsUUID()
  @IsOptional()
  lessonId?: string;
}

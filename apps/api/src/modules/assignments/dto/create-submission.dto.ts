import { IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateSubmissionDto {
  @IsString()
  @IsOptional()
  content?: string;

  @IsUrl()
  @IsOptional()
  fileUrl?: string;
}

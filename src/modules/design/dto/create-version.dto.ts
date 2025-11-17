import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateVersionDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}

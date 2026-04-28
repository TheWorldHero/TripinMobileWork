import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class MarkMediaReadyDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  storageKey?: string;
}


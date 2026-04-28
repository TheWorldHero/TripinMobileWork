import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsInt, IsOptional, Min } from 'class-validator';

export class AutoAssembleTripDto {
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(300)
  mediaAssetIds?: string[];

  @ApiPropertyOptional({ default: 120 })
  @IsOptional()
  @IsInt()
  @Min(30)
  timeGapMinutes?: number = 120;

  @ApiPropertyOptional({ default: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  distanceGapKm?: number = 5;
}


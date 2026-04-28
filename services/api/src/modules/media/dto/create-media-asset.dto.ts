import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateMediaAssetDto {
  @ApiProperty()
  @IsString()
  @MaxLength(255)
  originalName: string;

  @ApiProperty()
  @IsString()
  @MaxLength(128)
  mimeType: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  bytes: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  width?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  height?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  takenAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  exifLatitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  exifLongitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  caption?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tripId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tripPointId?: string;
}


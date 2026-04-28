import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PlaceProvider } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreatePlaceDto {
  @ApiProperty({ enum: PlaceProvider, default: PlaceProvider.MANUAL })
  @IsEnum(PlaceProvider)
  provider: PlaceProvider = PlaceProvider.MANUAL;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  providerId?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shortName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  formattedAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  provinceName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cityName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  districtName?: string;

  @ApiPropertyOptional({ default: 'CN' })
  @IsOptional()
  @IsString()
  countryCode?: string = 'CN';

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  longitude?: number;
}


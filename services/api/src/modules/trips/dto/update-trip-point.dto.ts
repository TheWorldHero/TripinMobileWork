import { PartialType } from '@nestjs/swagger';
import { CreateTripPointDto } from './create-trip-point.dto';

export class UpdateTripPointDto extends PartialType(CreateTripPointDto) {}


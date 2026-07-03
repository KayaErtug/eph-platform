import { Type } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";

export class LinaDistancePointDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  district?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  neighborhood?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  placeId?: string;
}

export class LinaDistanceRequestDto {
  @ValidateNested()
  @Type(() => LinaDistancePointDto)
  origin!: LinaDistancePointDto;

  @ValidateNested()
  @Type(() => LinaDistancePointDto)
  destination!: LinaDistancePointDto;

  @IsOptional()
  @IsIn(["TRAFFIC_AWARE", "TRAFFIC_UNAWARE"])
  routingPreference?: "TRAFFIC_AWARE" | "TRAFFIC_UNAWARE";

  @IsOptional()
  @IsBoolean()
  avoidFerries?: boolean;

  @IsOptional()
  @IsBoolean()
  avoidTolls?: boolean;

  @IsOptional()
  @IsBoolean()
  avoidHighways?: boolean;
}

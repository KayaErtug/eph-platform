import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class LinkPoolUnitDto {
  @IsOptional()
  @IsString()
  customerInterestId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  matchScore?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  matchReasons?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  createFollowUpTask?: boolean;

  @IsOptional()
  @IsDateString()
  followUpDate?: string;
}

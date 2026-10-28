import { IsString, MaxLength, MinLength } from 'class-validator';

export class LinaNetworkRequestDraftDto {
  @IsString()
  @MinLength(8)
  @MaxLength(1500)
  message!: string;
}

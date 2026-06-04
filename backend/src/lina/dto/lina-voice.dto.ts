import { IsIn, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class LinaVoiceDto {
  @IsString()
  @MinLength(1)
  text!: string;

  @IsOptional()
  @IsIn(['dashboard', 'crm', 'network', 'pool', 'notifications', 'general'])
  sourceModule?: 'dashboard' | 'crm' | 'network' | 'pool' | 'notifications' | 'general';

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(4)
  priorityLevel?: 0 | 1 | 2 | 3 | 4;
}
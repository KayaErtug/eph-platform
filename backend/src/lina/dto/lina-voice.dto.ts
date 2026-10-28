import { IsIn, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';
import { LINA_CHAT_SOURCE_MODULES } from '../lina-source-module';
import type { LinaChatSourceModule } from '../lina-source-module';

export class LinaVoiceDto {
  @IsString()
  @MinLength(1)
  text!: string;

  @IsOptional()
  @IsIn([...LINA_CHAT_SOURCE_MODULES])
  sourceModule?: LinaChatSourceModule;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(4)
  priorityLevel?: 0 | 1 | 2 | 3 | 4;
}
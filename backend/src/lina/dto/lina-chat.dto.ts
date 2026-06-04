import { IsBoolean, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class LinaChatDto {
  @IsString()
  @MinLength(1)
  message!: string;

  @IsOptional()
  @IsIn(['dashboard', 'crm', 'network', 'pool', 'notifications', 'general'])
  sourceModule?: 'dashboard' | 'crm' | 'network' | 'pool' | 'notifications' | 'general';

  @IsOptional()
  @IsBoolean()
  wantsVoice?: boolean;
}
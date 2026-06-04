import { IsBoolean, IsIn, IsOptional, IsString, Matches } from 'class-validator';

export class LinaPreferencesDto {
  @IsOptional()
  @IsBoolean()
  voiceEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  dashboardVoiceSummaryEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  crmVoiceReminderEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  networkVoiceSummaryEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  poolVoiceSummaryEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  quietHoursEnabled?: boolean;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  quietHoursStart?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  quietHoursEnd?: string;

  @IsOptional()
  @IsBoolean()
  urgentVoiceEnabled?: boolean;

  @IsOptional()
  @IsIn(['short', 'normal', 'detailed'])
  summaryStyle?: 'short' | 'normal' | 'detailed';
}
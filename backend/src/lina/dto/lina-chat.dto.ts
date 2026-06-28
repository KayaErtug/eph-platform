import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";

export class LinaChatHistoryItemDto {
  @IsIn(["user", "assistant"])
  role!: "user" | "assistant";

  @IsString()
  @MaxLength(4000)
  content!: string;
}

export class LinaChatDto {
  @IsString()
  @MinLength(1)
  message!: string;

  @IsOptional()
  @IsIn(["dashboard", "crm", "network", "pool", "notifications", "general"])
  sourceModule?:
    | "dashboard"
    | "crm"
    | "network"
    | "pool"
    | "notifications"
    | "general";

  @IsOptional()
  @IsBoolean()
  wantsVoice?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => LinaChatHistoryItemDto)
  history?: LinaChatHistoryItemDto[];
}

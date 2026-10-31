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
import { LINA_CHAT_SOURCE_MODULES } from "../lina-source-module";
import type { LinaChatSourceModule } from "../lina-source-module";

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
  @IsIn([...LINA_CHAT_SOURCE_MODULES])
  sourceModule?: LinaChatSourceModule;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  confirmationId?: string;

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

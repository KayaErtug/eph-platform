export class CreateSystemMessageDto {
  visibleSenderName!: string;

  targetType!: string;

  targetUserId?: string;

  targetRole?: string;

  category!: string;

  customCategory?: string;

  title!: string;

  body!: string;
}
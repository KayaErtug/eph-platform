export class SendSystemMessageDto {
  senderId!: string;

  targetType!:
    | 'USER'
    | 'ROLE'
    | 'ALL';

  targetUserId?: string;

  targetRole?:
    | 'EMLAKCI'
    | 'MUTEAHHIT'
    | 'INSAAT_FIRMASI'
    | 'ADMIN'
    | 'SUPER_ADMIN';

  category!: string;

  customCategory?: string;

  title!: string;

  body!: string;
}
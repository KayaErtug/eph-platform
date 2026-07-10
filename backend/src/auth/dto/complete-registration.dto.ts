import { IsString } from 'class-validator';

export class CompleteRegistrationDto {
  @IsString()
  pendingRegistrationId: string;
}

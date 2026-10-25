import { IsNotEmpty, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class SendMessageDto {
  @IsUUID('4', { message: 'conversationId must be a valid UUID' })
  @IsNotEmpty({ message: 'conversationId is required' })
  conversationId!: string;

  @IsString({ message: 'content must be a string' })
  @IsNotEmpty({ message: 'content cannot be empty' })
  @MinLength(1, { message: 'content must be at least 1 character' })
  @MaxLength(4000, { message: 'content cannot exceed 4000 characters' })
  content!: string;
}

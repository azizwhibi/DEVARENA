import { IsIn, IsNotEmpty } from 'class-validator';

export class RespondInvitationDto {
  @IsIn(['accepted', 'declined'], {
    message: 'status must be either accepted or declined',
  })
  @IsNotEmpty({ message: 'status is required' })
  status!: 'accepted' | 'declined';
}

import { IsIn } from 'class-validator';

export class SetRoleDto {
  @IsIn(['admin', 'developer', 'recruiter'])
  role!: 'admin' | 'developer' | 'recruiter';
}

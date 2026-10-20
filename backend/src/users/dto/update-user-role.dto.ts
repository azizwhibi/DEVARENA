import { IsIn, IsOptional } from 'class-validator';

export class UpdateUserRoleDto {
  @IsOptional()
  @IsIn(['admin', 'developer', 'recruiter'])
  new_role?: 'admin' | 'developer' | 'recruiter';

  @IsOptional()
  @IsIn(['admin', 'developer', 'recruiter'])
  role?: 'admin' | 'developer' | 'recruiter';

  get effectiveRole(): 'admin' | 'developer' | 'recruiter' {
    return this.new_role ?? this.role ?? 'developer';
  }
}

// Alias de compatibilité
export { UpdateUserRoleDto as SetRoleDto };

import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateUserStatusDto {
  @IsOptional()
  @IsIn(['active', 'suspended'])
  new_status?: 'active' | 'suspended';

  @IsOptional()
  @IsIn(['active', 'suspended'])
  status?: 'active' | 'suspended';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }: { value: unknown }): string =>
    typeof value === 'string' ? value.trim() : (value as string),
  )
  reason?: string;

  get effectiveStatus(): 'active' | 'suspended' {
    return this.new_status ?? this.status ?? 'active';
  }

  get effectiveReason(): string {
    return this.reason?.trim() || 'Administrative status update';
  }
}

// Alias de compatibilité
export { UpdateUserStatusDto as SetStatusDto };

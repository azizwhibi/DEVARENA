import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { IsIsoCountry } from './is-iso-country.decorator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9_]{3,24}$/, {
    message: 'Username must be 3-24 alphanumeric characters or underscores',
  })
  username?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(280)
  bio?: string | null;

  @IsOptional()
  @IsIsoCountry()
  country?: string | null;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(120)
  institution?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20, {
    message: 'technologyIds cannot contain more than 20 items',
  })
  @ArrayUnique({ message: 'technologyIds must contain unique values' })
  @IsUUID('4', {
    each: true,
    message: 'Each technology ID must be a valid UUID',
  })
  technologyIds?: string[];

  @IsOptional()
  @IsIn(['public', 'private'], {
    message: 'Visibility must be either public or private',
  })
  visibility?: 'public' | 'private';

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Matches(/^https:\/\//, {
    message: 'avatarUrl must be a secure HTTPS URL',
  })
  avatarUrl?: string | null;
}

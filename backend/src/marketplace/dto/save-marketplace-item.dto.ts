import { Transform, Type } from 'class-transformer';
import {
  isUUID,
  IsDefined,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  MaxLength,
  Min,
  Validate,
  ValidateIf,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import type { MarketplaceKind, MarketplaceStatus } from '../marketplace.types';

@ValidatorConstraint({ name: 'animationKeyForKind', async: false })
class AnimationKeyForKind implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    const dto = args.object as SaveMarketplaceItemDto;
    if (dto.kind !== 'animation') return value === undefined;
    return typeof value === 'string' && value.length > 0 && value.length <= 80;
  }

  defaultMessage(args: ValidationArguments): string {
    const dto = args.object as SaveMarketplaceItemDto;
    return dto.kind === 'animation'
      ? 'animation_key must be a non-empty string up to 80 characters'
      : 'animation_key is only allowed when kind is animation';
  }
}

@ValidatorConstraint({ name: 'challengeIdForKind', async: false })
class ChallengeIdForKind implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    const dto = args.object as SaveMarketplaceItemDto;
    if (dto.kind !== 'hint') return value === undefined;
    if (value === undefined || value === null)
      return dto.status !== 'published';
    return typeof value === 'string' && isUUID(value);
  }

  defaultMessage(args: ValidationArguments): string {
    const dto = args.object as SaveMarketplaceItemDto;
    return dto.kind === 'hint'
      ? 'challenge_id must be a UUID when the hint is published'
      : 'challenge_id is only allowed when kind is hint';
  }
}

export class SaveMarketplaceItemDto {
  @IsIn(['icon', 'animation', 'hint'])
  kind!: MarketplaceKind;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title!: string;

  @IsDefined()
  @IsString()
  @MaxLength(4000)
  description!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  price_credits!: number;

  @IsIn(['draft', 'published', 'archived'])
  status!: MarketplaceStatus;

  @IsDefined()
  @IsString()
  @MaxLength(80)
  preview!: string;

  @Validate(AnimationKeyForKind)
  animation_key?: string;

  @Validate(ChallengeIdForKind)
  challenge_id?: string;

  @ValidateIf((dto: SaveMarketplaceItemDto) => dto.kind === 'hint')
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  hint_body?: string;
}

import { IsIn } from 'class-validator';

export class UnequipDto {
  @IsIn(['icon', 'animation'])
  slot!: 'icon' | 'animation';
}

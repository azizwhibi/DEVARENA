import { IsUUID } from 'class-validator';

export class EquipDto {
  @IsUUID()
  item_id!: string;
}

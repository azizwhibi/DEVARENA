import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class KnowledgeStore {
  readonly db: SupabaseClient;
  private readonly logger = new Logger(KnowledgeStore.name);
  constructor(identity: SupabaseService) {
    this.db = identity.client as unknown as SupabaseClient;
  }
  check(error: { code?: string; message: string } | null): void {
    if (!error) return;
    if (error.code === 'P0002' || error.code === 'PGRST116')
      throw new NotFoundException('Ressource introuvable.');
    if (error.code === '23505')
      throw new ConflictException('Cette ressource existe déjà.');
    if (['23514', '23502', '23503', '22P02'].includes(error.code ?? ''))
      throw new BadRequestException(
        'Vérifiez les champs et les associations de la ressource.',
      );
    this.logger.error(error.message);
    throw new InternalServerErrorException(
      'Impossible de charger les connaissances. Vérifiez la migration Knowledge.',
    );
  }
}

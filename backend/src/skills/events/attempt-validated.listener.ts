import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SupabaseService } from '../skills-database.service';
import { SkillProgressService } from '../skill-progress.service';
import {
  ATTEMPT_VALIDATED,
  AttemptValidatedEvent,
} from './attempt-validated.event';

@Injectable()
export class AttemptValidatedListener {
  private readonly logger = new Logger(AttemptValidatedListener.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly progress: SkillProgressService,
  ) {}

  @OnEvent(ATTEMPT_VALIDATED, { suppressErrors: false })
  async handle(event: AttemptValidatedEvent) {
    try {
      const { data, error } = await this.supabase.client
        .from('challenge_skills')
        .select('skill_id')
        .eq('challenge_id', event.challengeId);
      if (error) throw error;

      for (const row of data ?? []) {
        await this.progress.recalculate(event.userId, row.skill_id as string);
      }
      return true;
    } catch {
      this.logger.warn('Skill progress recalculation failed.');
      if (event.requireSuccess)
        throw new Error('Skill progress recalculation failed.');
    }
  }
}

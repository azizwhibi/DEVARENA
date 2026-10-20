import { AuthModule } from '../auth/auth.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { SupabaseService } from './skills-database.service';
import { SkillsDirectoryController } from './skills-directory.controller';
import { Module } from '@nestjs/common';
import { SkillsController } from './skills.controller';
import { SkillsService } from './skills.service';
import { SkillProgressService } from './skill-progress.service';
import { MeSkillsController } from './me-skills.controller';
import { ProgressAdminController } from './progress-admin.controller';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { TechnologiesController } from './technologies.controller';
import { TechnologiesService } from './technologies.service';
import { ChallengeSkillsController } from './challenge-skills.controller';
import { ChallengeSkillsService } from './challenge-skills.service';
import { AttemptValidatedListener } from './events/attempt-validated.listener';
import { AI_PROVIDER_TOKEN } from './ai/ai-provider.interface';
import { HttpAiProvider } from './ai/http-ai-provider';
import { AiCoachService } from './ai/ai-coach.service';
import { AiCoachController } from './ai/ai-coach.controller';

import {
  MeSkillChallengesController,
  SkillStatsController,
} from './skill-insights.controller';
import { SkillInsightsService } from './skill-insights.service';

@Module({
  imports: [AuthModule, SupabaseModule],
  controllers: [
    SkillsDirectoryController,
    SkillsController,
    MeSkillsController,
    ProgressAdminController,
    CatalogController,
    CategoriesController,
    TechnologiesController,
    ChallengeSkillsController,
    MeSkillChallengesController,
    SkillStatsController,
    AiCoachController,
  ],
  exports: [SkillProgressService],
  providers: [
    SupabaseService,
    SkillsService,
    SkillProgressService,
    CatalogService,
    CategoriesService,
    TechnologiesService,
    ChallengeSkillsService,
    AttemptValidatedListener,
    SkillInsightsService,
    // AI Coach : le token symbolique découple l'interface de l'implémentation
    HttpAiProvider,
    {
      provide: AI_PROVIDER_TOKEN,
      useExisting: HttpAiProvider,
    },
    AiCoachService,
  ],
})
export class SkillsModule {}

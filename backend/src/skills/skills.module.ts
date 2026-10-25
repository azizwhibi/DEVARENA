import { AssignmentsService } from './assignments.service';
import { PracticeController } from './practice/practice.controller';
import { PracticeService } from './practice/practice.service';
import { CodeReviewController } from './code-review/code-review.controller';
import { CodeReviewService } from './code-review/code-review.service';
import { GeminiCodeReviewService } from './code-review/gemini-code-review.service';
import {
  ProblemsController,
  ProblemsAdminController,
} from './problems.controller';
import { ProblemsService } from './problems.service';
import {
  AssignmentsController,
  DemonstratedSkillsController,
  MyAssignmentsController,
  PracticeDirectoryController,
} from './assignments.controller';
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

import {
  MeSkillChallengesController,
  SkillStatsController,
} from './skill-insights.controller';
import { SkillInsightsService } from './skill-insights.service';

@Module({
  imports: [AuthModule, SupabaseModule],
  controllers: [
    CodeReviewController,
    PracticeController,
    ProblemsController,
    ProblemsAdminController,
    AssignmentsController,
    DemonstratedSkillsController,
    MyAssignmentsController,
    PracticeDirectoryController,
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
  ],
  exports: [SkillProgressService],
  providers: [
    CodeReviewService,
    GeminiCodeReviewService,
    PracticeService,
    ProblemsService,
    AssignmentsService,
    SupabaseService,
    SkillsService,
    SkillProgressService,
    CatalogService,
    CategoriesService,
    TechnologiesService,
    ChallengeSkillsService,
    AttemptValidatedListener,
    SkillInsightsService,
  ],
})
export class SkillsModule {}

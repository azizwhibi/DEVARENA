import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { SkillsModule } from '../skills/skills.module';
import { KnowledgeStore } from './knowledge.store';
import { KnowledgeCatalogueService } from './knowledge-catalogue.service';
import { KnowledgeLearningService } from './knowledge-learning.service';
import { KnowledgeRecommendationsService } from './knowledge-recommendations.service';
import { KnowledgeImportService } from './knowledge-import.service';
import { KnowledgeExplanationService } from './knowledge-explanation.service';
import {
  AdminKnowledgeController,
  KnowledgeController,
  MyKnowledgeController,
} from './knowledge.controller';
@Module({
  imports: [AuthModule, SupabaseModule, SkillsModule],
  controllers: [
    KnowledgeController,
    MyKnowledgeController,
    AdminKnowledgeController,
  ],
  providers: [
    KnowledgeStore,
    KnowledgeCatalogueService,
    KnowledgeLearningService,
    KnowledgeRecommendationsService,
    KnowledgeImportService,
    KnowledgeExplanationService,
  ],
})
export class KnowledgeModule {}

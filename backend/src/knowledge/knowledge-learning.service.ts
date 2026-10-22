import { Injectable, NotFoundException } from '@nestjs/common';
import { KnowledgeStore } from './knowledge.store';
import {
  KnowledgeCatalogueService,
  RESOURCE_SELECT,
} from './knowledge-catalogue.service';
import { EventDto, FeedbackDto } from './knowledge.dto';
@Injectable()
export class KnowledgeLearningService {
  constructor(
    private readonly store: KnowledgeStore,
    private readonly catalogue: KnowledgeCatalogueService,
  ) {}
  async records(
    userId: string,
    kind: 'bookmarks' | 'progress',
    page = 1,
    pageSize = 12,
  ) {
    const { data, error, count } = await this.store.db
      .from('knowledge_' + kind)
      .select('*,resource:knowledge_resources(' + RESOURCE_SELECT + ')', {
        count: 'exact',
      })
      .eq('user_id', userId)
      .order(kind === 'progress' ? 'updated_at' : 'created_at', {
        ascending: false,
      })
      .range((page - 1) * pageSize, page * pageSize - 1);
    this.store.check(error);
    // Private saved records remain removable, but unpublished content is never returned.
    return {
      items: (
        (data as unknown as {
          resource: { status: string } | null;
          [key: string]: unknown;
        }[]) ?? []
      ).map((row) => ({
        ...row,
        resource: row.resource?.status === 'published' ? row.resource : null,
      })),
      total: count ?? 0,
      page,
      pageSize,
    };
  }
  async activity(
    userId: string,
    resourceId: string,
    kind: 'bookmark' | 'progress',
    percentage = 0,
  ) {
    const { data, error } = await this.store.db.rpc('knowledge_save_activity', {
      p_user: userId,
      p_resource: resourceId,
      p_kind: kind,
      p_percentage: percentage,
    });
    this.store.check(error);
    return data;
  }
  async removeBookmark(userId: string, resourceId: string) {
    const { error } = await this.store.db
      .from('knowledge_bookmarks')
      .delete()
      .eq('user_id', userId)
      .eq('resource_id', resourceId);
    this.store.check(error);
    return { removed: true };
  }
  async decorate(userId: string, resources: { id: string }[]) {
    if (!resources.length) return [];
    const { data, error } = await this.store.db
      .from('knowledge_bookmarks')
      .select('resource_id')
      .eq('user_id', userId)
      .in(
        'resource_id',
        resources.map((resource) => resource.id),
      );
    this.store.check(error);
    const saved = new Set((data ?? []).map((row) => row.resource_id));
    return resources.map((resource) => ({
      ...resource,
      bookmarked: saved.has(resource.id),
    }));
  }
  async state(userId: string, resourceId: string) {
    await this.catalogue.resource(resourceId);
    const [bookmark, progress] = await Promise.all([
      this.store.db
        .from('knowledge_bookmarks')
        .select('created_at')
        .eq('user_id', userId)
        .eq('resource_id', resourceId)
        .maybeSingle(),
      this.store.db
        .from('knowledge_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('resource_id', resourceId)
        .maybeSingle(),
    ]);
    this.store.check(bookmark.error);
    this.store.check(progress.error);
    return { bookmarked: !!bookmark.data, progress: progress.data };
  }
  async assertDelivery(
    userId: string,
    resourceId: string,
    recommendationId?: string,
  ) {
    await this.catalogue.resource(resourceId);
    if (!recommendationId) return;
    const result = await this.store.db
      .from('knowledge_recommendations')
      .select('id')
      .eq('id', recommendationId)
      .eq('user_id', userId)
      .eq('resource_id', resourceId)
      .maybeSingle();
    this.store.check(result.error);
    if (!result.data) throw new NotFoundException('Recommendation not found.');
  }
  async feedback(userId: string, dto: FeedbackDto) {
    await this.assertDelivery(userId, dto.resource_id, dto.recommendation_id);
    const { data, error } = await this.store.db
      .from('knowledge_feedback')
      .upsert(
        {
          ...dto,
          recommendation_id: dto.recommendation_id ?? null,
          user_id: userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,resource_id' },
      )
      .select()
      .single();
    this.store.check(error);
    return data;
  }
  async event(userId: string, dto: EventDto) {
    await this.assertDelivery(userId, dto.resource_id, dto.recommendation_id);
    const { error } = await this.store.db
      .from('knowledge_events')
      .insert({ ...dto, user_id: userId });
    this.store.check(error);
    return { recorded: true };
  }
}

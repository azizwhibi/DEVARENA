import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { SupabaseService } from '../supabase/supabase.service';
import { CommunityService } from './community.service';
import type {
  CreateCategoryDto,
  ModeratePostDto,
  ReviewReportDto,
  UpdateCategoryDto,
} from './community.dto';

export interface ModerationActionRecord {
  id: string;
  moderator_id: string;
  action_type: string;
  target_type: 'post' | 'comment' | 'category' | 'user';
  target_id: string;
  reason: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

@Injectable()
export class CommunityAdminService {
  private memoryActions: ModerationActionRecord[] = [];

  constructor(
    private readonly supabase: SupabaseService,
    private readonly communityService: CommunityService,
  ) {}

  // --- CATEGORIES ---
  async createCategory(dto: CreateCategoryDto, adminId: string) {
    const categories = await this.communityService.listCategories();
    if (categories.some((c) => c.slug === dto.slug)) {
      throw new BadRequestException('A category with this slug already exists.');
    }

    const newCategory = {
      id: randomUUID(),
      name: dto.name.trim(),
      slug: dto.slug.trim().toLowerCase(),
      description: dto.description?.trim() ?? '',
      icon: dto.icon ?? 'message-square',
      color: dto.color ?? 'violet',
      display_order: dto.displayOrder ?? categories.length + 1,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    // Store in memory & Supabase
    (this.communityService as any).memoryCategories.set(newCategory.id, newCategory);

    try {
      await this.supabase.client.from('community_categories' as any).insert(newCategory);
    } catch {
      // ignore
    }

    this.logAction(adminId, 'create_category', 'category', newCategory.id, 'Category created');
    return newCategory;
  }

  async updateCategory(id: string, dto: UpdateCategoryDto, adminId: string) {
    const category = await this.communityService.getCategoryById(id);
    if (!category) throw new NotFoundException('Category not found.');

    if (dto.name) category.name = dto.name.trim();
    if (dto.slug) category.slug = dto.slug.trim().toLowerCase();
    if (dto.description !== undefined) category.description = dto.description.trim();
    if (dto.icon) category.icon = dto.icon;
    if (dto.color) category.color = dto.color;
    if (dto.displayOrder !== undefined) category.display_order = dto.displayOrder;

    (this.communityService as any).memoryCategories.set(category.id, category);

    try {
      await this.supabase.client
        .from('community_categories' as any)
        .update(category)
        .eq('id', category.id);
    } catch {
      // ignore
    }

    this.logAction(adminId, 'update_category', 'category', category.id, 'Category updated');
    return category;
  }

  async deleteCategory(id: string, adminId: string) {
    const category = await this.communityService.getCategoryById(id);
    if (!category) throw new NotFoundException('Category not found.');

    category.is_active = false;
    (this.communityService as any).memoryCategories.set(category.id, category);

    try {
      await this.supabase.client
        .from('community_categories' as any)
        .update({ is_active: false })
        .eq('id', category.id);
    } catch {
      // ignore
    }

    this.logAction(adminId, 'deactivate_category', 'category', category.id, 'Category deactivated');
  }

  // --- POST MODERATION ---
  async moderatePost(id: string, dto: ModeratePostDto, adminId: string) {
    const post = await this.communityService.getPost(id);

    if (dto.status) post.status = dto.status;
    if (dto.isLocked !== undefined) post.is_locked = dto.isLocked;
    if (dto.isPinned !== undefined) post.is_pinned = dto.isPinned;

    post.updated_at = new Date().toISOString();
    (this.communityService as any).memoryPosts.set(id, post);

    try {
      await this.supabase.client
        .from('community_posts' as any)
        .update({
          status: post.status,
          is_locked: post.is_locked,
          is_pinned: post.is_pinned,
          updated_at: post.updated_at,
        })
        .eq('id', id);
    } catch {
      // ignore
    }

    this.logAction(adminId, 'moderate_post', 'post', id, dto.reason, {
      status: post.status,
      is_locked: post.is_locked,
      is_pinned: post.is_pinned,
    });

    return post;
  }

  // --- REPORTS QUEUE ---
  async listReports(status?: string) {
    const reports = Array.from((this.communityService as any).memoryReports.values()) as any[];
    if (status) {
      return reports.filter((r) => r.status === status);
    }
    return reports.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }

  async reviewReport(id: string, dto: ReviewReportDto, adminId: string) {
    const report = (this.communityService as any).memoryReports.get(id);
    if (!report) throw new NotFoundException('Report not found.');

    report.status = dto.status;
    report.reviewed_by = adminId;
    report.review_notes = dto.reviewNotes?.trim() ?? null;
    report.updated_at = new Date().toISOString();

    (this.communityService as any).memoryReports.set(id, report);

    this.logAction(
      adminId,
      `report_${dto.status}`,
      report.post_id ? 'post' : 'comment',
      (report.post_id || report.comment_id)!,
      dto.reviewNotes || `Report ${dto.status}`,
    );

    return report;
  }

  // --- MODERATION LOGS ---
  async listModerationLogs() {
    return this.memoryActions.slice().reverse();
  }

  private logAction(
    moderatorId: string,
    actionType: string,
    targetType: 'post' | 'comment' | 'category' | 'user',
    targetId: string,
    reason: string,
    metadata?: Record<string, unknown>,
  ) {
    const log: ModerationActionRecord = {
      id: randomUUID(),
      moderator_id: moderatorId,
      action_type: actionType,
      target_type: targetType,
      target_id: targetId,
      reason,
      metadata,
      created_at: new Date().toISOString(),
    };
    this.memoryActions.push(log);
  }
}

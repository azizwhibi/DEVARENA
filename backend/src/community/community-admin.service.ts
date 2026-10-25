import { Injectable } from '@nestjs/common';
import { CommunityService } from './community.service';
import type {
  CreateCategoryDto,
  ModeratePostDto,
  ModerateCommentDto,
  ReviewReportDto,
  UpdateCategoryDto,
} from './community.dto';

@Injectable()
export class CommunityAdminService {
  constructor(private readonly community: CommunityService) {}
  listCategories(admin: string) {
    return this.community.read('admin_categories', admin);
  }
  createCategory(dto: CreateCategoryDto, admin: string) {
    return this.community.write('admin_create_category', admin, null, dto);
  }
  updateCategory(id: string, dto: UpdateCategoryDto, admin: string) {
    return this.community.write('admin_update_category', admin, id, dto);
  }
  deleteCategory(id: string, admin: string) {
    return this.community.write('admin_delete_category', admin, id);
  }
  moderatePost(id: string, dto: ModeratePostDto, admin: string) {
    return this.community.write('admin_post', admin, id, dto);
  }
  moderateComment(id: string, dto: ModerateCommentDto, admin: string) {
    return this.community.write('admin_comment', admin, id, dto);
  }
  listReports(status: string | undefined, admin: string) {
    return this.community.read('admin_reports', admin, null, { status });
  }
  reviewReport(id: string, dto: ReviewReportDto, admin: string) {
    return this.community.write('admin_review_report', admin, id, dto);
  }
  listModerationLogs(admin: string) {
    return this.community.read('admin_logs', admin);
  }
}

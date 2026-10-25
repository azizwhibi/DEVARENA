'use client';

import { apiRequest } from '@/lib/api';

export type CommunityCategory = {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
};

export type CommunityPost = {
  id: string;
  author_id: string;
  category_id: string;
  title: string;
  content: string;
  status: 'published' | 'hidden' | 'archived';
  is_locked: boolean;
  is_pinned: boolean;
  is_edited: boolean;
  accepted_comment_id: string | null;
  linked_challenge_id: string | null;
  linked_resource_id: string | null;
  vote_score: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
  topics?: string[];
  author?: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  category?: CommunityCategory;
  userVote?: number;
  isBookmarked?: boolean;
};

export type CommunityComment = {
  id: string;
  post_id: string;
  author_id: string;
  parent_id: string | null;
  content: string;
  status: 'published' | 'hidden' | 'deleted';
  is_accepted: boolean;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  replies?: CommunityComment[];
};

export type CommunityPostsResponse = {
  items: CommunityPost[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type CommunitySidebarData = {
  announcements: CommunityPost[];
  popular: CommunityPost[];
  categories: CommunityCategory[];
};

export type CommunityReport = {
  id: string;
  reporter_id: string;
  post_id: string | null;
  comment_id: string | null;
  reason: string;
  status: 'pending' | 'reviewed' | 'dismissed';
  reviewed_by: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
};

// Client API calls
export async function getCommunityCategories(): Promise<CommunityCategory[]> {
  return apiRequest<CommunityCategory[]>('/community/categories');
}

export async function getCommunitySidebar(): Promise<CommunitySidebarData> {
  return apiRequest<CommunitySidebarData>('/community/sidebar');
}

export async function getCommunityPosts(params: {
  category?: string;
  topic?: string;
  search?: string;
  sort?: 'newest' | 'votes' | 'comments' | 'popular';
  page?: number;
  limit?: number;
}): Promise<CommunityPostsResponse> {
  const query = new URLSearchParams();
  if (params.category) query.set('category', params.category);
  if (params.topic) query.set('topic', params.topic);
  if (params.search) query.set('search', params.search);
  if (params.sort) query.set('sort', params.sort);
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));

  const qs = query.toString();
  return apiRequest<CommunityPostsResponse>(`/community/posts${qs ? `?${qs}` : ''}`);
}

export async function getCommunityPost(id: string): Promise<CommunityPost> {
  return apiRequest<CommunityPost>(`/community/posts/${id}`);
}

export async function createCommunityPost(data: {
  title: string;
  content: string;
  categoryId: string;
  topics?: string[];
  linkedChallengeId?: string;
  linkedResourceId?: string;
}): Promise<CommunityPost> {
  return apiRequest<CommunityPost>('/community/posts', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCommunityPost(
  id: string,
  data: {
    title?: string;
    content?: string;
    categoryId?: string;
    topics?: string[];
    linkedChallengeId?: string;
    linkedResourceId?: string;
  },
): Promise<CommunityPost> {
  return apiRequest<CommunityPost>(`/community/posts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteCommunityPost(id: string): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/community/posts/${id}`, {
    method: 'DELETE',
  });
}

export async function voteCommunityPost(
  id: string,
  vote: -1 | 0 | 1,
): Promise<{ voteScore: number; userVote: number }> {
  return apiRequest<{ voteScore: number; userVote: number }>(`/community/posts/${id}/vote`, {
    method: 'POST',
    body: JSON.stringify({ vote }),
  });
}

export async function toggleCommunityBookmark(id: string): Promise<{ isBookmarked: boolean }> {
  return apiRequest<{ isBookmarked: boolean }>(`/community/posts/${id}/bookmark`, {
    method: 'POST',
  });
}

export async function getCommunityComments(postId: string): Promise<CommunityComment[]> {
  return apiRequest<CommunityComment[]>(`/community/posts/${postId}/comments`);
}

export async function createCommunityComment(
  postId: string,
  data: { content: string; parentId?: string },
): Promise<CommunityComment> {
  return apiRequest<CommunityComment>(`/community/posts/${postId}/comments`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCommunityComment(
  commentId: string,
  data: { content: string },
): Promise<CommunityComment> {
  return apiRequest<CommunityComment>(`/community/comments/${commentId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteCommunityComment(commentId: string): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/community/comments/${commentId}`, {
    method: 'DELETE',
  });
}

export async function acceptAnswer(
  postId: string,
  commentId: string,
): Promise<{ acceptedCommentId: string | null }> {
  return apiRequest<{ acceptedCommentId: string | null }>(
    `/community/posts/${postId}/accept-answer/${commentId}`,
    {
      method: 'POST',
    },
  );
}

export async function reportCommunityContent(data: {
  reason: string;
  postId?: string;
  commentId?: string;
}): Promise<CommunityReport> {
  return apiRequest<CommunityReport>('/community/reports', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getMyCommunityPosts(params?: {
  page?: number;
  limit?: number;
}): Promise<CommunityPostsResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  const qs = query.toString();
  return apiRequest<CommunityPostsResponse>(`/community/me/posts${qs ? `?${qs}` : ''}`);
}

export async function getMySavedCommunityPosts(): Promise<CommunityPost[]> {
  return apiRequest<CommunityPost[]>('/community/me/saved');
}

// Admin API calls
export async function createAdminCategory(data: {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  displayOrder?: number;
}): Promise<CommunityCategory> {
  return apiRequest<CommunityCategory>('/admin/community/categories', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAdminCategory(
  id: string,
  data: Partial<CommunityCategory>,
): Promise<CommunityCategory> {
  return apiRequest<CommunityCategory>(`/admin/community/categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteAdminCategory(id: string): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/admin/community/categories/${id}`, {
    method: 'DELETE',
  });
}

export async function moderatePost(
  id: string,
  data: {
    status?: 'published' | 'hidden' | 'archived';
    isLocked?: boolean;
    isPinned?: boolean;
    reason: string;
  },
): Promise<CommunityPost> {
  return apiRequest<CommunityPost>(`/admin/community/posts/${id}/moderate`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function getAdminReports(status?: string): Promise<CommunityReport[]> {
  const qs = status ? `?status=${status}` : '';
  return apiRequest<CommunityReport[]>(`/admin/community/reports${qs}`);
}

export async function reviewAdminReport(
  id: string,
  data: {
    status: 'reviewed' | 'dismissed';
    reviewNotes?: string;
  },
): Promise<CommunityReport> {
  return apiRequest<CommunityReport>(`/admin/community/reports/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

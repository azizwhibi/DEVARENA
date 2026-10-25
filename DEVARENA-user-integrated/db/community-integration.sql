-- ============================================================================
-- DevArena Discuss: Community Forum Management Integration
-- Schema for posts, threaded comments, categories, votes, bookmarks, reports & moderation
-- ============================================================================

-- 1. Discussion Categories (Admin managed)
CREATE TABLE IF NOT EXISTS public.community_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    icon TEXT DEFAULT 'message-square',
    color TEXT DEFAULT 'violet',
    display_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Discussion Posts
CREATE TABLE IF NOT EXISTS public.community_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.community_categories(id) ON DELETE RESTRICT,
    title TEXT NOT NULL CHECK (char_length(title) >= 5 AND char_length(title) <= 200),
    content TEXT NOT NULL CHECK (char_length(content) >= 10),
    status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'hidden', 'archived')),
    is_locked BOOLEAN NOT NULL DEFAULT false,
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    is_edited BOOLEAN NOT NULL DEFAULT false,
    accepted_comment_id UUID,
    linked_challenge_id UUID,
    linked_resource_id UUID,
    vote_score INT NOT NULL DEFAULT 0,
    comment_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Post Topic Associations
CREATE TABLE IF NOT EXISTS public.community_post_topics (
    post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
    topic_name TEXT NOT NULL,
    PRIMARY KEY (post_id, topic_name)
);

-- 4. Discussion Comments (Threaded)
CREATE TABLE IF NOT EXISTS public.community_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.community_comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (char_length(content) >= 2),
    status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'hidden', 'deleted')),
    is_accepted BOOLEAN NOT NULL DEFAULT false,
    is_edited BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Post Votes (Upvote / Downvote)
CREATE TABLE IF NOT EXISTS public.community_post_votes (
    post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    vote_type SMALLINT NOT NULL CHECK (vote_type IN (-1, 1)),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (post_id, user_id)
);

-- 6. Bookmarked Posts
CREATE TABLE IF NOT EXISTS public.community_bookmarks (
    post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (post_id, user_id)
);

-- 7. Community Reports (Posts or Comments)
CREATE TABLE IF NOT EXISTS public.community_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    post_id UUID REFERENCES public.community_posts(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES public.community_comments(id) ON DELETE CASCADE,
    reason TEXT NOT NULL CHECK (char_length(reason) >= 5),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed')),
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    review_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_report_target CHECK (
        (post_id IS NOT NULL AND comment_id IS NULL) OR
        (post_id IS NULL AND comment_id IS NOT NULL)
    )
);

-- 8. Community Moderation Actions Log
CREATE TABLE IF NOT EXISTS public.community_moderation_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    moderator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    target_type TEXT NOT NULL CHECK (target_type IN ('post', 'comment', 'category', 'user')),
    target_id UUID NOT NULL,
    reason TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_community_posts_author ON public.community_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_category ON public.community_posts(category_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_status ON public.community_posts(status);
CREATE INDEX IF NOT EXISTS idx_community_posts_created_at ON public.community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_vote_score ON public.community_posts(vote_score DESC);
CREATE INDEX IF NOT EXISTS idx_community_comments_post ON public.community_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_community_comments_parent ON public.community_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_community_post_topics_topic ON public.community_post_topics(topic_name);
CREATE INDEX IF NOT EXISTS idx_community_reports_status ON public.community_reports(status);

-- Seed Initial Categories
INSERT INTO public.community_categories (name, slug, description, icon, color, display_order)
VALUES
    ('Questions & Help', 'questions-help', 'Ask technical questions and get answers from the community', 'help-circle', 'amber', 1),
    ('Problem Discussions', 'problem-discussions', 'Debate DevArena challenges, algorithms and edge cases', 'code', 'violet', 2),
    ('Solutions & Approaches', 'solutions-approaches', 'Share clean architectures, patterns and optimized code', 'sparkles', 'emerald', 3),
    ('Tutorials & Resources', 'tutorials-resources', 'Comprehensive guides, deep-dives and curated developer material', 'book-open', 'blue', 4),
    ('Projects & Feedback', 'projects-feedback', 'Showcase your builds, request code reviews and get constructive advice', 'rocket', 'fuchsia', 5),
    ('Career & Interviews', 'career-interviews', 'Tech hiring, resume guidance, mock interviews and career growth', 'briefcase', 'indigo', 6),
    ('Announcements', 'announcements', 'Official DevArena updates, release notes and community events', 'megaphone', 'rose', 7)
ON CONFLICT (slug) DO NOTHING;

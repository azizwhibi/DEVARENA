-- Discussion module imported from musaGestion; uses existing profiles and authentication.
begin;
set local lock_timeout='10s';
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
    ('Questions & Help', 'questions-help', 'Ask technical questions.', 'help-circle', 'violet', 1),
    ('Problem Discussions', 'problem-discussions', 'Discuss problems, algorithms and edge cases.', 'code', 'violet', 2),
    ('Solutions & Approaches', 'solutions-approaches', 'Share solution approaches and trade-offs.', 'message-square', 'violet', 3),
    ('Tutorials & Resources', 'tutorials-resources', 'Share learning resources.', 'book-open', 'violet', 4),
    ('Projects & Feedback', 'projects-feedback', 'Share projects and request feedback.', 'code', 'violet', 5),
    ('Career & Interviews', 'career-interviews', 'Discuss interviews and developer careers.', 'briefcase', 'violet', 6),
    ('Announcements', 'announcements', 'Official DevArena updates.', 'megaphone', 'violet', 7)
ON CONFLICT (slug) DO NOTHING;

-- The existing API is the only browser access path. Do not add identity tables or policies.
do $$ declare t text; begin
 foreach t in array array['community_categories','community_posts','community_post_topics',
  'community_comments','community_post_votes','community_bookmarks','community_reports','community_moderation_actions'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
  execute format('grant all on public.%I to service_role',t);
 end loop;
end $$;
create index if not exists community_bookmarks_owner on public.community_bookmarks(user_id,created_at desc);
create index if not exists community_votes_owner on public.community_post_votes(user_id,post_id);
create index if not exists community_comments_visible on public.community_comments(post_id,created_at,id) where status='published';

-- Add foreign keys when upgrading Musa's original tables, preserving older rows.
do $$ begin
 if not exists(select 1 from pg_constraint where conrelid='public.community_posts'::regclass and conname='community_posts_problem_fk') then
  alter table public.community_posts add constraint community_posts_problem_fk foreign key(linked_challenge_id) references public.challenges(id) on delete set null not valid;
 end if;
 if to_regclass('public.knowledge_resources') is not null and not exists(select 1 from pg_constraint where conrelid='public.community_posts'::regclass and conname='community_posts_resource_fk') then
  alter table public.community_posts add constraint community_posts_resource_fk foreign key(linked_resource_id) references public.knowledge_resources(id) on delete set null not valid;
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.community_posts'::regclass and conname='community_posts_accepted_comment_fk') then
  alter table public.community_posts add constraint community_posts_accepted_comment_fk foreign key(accepted_comment_id) references public.community_comments(id) on delete set null not valid;
 end if;
end $$;

-- Synchronize existing counters, then keep them correct during profile cascades too.
update public.community_posts p set
 vote_score=(select coalesce(sum(v.vote_type),0) from public.community_post_votes v where v.post_id=p.id),
 comment_count=(select count(*) from public.community_comments c where c.post_id=p.id and c.status='published')
where p.vote_score is distinct from (select coalesce(sum(v.vote_type),0) from public.community_post_votes v where v.post_id=p.id)
 or p.comment_count is distinct from (select count(*) from public.community_comments c where c.post_id=p.id and c.status='published');

create or replace function public.community_count_changes() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_table_name='community_post_votes' then
  if tg_op<>'INSERT' then update public.community_posts set vote_score=vote_score-old.vote_type where id=old.post_id; end if;
  if tg_op<>'DELETE' then update public.community_posts set vote_score=vote_score+new.vote_type where id=new.post_id; end if;
 else
  if tg_op<>'INSERT' and old.status='published' then update public.community_posts set comment_count=comment_count-1 where id=old.post_id; end if;
  if tg_op<>'DELETE' and new.status='published' then update public.community_posts set comment_count=comment_count+1 where id=new.post_id; end if;
  if tg_op='DELETE' then update public.community_posts set accepted_comment_id=null where accepted_comment_id=old.id;
  elsif new.status<>'published' then update public.community_posts set accepted_comment_id=null where accepted_comment_id=new.id;
  end if;
 end if;
 return null;
end $$;
drop trigger if exists community_vote_counts on public.community_post_votes;
create trigger community_vote_counts after insert or update or delete on public.community_post_votes for each row execute function public.community_count_changes();
drop trigger if exists community_comment_counts on public.community_comments;
create trigger community_comment_counts after insert or update or delete on public.community_comments for each row execute function public.community_count_changes();
revoke all on function public.community_count_changes() from public,anon,authenticated;

create or replace function public.community_post_json(p_post uuid,p_actor uuid)
returns jsonb language sql stable set search_path='' as $$
 select to_jsonb(p)||jsonb_build_object(
  'author',(select jsonb_build_object('id',u.id,'username',u.username,'avatar_url',u.avatar_url) from public.profiles u where u.id=p.author_id),
  'category',(select to_jsonb(c) from public.community_categories c where c.id=p.category_id),
  'topics',(select coalesce(jsonb_agg(t.topic_name order by t.topic_name),'[]'::jsonb) from public.community_post_topics t where t.post_id=p.id),
  'userVote',coalesce((select v.vote_type from public.community_post_votes v where v.post_id=p.id and v.user_id=p_actor),0),
  'isBookmarked',exists(select 1 from public.community_bookmarks b where b.post_id=p.id and b.user_id=p_actor))
 from public.community_posts p where p.id=p_post;
$$;

create or replace function public.community_read(p_kind text,p_actor uuid default null,p_id uuid default null,p_query jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare admin boolean:=false; result jsonb; page integer:=coalesce((p_query->>'page')::int,1);
 lim integer:=coalesce((p_query->>'limit')::int,15); total integer; post public.community_posts;
begin
 if p_actor is not null then
  if not exists(select 1 from public.profiles where id=p_actor and status='active') then raise exception 'Forbidden' using errcode='42501'; end if;
  select role='admin' into admin from public.profiles where id=p_actor;
 end if;
 if page<1 or page>100000 or lim<1 or lim>50 then raise exception 'Invalid pagination' using errcode='22023'; end if;
 if p_kind like 'admin_%' and not admin then raise exception 'Administrator required' using errcode='42501'; end if;
 if p_kind in ('mine','saved') and p_actor is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if p_kind in ('categories','admin_categories') then
  select coalesce(jsonb_agg(to_jsonb(c) order by c.display_order,c.name,c.id),'[]'::jsonb) into result
   from public.community_categories c where c.is_active or p_kind='admin_categories';
 elsif p_kind='post' or p_kind='comments' then
  select * into post from public.community_posts where id=p_id;
  if not found or (post.status<>'published' and post.author_id is distinct from p_actor and not admin) then raise exception 'Discussion not found' using errcode='P0002'; end if;
  if p_kind='post' then return public.community_post_json(p_id,p_actor); end if;
  -- Preserve tombstones only to keep replies in their original thread.
  with comments as (
   select c.id,c.post_id,c.author_id,c.parent_id,
    case when c.status='published' then c.content else '[Comment removed]' end as content,
    c.status,c.is_edited,c.created_at,c.updated_at,
    (post.accepted_comment_id=c.id and c.status='published') as is_accepted,
    (select jsonb_build_object('id',u.id,'username',u.username,'avatar_url',u.avatar_url) from public.profiles u where u.id=c.author_id) as author
   from public.community_comments c where c.post_id=p_id
   and (c.status='published' or exists(select 1 from public.community_comments child where child.parent_id=c.id and child.status='published'))
  )
  select coalesce(jsonb_agg(to_jsonb(c)||jsonb_build_object('replies',
   (select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at,r.id),'[]'::jsonb) from comments r where r.parent_id=c.id)) order by c.created_at,c.id),'[]'::jsonb)
  into result from comments c where c.parent_id is null;
 elsif p_kind in ('posts','mine','saved') then
  with filtered as (
   select p.* from public.community_posts p where
    ((p_kind='mine' and p.author_id=p_actor) or (p_kind<>'mine' and p.status='published'))
    and (p_kind<>'saved' or exists(select 1 from public.community_bookmarks b where b.post_id=p.id and b.user_id=p_actor))
    and (nullif(p_query->>'authorId','') is null or p.author_id=(p_query->>'authorId')::uuid)
    and (nullif(p_query->>'category','') is null or p.category_id=(p_query->>'category')::uuid)
    and (nullif(p_query->>'topic','') is null or exists(select 1 from public.community_post_topics t where t.post_id=p.id and lower(t.topic_name)=lower(p_query->>'topic')))
    and (coalesce(p_query->>'search','')='' or position(lower(p_query->>'search') in lower(p.title||' '||p.content))>0)
  ), paged as (
   select * from filtered order by is_pinned desc,
    case when p_query->>'sort' in ('votes','popular') then vote_score end desc nulls last,
    case when p_query->>'sort'='comments' then comment_count end desc nulls last,
    created_at desc,id desc limit lim offset (page-1)*lim
  )
  select jsonb_build_object('items',coalesce((select jsonb_agg(public.community_post_json(p.id,p_actor) order by p.is_pinned desc,
   case when p_query->>'sort' in ('votes','popular') then p.vote_score end desc nulls last,
   case when p_query->>'sort'='comments' then p.comment_count end desc nulls last,p.created_at desc,p.id desc) from paged p),'[]'::jsonb),
   'total',(select count(*) from filtered),'page',page,'limit',lim,'totalPages',ceil((select count(*) from filtered)::numeric/lim)) into result;
 elsif p_kind='sidebar' then
  select jsonb_build_object('categories',public.community_read('categories',p_actor),
   'announcements',coalesce((select jsonb_agg(public.community_post_json(p.id,p_actor)) from(select id from public.community_posts where status='published' and is_pinned order by created_at desc,id desc limit 3)p),'[]'::jsonb),
   'popular',coalesce((select jsonb_agg(public.community_post_json(p.id,p_actor)) from(select id from public.community_posts where status='published' and not is_pinned order by vote_score desc,created_at desc,id desc limit 5)p),'[]'::jsonb)) into result;
 elsif p_kind='admin_reports' then
  if coalesce(p_query->>'status','pending') not in ('pending','reviewed','dismissed') then raise exception 'Invalid report status' using errcode='22023'; end if;
  select coalesce(jsonb_agg(to_jsonb(r)||jsonb_build_object('discussion_id',coalesce(r.post_id,(select c.post_id from public.community_comments c where c.id=r.comment_id))) order by r.created_at desc,r.id desc),'[]'::jsonb) into result
   from(select * from public.community_reports where status=coalesce(p_query->>'status','pending') order by created_at desc,id desc limit 200)r;
 elsif p_kind='admin_logs' then
  select coalesce(jsonb_agg(to_jsonb(l) order by l.created_at desc,l.id desc),'[]'::jsonb) into result from(select * from public.community_moderation_actions order by created_at desc,id desc limit 100)l;
 else raise exception 'Unknown discussion query' using errcode='22023';
 end if;
 return result;
end $$;

create or replace function public.community_write(p_actor uuid,p_action text,p_id uuid default null,p_data jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare admin boolean; post public.community_posts; comment public.community_comments;
 category public.community_categories; new_id uuid; parent public.community_comments;
 target_post uuid; score integer; bookmarked boolean; tag jsonb; report public.community_reports;
begin
 if not exists(select 1 from public.profiles where id=p_actor and status='active') then raise exception 'Forbidden' using errcode='42501'; end if;
 select role='admin' into admin from public.profiles where id=p_actor;
 if p_action like 'admin_%' and not admin then raise exception 'Administrator required' using errcode='42501'; end if;
 if p_action in ('create_post','update_post') then
  if p_action='update_post' then
   select * into post from public.community_posts where id=p_id for update;
   if not found then raise exception 'Discussion not found' using errcode='P0002'; end if;
   if post.author_id<>p_actor and not admin then raise exception 'Only the author can edit' using errcode='42501'; end if;
   if (post.is_locked or post.status<>'published') and not admin then raise exception 'Discussion is locked or unavailable' using errcode='42501'; end if;
  end if;
  if p_action='create_post' or p_data ? 'categoryId' then
   select * into category from public.community_categories where id=(p_data->>'categoryId')::uuid and is_active;
   if not found then raise exception 'Active category not found' using errcode='22023'; end if;
  else select * into category from public.community_categories where id=post.category_id;
  end if;
  if category.slug='announcements' and not admin then raise exception 'Announcements require an administrator' using errcode='42501'; end if;
  if (p_action='create_post' or p_data ? 'title') and coalesce(length(btrim(p_data->>'title')),0) not between 5 and 200 then raise exception 'Title must contain 5 to 200 characters' using errcode='22023'; end if;
  if (p_action='create_post' or p_data ? 'content') and coalesce(length(btrim(p_data->>'content')),0) not between 10 and 50000 then raise exception 'Content must contain 10 to 50000 characters' using errcode='22023'; end if;
  if p_data->>'linkedChallengeId' is not null and not exists(select 1 from public.challenges where id=(p_data->>'linkedChallengeId')::uuid and is_published) then raise exception 'Published problem not found' using errcode='22023'; end if;
  if p_data->>'linkedResourceId' is not null then
   if to_regclass('public.knowledge_resources') is null then raise exception 'Knowledge resources unavailable' using errcode='22023'; end if;
   perform 1 from public.knowledge_resources where id=(p_data->>'linkedResourceId')::uuid and status='published';
   if not found then raise exception 'Published resource not found' using errcode='22023'; end if;
  end if;
  if p_action='create_post' then
   insert into public.community_posts(author_id,category_id,title,content,linked_challenge_id,linked_resource_id)
   values(p_actor,category.id,btrim(p_data->>'title'),btrim(p_data->>'content'),(p_data->>'linkedChallengeId')::uuid,(p_data->>'linkedResourceId')::uuid) returning id into new_id;
  else
   update public.community_posts set category_id=category.id,title=coalesce(btrim(p_data->>'title'),title),content=coalesce(btrim(p_data->>'content'),content),
    linked_challenge_id=case when p_data ? 'linkedChallengeId' then (p_data->>'linkedChallengeId')::uuid else linked_challenge_id end,
    linked_resource_id=case when p_data ? 'linkedResourceId' then (p_data->>'linkedResourceId')::uuid else linked_resource_id end,
    is_edited=true,updated_at=now() where id=p_id;
   new_id:=p_id;
  end if;
  if p_data ? 'topics' then
   if jsonb_typeof(p_data->'topics')<>'array' or jsonb_array_length(p_data->'topics')>10 then raise exception 'Invalid tags' using errcode='22023'; end if;
   for tag in select value from jsonb_array_elements(p_data->'topics') loop
    if jsonb_typeof(tag)<>'string' or length(btrim(tag#>>'{}')) not between 1 and 40 then raise exception 'Invalid tag' using errcode='22023'; end if;
   end loop;
   delete from public.community_post_topics where post_id=new_id;
   insert into public.community_post_topics(post_id,topic_name) select new_id,lower(btrim(value#>>'{}')) from jsonb_array_elements(p_data->'topics') on conflict do nothing;
  end if;
  return public.community_post_json(new_id,p_actor);
 end if;
 if p_action in ('update_comment','delete_comment','admin_comment') then
  select * into comment from public.community_comments where id=p_id;
  if not found then raise exception 'Comment not found' using errcode='P0002'; end if;
  target_post:=comment.post_id;
 elsif p_action='report' then
  if ((p_data->>'postId') is null) = ((p_data->>'commentId') is null) then raise exception 'Choose exactly one report target' using errcode='22023'; end if;
  if p_data->>'commentId' is not null then
   select * into comment from public.community_comments where id=(p_data->>'commentId')::uuid and status='published';
   if not found then raise exception 'Comment not found' using errcode='P0002'; end if;
   target_post:=comment.post_id;
  else target_post:=(p_data->>'postId')::uuid; end if;
 elsif p_action in ('delete_post','vote','bookmark','create_comment','accept_answer','admin_post') then target_post:=p_id;
 end if;
 if target_post is not null then
  select * into post from public.community_posts where id=target_post for update;
  if not found then raise exception 'Discussion not found' using errcode='P0002'; end if;
  if post.status<>'published' and p_action not in ('admin_post','admin_comment','delete_post') then raise exception 'Discussion unavailable' using errcode='P0002'; end if;
 end if;
 if p_action='delete_post' then
  if post.author_id<>p_actor and not admin then raise exception 'Only the author can delete' using errcode='42501'; end if;
  update public.community_posts set status='archived',updated_at=now() where id=post.id;
  return jsonb_build_object('success',true);
 elsif p_action='vote' then
  if post.is_locked then raise exception 'Discussion is locked' using errcode='42501'; end if;
  if (p_data->>'vote')::int not in (-1,0,1) or p_data->>'vote' is null then raise exception 'Invalid vote' using errcode='22023'; end if;
  if (p_data->>'vote')::int=0 then delete from public.community_post_votes where post_id=post.id and user_id=p_actor;
  else insert into public.community_post_votes(post_id,user_id,vote_type) values(post.id,p_actor,(p_data->>'vote')::int)
   on conflict(post_id,user_id) do update set vote_type=excluded.vote_type;
  end if;
  select coalesce(sum(vote_type),0)::int into score from public.community_post_votes where post_id=post.id;
  return jsonb_build_object('voteScore',score,'userVote',(p_data->>'vote')::int);
 elsif p_action='bookmark' then
  delete from public.community_bookmarks where post_id=post.id and user_id=p_actor;
  bookmarked:=not found;
  if bookmarked then insert into public.community_bookmarks(post_id,user_id) values(post.id,p_actor); end if;
  return jsonb_build_object('isBookmarked',bookmarked);
 elsif p_action='create_comment' then
  if post.is_locked then raise exception 'Discussion is locked' using errcode='42501'; end if;
  if coalesce(length(btrim(p_data->>'content')),0) not between 2 and 10000 then raise exception 'Comment must contain 2 to 10000 characters' using errcode='22023'; end if;
  if p_data->>'parentId' is not null then
   select * into parent from public.community_comments where id=(p_data->>'parentId')::uuid;
   if not found or parent.post_id<>post.id or parent.parent_id is not null or parent.status<>'published' then raise exception 'Reply to a visible top-level comment in this discussion' using errcode='22023'; end if;
  end if;
  insert into public.community_comments(post_id,author_id,parent_id,content) values(post.id,p_actor,(p_data->>'parentId')::uuid,btrim(p_data->>'content')) returning id into new_id;
  return (select to_jsonb(c)||jsonb_build_object('author',(select jsonb_build_object('id',u.id,'username',u.username,'avatar_url',u.avatar_url) from public.profiles u where u.id=p_actor),'replies','[]'::jsonb) from public.community_comments c where c.id=new_id);
 elsif p_action in ('update_comment','delete_comment') then
  if comment.author_id<>p_actor and not admin then raise exception 'Only the author can change this comment' using errcode='42501'; end if;
  if post.is_locked and p_action='update_comment' and not admin then raise exception 'Discussion is locked' using errcode='42501'; end if;
  if p_action='update_comment' then
   if comment.status<>'published' then raise exception 'Comment unavailable' using errcode='P0002'; end if;
   if coalesce(length(btrim(p_data->>'content')),0) not between 2 and 10000 then raise exception 'Invalid comment' using errcode='22023'; end if;
   update public.community_comments set content=btrim(p_data->>'content'),is_edited=true,updated_at=now() where id=p_id;
   return (select to_jsonb(c) from public.community_comments c where id=p_id);
  end if;
  update public.community_comments set content='[Comment removed]',status='deleted',is_accepted=false,updated_at=now() where id=p_id;
  return jsonb_build_object('success',true);
 elsif p_action='accept_answer' then
  if post.author_id<>p_actor then raise exception 'Only the discussion author can choose an answer' using errcode='42501'; end if;
  if post.is_locked then raise exception 'Discussion is locked' using errcode='42501'; end if;
  select * into comment from public.community_comments where id=(p_data->>'commentId')::uuid and post_id=post.id and status='published';
  if not found then raise exception 'Visible answer not found in this discussion' using errcode='22023'; end if;
  new_id:=case when post.accepted_comment_id=comment.id then null else comment.id end;
  update public.community_comments set is_accepted=coalesce(id=new_id,false) where post_id=post.id;
  update public.community_posts set accepted_comment_id=new_id,updated_at=now() where id=post.id;
  return jsonb_build_object('acceptedCommentId',new_id);
 elsif p_action='report' then
  if coalesce(length(btrim(p_data->>'reason')),0) not between 5 and 1000 then raise exception 'Invalid report reason' using errcode='22023'; end if;
  if exists(select 1 from public.community_reports where reporter_id=p_actor and status='pending' and
    (post_id=(p_data->>'postId')::uuid or comment_id=(p_data->>'commentId')::uuid)) then raise exception 'You already reported this content' using errcode='23505'; end if;
  insert into public.community_reports(reporter_id,post_id,comment_id,reason) values(p_actor,(p_data->>'postId')::uuid,(p_data->>'commentId')::uuid,btrim(p_data->>'reason')) returning * into report;
  return to_jsonb(report);
 elsif p_action in ('admin_create_category','admin_update_category','admin_delete_category') then
  if p_action<>'admin_create_category' then
   select * into category from public.community_categories where id=p_id for update;
   if not found then raise exception 'Category not found' using errcode='P0002'; end if;
  end if;
  if p_action='admin_delete_category' then update public.community_categories set is_active=false,updated_at=now() where id=p_id;
  else
   if (p_action='admin_create_category' or p_data ? 'name') and coalesce(length(btrim(p_data->>'name')),0) not between 2 and 60 then raise exception 'Invalid category name' using errcode='22023'; end if;
   if (p_action='admin_create_category' or p_data ? 'slug') and (coalesce(p_data->>'slug','') !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(p_data->>'slug')>60) then raise exception 'Invalid category slug' using errcode='22023'; end if;
   if p_action='admin_create_category' then
    insert into public.community_categories(name,slug,description,icon,color,display_order)
     values(btrim(p_data->>'name'),p_data->>'slug',coalesce(p_data->>'description',''),'message-square','violet',coalesce((p_data->>'displayOrder')::int,0)) returning id into p_id;
   else update public.community_categories set name=coalesce(btrim(p_data->>'name'),name),slug=coalesce(p_data->>'slug',slug),description=coalesce(p_data->>'description',description),
     is_active=coalesce((p_data->>'isActive')::boolean,is_active),display_order=coalesce((p_data->>'displayOrder')::int,display_order),updated_at=now() where id=p_id;
   end if;
  end if;
  insert into public.community_moderation_actions(moderator_id,action_type,target_type,target_id,reason) values(p_actor,p_action,'category',p_id,'Category configuration changed');
  return (select to_jsonb(c) from public.community_categories c where id=p_id);
 elsif p_action in ('admin_post','admin_comment') then
  if coalesce(length(btrim(p_data->>'reason')),0) not between 3 and 500 then raise exception 'A moderation reason is required' using errcode='22023'; end if;
  if p_action='admin_post' then
   if p_data ? 'status' and p_data->>'status' not in ('published','hidden','archived') then raise exception 'Invalid status' using errcode='22023'; end if;
   update public.community_posts set status=coalesce(p_data->>'status',status),is_locked=coalesce((p_data->>'isLocked')::boolean,is_locked),is_pinned=coalesce((p_data->>'isPinned')::boolean,is_pinned),updated_at=now() where id=p_id;
  else
   if p_data->>'status' not in ('published','hidden') or p_data->>'status' is null then raise exception 'Invalid comment status' using errcode='22023'; end if;
   if comment.status='deleted' then raise exception 'Deleted comments cannot be restored' using errcode='22023'; end if;
   update public.community_comments set status=p_data->>'status',is_accepted=false,updated_at=now() where id=p_id;
  end if;
  insert into public.community_moderation_actions(moderator_id,action_type,target_type,target_id,reason,metadata)
   values(p_actor,p_action,case when p_action='admin_post' then 'post' else 'comment' end,p_id,p_data->>'reason',p_data- 'reason');
  if p_action='admin_post' then return public.community_post_json(p_id,p_actor); end if;
  return jsonb_build_object('success',true);
 elsif p_action='admin_review_report' then
  if p_data->>'status' not in ('reviewed','dismissed') or p_data->>'status' is null then raise exception 'Invalid report status' using errcode='22023'; end if;
  update public.community_reports set status=p_data->>'status',reviewed_by=p_actor,review_notes=p_data->>'reviewNotes',updated_at=now() where id=p_id returning * into report;
  if not found then raise exception 'Report not found' using errcode='P0002'; end if;
  insert into public.community_moderation_actions(moderator_id,action_type,target_type,target_id,reason)
   values(p_actor,p_action,case when report.post_id is not null then 'post' else 'comment' end,coalesce(report.post_id,report.comment_id),'Report '||(p_data->>'status'));
  return to_jsonb(report);
 end if;
 raise exception 'Unknown discussion action' using errcode='22023';
end $$;

revoke all on function public.community_post_json(uuid,uuid),public.community_read(text,uuid,uuid,jsonb),public.community_write(uuid,text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.community_post_json(uuid,uuid),public.community_read(text,uuid,uuid,jsonb),public.community_write(uuid,text,uuid,jsonb) to service_role;
notify pgrst,'reload schema';
commit;

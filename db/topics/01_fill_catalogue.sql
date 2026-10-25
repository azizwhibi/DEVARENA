-- Run in Supabase SQL Editor on the existing project.
-- Requires db/skills-integration.sql and db/problem-topics.sql.
-- Reuses existing IDs, names, slugs, archived states and non-null associations.
-- No users, attempts, scores, history, challenges or learning progress are changed.
begin;
set local lock_timeout = '10s';
select pg_advisory_xact_lock(hashtext('devarena.topics.catalogue.v1'));

do $$ begin
  if to_regclass('public.skill_categories') is null or
     to_regclass('public.technologies') is null or
     to_regclass('public.skills') is null or to_regclass('public.topics') is null then
    raise exception 'Apply db/skills-integration.sql and db/problem-topics.sql first.';
  end if;
end $$;

create temporary table catalogue_categories(name text, slug text primary key) on commit drop;
insert into catalogue_categories values
 ('Algorithms','algorithms'),
 ('Data Structures','data-structures'),
 ('Programming Languages','programming-languages'),
 ('Databases','databases'),
 ('Frontend Development','frontend-development'),
 ('Backend Development','backend-development'),
 ('DevOps','devops'),
 ('Concurrency','concurrency');

create temporary table catalogue_technologies(name text, slug text primary key) on commit drop;
insert into catalogue_technologies values
 ('TypeScript','typescript'),('JavaScript','javascript'),('Python','python'),
 ('Rust','rust'),('Go','go'),('PostgreSQL','postgresql'),('React','react'),
 ('Next.js','nextjs'),('Node.js','nodejs'),('NestJS','nestjs'),('Docker','docker'),
 ('Java','java'),('C++','cpp'),('C#','csharp'),('Ruby','ruby');

create temporary table catalogue_skills(
 name text, slug text primary key, description text, category_slug text, technology_slug text
) on commit drop;
insert into catalogue_skills values
 -- Shared algorithm skills intentionally have no primary technology.
 ('Arrays','arrays','Traverse indexed collections and reason about element order.','data-structures',null),
 ('Strings','strings','Process characters, words, prefixes and text representations.','data-structures',null),
 ('Hash tables','hash-tables','Use key-based lookup, sets and frequency maps.','data-structures',null),
 ('Two pointers','two-pointers','Coordinate two positions to scan ordered or paired data.','algorithms',null),
 ('Sliding windows','sliding-windows','Maintain a moving range and update its state efficiently.','algorithms',null),
 ('Binary search','binary-search','Narrow a sorted search space or a monotonic answer range.','algorithms',null),
 ('Stacks','stacks','Use last-in-first-out state for nesting and expression processing.','data-structures',null),
 ('Monotonic stacks','monotonic-stacks','Maintain ordered candidates for nearest-element and range problems.','data-structures',null),
 ('Intervals','intervals','Compare, merge and schedule bounded ranges.','algorithms',null),
 ('Monotonic queues','monotonic-queues','Maintain ordered window candidates using a deque.','data-structures',null),
 ('Matrices','matrices','Traverse and transform rectangular grids.','data-structures',null),
 ('Breadth-first search','breadth-first-search','Visit states by distance using a queue.','algorithms',null),
 ('Prefix sums','prefix-sums','Precompute cumulative totals for efficient range queries.','algorithms',null),
 ('Trees','trees','Traverse hierarchical nodes and combine subtree results.','data-structures',null),
 ('Graphs','graphs','Represent connections and reason about reachability.','data-structures',null),
 ('Topological sorting','topological-sorting','Order directed dependencies and detect cycles.','algorithms',null),
 ('Shortest paths','shortest-paths','Find minimum-distance routes through weighted graphs.','algorithms',null),
 ('Minimum spanning trees','minimum-spanning-trees','Connect every vertex with minimum total edge cost.','algorithms',null),
 ('Dynamic programming','dynamic-programming','Reuse overlapping subproblem results and define state transitions.','algorithms',null),
 ('Sorting','sorting','Order data with explicit comparison and tie-breaking rules.','algorithms',null),
 -- Four skills for each real technology. SQL joins/subqueries reuse the existing rows.
 ('TypeScript types','typescript-types','Model values with interfaces, unions and type aliases.','programming-languages','typescript'),
 ('TypeScript generics','typescript-generics','Write reusable functions and types with type parameters.','programming-languages','typescript'),
 ('TypeScript narrowing','typescript-narrowing','Refine unions using guards and control-flow analysis.','programming-languages','typescript'),
 ('TypeScript utility types','typescript-utility-types','Transform object types with built-in type utilities.','programming-languages','typescript'),
 ('JavaScript arrays','javascript-arrays','Use JavaScript array iteration and transformation methods.','programming-languages','javascript'),
 ('JavaScript closures','javascript-closures','Reason about lexical scope and captured bindings.','programming-languages','javascript'),
 ('JavaScript promises','javascript-promises','Compose asynchronous work and handle rejection.','concurrency','javascript'),
 ('JavaScript event loop','javascript-event-loop','Reason about tasks, microtasks and callback execution order.','concurrency','javascript'),
 ('Python lists','python-lists','Use Python lists, slicing and iteration correctly.','programming-languages','python'),
 ('Python dictionaries','python-dictionaries','Use dictionary lookup, updates and iteration.','programming-languages','python'),
 ('Python comprehensions','python-comprehensions','Build collections with comprehensions and conditions.','programming-languages','python'),
 ('Python generators','python-generators','Produce lazy sequences with generators and yield.','programming-languages','python'),
 ('Rust ownership','rust-ownership','Manage moves, ownership transfer and automatic cleanup.','programming-languages','rust'),
 ('Rust borrowing','rust-borrowing','Use shared and mutable references safely.','programming-languages','rust'),
 ('Rust lifetimes','rust-lifetimes','Describe reference validity across function boundaries.','programming-languages','rust'),
 ('Rust pattern matching','rust-pattern-matching','Handle enum variants and structured values with match.','programming-languages','rust'),
 ('Go interfaces','go-interfaces','Design behavior using implicit interface implementation.','programming-languages','go'),
 ('Go goroutines','go-goroutines','Structure concurrent work using goroutines.','concurrency','go'),
 ('Go channels','go-channels','Coordinate concurrent work with channels and select.','concurrency','go'),
 ('Go error handling','go-error-handling','Propagate and inspect errors explicitly.','programming-languages','go'),
 ('SQL joins','sql-joins','Combine tables and identify matching or unmatched rows.','databases','postgresql'),
 ('SQL subqueries','sql-subqueries','Use nested queries, existence checks and common table expressions.','databases','postgresql'),
 ('SQL aggregation','sql-aggregation','Group rows and compute counts, sums and conditional aggregates.','databases','postgresql'),
 ('SQL window functions','sql-window-functions','Compute ranks, running totals and per-group row positions.','databases','postgresql'),
 ('SQL filtering','sql-filtering','Select rows with predicates and explicit null semantics.','databases','postgresql'),
 ('SQL dates','sql-dates','Work with calendar dates, intervals and date-based grouping.','databases','postgresql'),
 ('React components','react-components','Compose interfaces from components, props and children.','frontend-development','react'),
 ('React state','react-state','Manage state updates and derived values.','frontend-development','react'),
 ('React effects','react-effects','Synchronize external systems and clean up subscriptions.','frontend-development','react'),
 ('React accessibility','react-accessibility','Build keyboard-accessible controls and semantic interfaces.','frontend-development','react'),
 ('Next.js routing','nextjs-routing','Organize application routes, layouts and navigation.','frontend-development','nextjs'),
 ('Next.js server components','nextjs-server-components','Choose server and client boundaries for rendering and interaction.','frontend-development','nextjs'),
 ('Next.js route handlers','nextjs-route-handlers','Implement server-side HTTP route handlers.','backend-development','nextjs'),
 ('Next.js caching','nextjs-caching','Choose cache and revalidation behavior for application data.','frontend-development','nextjs'),
 ('Node.js streams','nodejs-streams','Process data incrementally with backpressure.','backend-development','nodejs'),
 ('Node.js asynchronous I/O','nodejs-async-io','Coordinate nonblocking operations and handle failures.','backend-development','nodejs'),
 ('Node.js HTTP','nodejs-http','Handle HTTP requests, responses and status codes.','backend-development','nodejs'),
 ('Node.js file operations','nodejs-files','Read and write files with explicit error handling.','backend-development','nodejs'),
 ('NestJS modules','nestjs-modules','Organize providers, controllers and module boundaries.','backend-development','nestjs'),
 ('NestJS dependency injection','nestjs-dependency-injection','Provide and inject services through module containers.','backend-development','nestjs'),
 ('NestJS guards','nestjs-guards','Authorize requests using guards and authenticated identities.','backend-development','nestjs'),
 ('NestJS validation','nestjs-validation','Validate and transform request DTOs at API boundaries.','backend-development','nestjs'),
 ('Docker images','docker-images','Build reproducible images using Dockerfiles and layers.','devops','docker'),
 ('Docker containers','docker-containers','Configure container processes, environment and storage.','devops','docker'),
 ('Docker networking','docker-networking','Connect containers and expose the required ports.','devops','docker'),
 ('Docker Compose','docker-compose','Describe and run related application services.','devops','docker'),
 ('Java collections','java-collections','Use Java lists, sets and maps appropriately.','programming-languages','java'),
 ('Java generics','java-generics','Express reusable type-safe Java APIs.','programming-languages','java'),
 ('Java streams','java-streams','Transform and aggregate data using the Stream API.','programming-languages','java'),
 ('Java exceptions','java-exceptions','Handle checked and unchecked failures appropriately.','programming-languages','java'),
 ('C++ vectors','cpp-vectors','Use dynamic arrays and reason about iterator invalidation.','programming-languages','cpp'),
 ('C++ templates','cpp-templates','Write generic functions and classes.','programming-languages','cpp'),
 ('C++ resource management','cpp-resource-management','Manage resources with RAII and smart pointers.','programming-languages','cpp'),
 ('C++ standard algorithms','cpp-standard-algorithms','Use standard algorithms with iterators and comparators.','programming-languages','cpp'),
 ('C# collections','csharp-collections','Use typed lists, dictionaries and sets.','programming-languages','csharp'),
 ('C# LINQ','csharp-linq','Filter, project and aggregate sequences with LINQ.','programming-languages','csharp'),
 ('C# asynchronous programming','csharp-async','Use tasks, cancellation and async/await.','concurrency','csharp'),
 ('C# generics','csharp-generics','Define reusable type-safe classes and methods.','programming-languages','csharp'),
 ('Ruby enumerables','ruby-enumerables','Transform and select collection elements with Enumerable.','programming-languages','ruby'),
 ('Ruby blocks','ruby-blocks','Pass behavior using blocks, yield and procs.','programming-languages','ruby'),
 ('Ruby classes','ruby-classes','Model objects with classes, methods and modules.','programming-languages','ruby'),
 ('Ruby exceptions','ruby-exceptions','Handle failures using raise, rescue and ensure.','programming-languages','ruby');

create temporary table catalogue_topics(name text, slug text primary key) on commit drop;
insert into catalogue_topics values
 ('Array','array'),('String','string'),('Hash Table','hash-table'),
 ('Two Pointers','two-pointers'),('Sliding Window','sliding-window'),
 ('Binary Search','binary-search'),('Stack','stack'),('Monotonic Stack','monotonic-stack'),
 ('Intervals','intervals'),('Monotonic Queue','monotonic-queue'),('Matrix','matrix'),
 ('Breadth-First Search','breadth-first-search'),('Prefix Sum','prefix-sum'),
 ('Tree','tree'),('Graph Theory','graph-theory'),('Topological Sort','topological-sort'),
 ('Shortest Path','shortest-path'),('Minimum Spanning Tree','minimum-spanning-tree'),
 ('Dynamic Programming','dynamic-programming'),('Sorting','sorting'),
 ('Database','database'),('SQL Filtering','sql-filtering'),('SQL Aggregation','sql-aggregation'),
 ('SQL Joins','sql-joins'),('SQL Window Functions','sql-window-functions'),
 ('SQL Subqueries','sql-subqueries'),('SQL Dates','sql-dates');

create temporary table catalogue_resolved(
 kind text, slug text, id uuid, primary key(kind,slug)
) on commit drop;

do $$
declare r record; matches uuid[]; resolved uuid; category uuid; technology uuid;
begin
 for r in select * from catalogue_categories loop
  select array_agg(id) into matches from public.skill_categories
   where lower(btrim(name))=lower(r.name) or slug=r.slug;
  if cardinality(matches)>1 then raise exception 'Conflicting category name/slug: %',r.slug; end if;
  resolved:=matches[1];
  if resolved is null then
   insert into public.skill_categories(name,slug,is_active) values(r.name,r.slug,true) returning id into resolved;
  end if;
  insert into catalogue_resolved values('category',r.slug,resolved);
 end loop;
 for r in select * from catalogue_technologies loop
  select array_agg(id) into matches from public.technologies
   where lower(btrim(name))=lower(r.name) or slug=r.slug;
  if cardinality(matches)>1 then raise exception 'Conflicting technology name/slug: %',r.slug; end if;
  resolved:=matches[1];
  if resolved is null then
   insert into public.technologies(name,slug,is_active) values(r.name,r.slug,true) returning id into resolved;
  end if;
  insert into catalogue_resolved values('technology',r.slug,resolved);
 end loop;
 for r in select * from catalogue_skills loop
  select id into category from catalogue_resolved where kind='category' and slug=r.category_slug;
  technology:=null;
  if r.technology_slug is not null then
   select id into technology from catalogue_resolved where kind='technology' and slug=r.technology_slug;
   if technology is null then raise exception 'Technology not resolved: %',r.technology_slug; end if;
  end if;
  select array_agg(id) into matches from public.skills
   where lower(btrim(name))=lower(r.name) or slug=r.slug;
  if cardinality(matches)>1 then raise exception 'Conflicting skill name/slug: %',r.slug; end if;
  resolved:=matches[1];
  if resolved is null then
   insert into public.skills(name,slug,description,category_id,technology_id,is_active)
   values(r.name,r.slug,r.description,category,technology,true) returning id into resolved;
  else
   -- Only fill missing classifications. Never move an already linked skill.
   update public.skills s set category_id=coalesce(s.category_id,category),
      technology_id=coalesce(s.technology_id,technology)
    where s.id=resolved and (s.category_id is null or (s.technology_id is null and technology is not null));
  end if;
  insert into catalogue_resolved values('skill',r.slug,resolved);
 end loop;
 for r in select * from catalogue_topics loop
  select array_agg(id) into matches from public.topics
   where lower(btrim(name))=lower(r.name) or slug=r.slug;
  if cardinality(matches)>1 then raise exception 'Conflicting topic name/slug: %',r.slug; end if;
  resolved:=matches[1];
  if resolved is null then
   insert into public.topics(name,slug,is_active) values(r.name,r.slug,true) returning id into resolved;
  end if;
  insert into catalogue_resolved values('topic',r.slug,resolved);
 end loop;
end $$;

-- Report only the catalogue represented by this script, including reused IDs.
select kind,count(*) as catalogue_entries from catalogue_resolved group by kind order by kind;
notify pgrst,'reload schema';
commit;

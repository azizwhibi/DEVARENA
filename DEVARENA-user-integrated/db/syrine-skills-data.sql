-- Public skill catalog exported from Syrine's supplied project.
-- Apply after skills-integration.sql. No users, attempts or user progress are imported.
-- Existing rows are preserved; matching names/slugs reuse Aziz's IDs.
begin;
set local lock_timeout = '5s';

insert into public.skill_categories(id,name,slug,is_active) values
('081505b6-317e-45c6-bff8-54f759dcdbb2', 'Debugging', 'debugging', true),
('af889819-ca0e-461d-b2fa-6e1eeda1d2a8', 'Logic', 'logic', true),
('f5283e12-673f-4742-bea7-f0766a710a81', 'Code Assembly', 'code-assembly', true),
('c107b096-f89d-4d3a-9adb-837e585a5f94', 'SQL', 'sql', true),
('637b988b-c281-4e12-88ab-fa13e14fc7d3', 'AI Trap', 'ai-trap', true),
('15d39637-41cb-4fb4-9db9-1a05493f177c', 'Security', 'security', true),
('6752c38b-1382-4da7-a3df-56cecb2c5a38', 'Securitu', 'securitu', true),
('206f552d-2da1-4dfe-9f0d-641a14a882b7', 'Securite', 'securite', true)
on conflict do nothing;

insert into public.technologies(id,name,slug,icon,is_active)
select source.id::uuid,source.name,source.slug,source.icon,source.is_active from (values
('ea1d8047-798d-4573-ad5f-4794f31371f0', 'PostgreSQL', 'postgresql', null, true),
('c7ef3192-7d0d-4533-9d3b-60c07d66fa28', 'React', 'react', null, true),
('f1d2a553-c173-4c32-a4ed-869909fe33c0', 'TypeScript', 'typescript', null, true),
('fb847aed-e78c-41f4-82dc-6f2cc3b6ca1b', 'Python', 'python', null, true),
('afeefb20-dbe3-42cd-a7e1-2fecc0f737ac', 'Node.js', 'nodejs', null, true),
('7fd04a47-435f-4b83-800a-31cf4299ec68', 'Multi-langage', 'multi-langage', null, true),
('53770e08-2673-4d36-aa38-90332474fff3', 'Docker', 'docker', 'docker', true),
('de7cfc63-a1f2-45c7-b666-06e03f0cbe5d', 'Flutter', 'flutter', null, true),
('64fe05e3-7fcc-49bb-a84a-162708f53fa9', 'NestJS', 'nestjs', 'nestjs', true)
) as source(id,name,slug,icon,is_active)
where not exists (select 1 from public.technologies target where lower(trim(target.name)) = lower(trim(source.name)))
on conflict do nothing;

insert into public.skills(id,name,slug,description,category_id,technology_id,is_active)
select '9af01ec7-ffeb-456a-809b-0f5f1d58fd99'::uuid, 'Jointures SQL', 'jointures-sql', 'INNER, LEFT, agregations sur plusieurs tables', (select id from public.skill_categories where slug = 'sql' limit 1), (select id from public.technologies where lower(trim(name)) = lower(trim('PostgreSQL')) order by id limit 1), true
where not exists (select 1 from public.skills where lower(trim(name)) = lower(trim('Jointures SQL')))
on conflict do nothing;

insert into public.skills(id,name,slug,description,category_id,technology_id,is_active)
select 'e565ccf6-2232-457e-89fd-19ccd42f69e1'::uuid, 'Index et performance', 'index-performance', 'Lire un plan d''execution, choisir un index', (select id from public.skill_categories where slug = 'sql' limit 1), (select id from public.technologies where lower(trim(name)) = lower(trim('PostgreSQL')) order by id limit 1), true
where not exists (select 1 from public.skills where lower(trim(name)) = lower(trim('Index et performance')))
on conflict do nothing;

insert into public.skills(id,name,slug,description,category_id,technology_id,is_active)
select 'c391deb0-8b89-4cb3-b3bf-5cadf0624e6d'::uuid, 'Sous-requetes et CTE', 'sous-requetes-cte', 'Requetes imbriquees et WITH', (select id from public.skill_categories where slug = 'sql' limit 1), (select id from public.technologies where lower(trim(name)) = lower(trim('PostgreSQL')) order by id limit 1), true
where not exists (select 1 from public.skills where lower(trim(name)) = lower(trim('Sous-requetes et CTE')))
on conflict do nothing;

insert into public.skills(id,name,slug,description,category_id,technology_id,is_active)
select 'a6aebec1-21fc-4920-9fc5-3244fd98174a'::uuid, 'Gestion d''etat', 'gestion-etat-react', 'Etat obsolete, effets, re-rendus', (select id from public.skill_categories where slug = 'debugging' limit 1), (select id from public.technologies where lower(trim(name)) = lower(trim('React')) order by id limit 1), true
where not exists (select 1 from public.skills where lower(trim(name)) = lower(trim('Gestion d''etat')))
on conflict do nothing;

insert into public.skills(id,name,slug,description,category_id,technology_id,is_active)
select 'bcb71456-dbee-4472-b690-c859f1518240'::uuid, 'Asynchrone et promesses', 'asynchrone-nodejs', 'Await oublie, race conditions', (select id from public.skill_categories where slug = 'debugging' limit 1), (select id from public.technologies where lower(trim(name)) = lower(trim('Node.js')) order by id limit 1), true
where not exists (select 1 from public.skills where lower(trim(name)) = lower(trim('Asynchrone et promesses')))
on conflict do nothing;

insert into public.skills(id,name,slug,description,category_id,technology_id,is_active)
select '2d5fd301-e967-4eb7-a7dc-2aeb25c00c7c'::uuid, 'Lecture de traceback', 'traceback-python', 'Trouver la cause a partir d''une erreur', (select id from public.skill_categories where slug = 'debugging' limit 1), (select id from public.technologies where lower(trim(name)) = lower(trim('Python')) order by id limit 1), true
where not exists (select 1 from public.skills where lower(trim(name)) = lower(trim('Lecture de traceback')))
on conflict do nothing;

insert into public.skills(id,name,slug,description,category_id,technology_id,is_active)
select '7a8b6869-5a92-45c0-9207-f3651dcb96a0'::uuid, 'Recursivite', 'recursivite', 'Parcours d''arbres et cas de base', (select id from public.skill_categories where slug = 'logic' limit 1), (select id from public.technologies where lower(trim(name)) = lower(trim('TypeScript')) order by id limit 1), true
where not exists (select 1 from public.skills where lower(trim(name)) = lower(trim('Recursivite')))
on conflict do nothing;

insert into public.skills(id,name,slug,description,category_id,technology_id,is_active)
select '650ac385-7299-40e0-8f56-ff93f36405b8'::uuid, 'Structures de donnees', 'structures-donnees', 'Listes, dictionnaires, piles, files', (select id from public.skill_categories where slug = 'logic' limit 1), (select id from public.technologies where lower(trim(name)) = lower(trim('Python')) order by id limit 1), true
where not exists (select 1 from public.skills where lower(trim(name)) = lower(trim('Structures de donnees')))
on conflict do nothing;

insert into public.skills(id,name,slug,description,category_id,technology_id,is_active)
select '8c4c78ac-bab0-4910-9286-93331747a14e'::uuid, 'Complexite algorithmique', 'complexite', 'Estimer et reduire le cout d''un algorithme', (select id from public.skill_categories where slug = 'logic' limit 1), (select id from public.technologies where lower(trim(name)) = lower(trim('TypeScript')) order by id limit 1), true
where not exists (select 1 from public.skills where lower(trim(name)) = lower(trim('Complexite algorithmique')))
on conflict do nothing;

insert into public.skills(id,name,slug,description,category_id,technology_id,is_active)
select '5303dcd1-caf1-429c-81d6-085afcef3947'::uuid, 'Assemblage de fonctions', 'assemblage-fonctions', 'Ordonner les blocs d''un pipeline', (select id from public.skill_categories where slug = 'code-assembly' limit 1), (select id from public.technologies where lower(trim(name)) = lower(trim('Python')) order by id limit 1), true
where not exists (select 1 from public.skills where lower(trim(name)) = lower(trim('Assemblage de fonctions')))
on conflict do nothing;

insert into public.skills(id,name,slug,description,category_id,technology_id,is_active)
select 'bb47d728-5b7b-48c3-90eb-56bfa5399257'::uuid, 'Composition de widgets', 'composition-widgets', 'Assembler une interface Flutter', (select id from public.skill_categories where slug = 'code-assembly' limit 1), (select id from public.technologies where lower(trim(name)) = lower(trim('Flutter')) order by id limit 1), true
where not exists (select 1 from public.skills where lower(trim(name)) = lower(trim('Composition de widgets')))
on conflict do nothing;

insert into public.skills(id,name,slug,description,category_id,technology_id,is_active)
select '61f24d2a-a3d6-4308-9c1b-436d5c8ccd5f'::uuid, 'Revue de code IA', 'revue-code-ia', 'Reperer les erreurs d''une solution generee', (select id from public.skill_categories where slug = 'ai-trap' limit 1), (select id from public.technologies where lower(trim(name)) = lower(trim('Multi-langage')) order by id limit 1), true
where not exists (select 1 from public.skills where lower(trim(name)) = lower(trim('Revue de code IA')))
on conflict do nothing;

insert into public.skills(id,name,slug,description,category_id,technology_id,is_active)
select 'aebc91ff-bfd4-4507-a266-c04e019221f2'::uuid, 'Compétence de test', 'competence-de-test', 'Modifiée pour le test', (select id from public.skill_categories where slug = 'sql' limit 1), (select id from public.technologies where lower(trim(name)) = lower(trim('PostgreSQL')) order by id limit 1), false
where not exists (select 1 from public.skills where lower(trim(name)) = lower(trim('Compétence de test')))
on conflict do nothing;

insert into public.skills(id,name,slug,description,category_id,technology_id,is_active)
select 'ffcf781b-de62-4691-bc91-4da81b1fbbcd'::uuid, 'Test de ma competence', 'test-de-ma-competence', 'Description modifiee', (select id from public.skill_categories where slug = 'sql' limit 1), (select id from public.technologies where lower(trim(name)) = lower(trim('PostgreSQL')) order by id limit 1), false
where not exists (select 1 from public.skills where lower(trim(name)) = lower(trim('Test de ma competence')))
on conflict do nothing;

insert into public.skills(id,name,slug,description,category_id,technology_id,is_active)
select '916a3a25-0a02-48fd-af63-eca4ae2d7c09'::uuid, 'Test Skill Node', 'test-skill-node', 'Test description', (select id from public.skill_categories where slug = 'ai-trap' limit 1), (select id from public.technologies where lower(trim(name)) = lower(trim('Docker')) order by id limit 1), true
where not exists (select 1 from public.skills where lower(trim(name)) = lower(trim('Test Skill Node')))
on conflict do nothing;

insert into public.skills(id,name,slug,description,category_id,technology_id,is_active)
select 'a0577d66-1561-49a3-9ff2-66d3f59412cd'::uuid, 'Architecture Microservices NestJS', 'architecture-microservices-nestjs', 'Découpage modulaire, transport TCP et injection de dépendances avancée.', (select id from public.skill_categories where slug = 'ai-trap' limit 1), (select id from public.technologies where lower(trim(name)) = lower(trim('NestJS')) order by id limit 1), true
where not exists (select 1 from public.skills where lower(trim(name)) = lower(trim('Architecture Microservices NestJS')))
on conflict do nothing;

insert into public.skills(id,name,slug,description,category_id,technology_id,is_active)
select '5233fb55-bb2a-4998-a6bc-be894e62d308'::uuid, 'Architecture NestJS 3', 'architecture-nestjs-3', 'Modules dynamiques, injection de dépendances et architecture hexagonale', (select id from public.skill_categories where slug = 'securite' limit 1), (select id from public.technologies where lower(trim(name)) = lower(trim('NestJS')) order by id limit 1), true
where not exists (select 1 from public.skills where lower(trim(name)) = lower(trim('Architecture NestJS 3')))
on conflict do nothing;

insert into public.skills(id,name,slug,description,category_id,technology_id,is_active)
select '1d830839-90db-429e-ba4a-7ee2431dd15b'::uuid, 'API inventees par l''IA', 'api-hallucinees', 'Detecter fonctions et options inexistantes', (select id from public.skill_categories where slug = 'ai-trap' limit 1), (select id from public.technologies where lower(trim(name)) = lower(trim('Multi-langage')) order by id limit 1), true
where not exists (select 1 from public.skills where lower(trim(name)) = lower(trim('API inventees par l''IA')))
on conflict do nothing;

insert into public.skills(id,name,slug,description,category_id,technology_id,is_active)
select '95c82935-cf51-40de-b98f-9abe07e39b3b'::uuid, 'test', 'test', 'ttt', (select id from public.skill_categories where slug = 'sql' limit 1), (select id from public.technologies where lower(trim(name)) = lower(trim('NestJS')) order by id limit 1), true
where not exists (select 1 from public.skills where lower(trim(name)) = lower(trim('test')))
on conflict do nothing;

insert into public.challenges(id,title,difficulty,category,is_published)
select '8bcf6080-ca82-4176-8f5f-5db17ae4735c'::uuid, 'Defi de test', 'beginner', 'SQL', true
where not exists (select 1 from public.challenges where title = 'Defi de test')
on conflict do nothing;

insert into public.challenges(id,title,difficulty,category,is_published)
select '85573d07-d7f7-4e9d-bb80-45e53d39a104'::uuid, 'Defi test moyen', 'intermediate', 'SQL', true
where not exists (select 1 from public.challenges where title = 'Defi test moyen')
on conflict do nothing;

insert into public.challenges(id,title,difficulty,category,is_published)
select '263f8417-6fb9-4e47-a5fe-e934a6d490ac'::uuid, 'Defi test difficile', 'advanced', 'SQL', true
where not exists (select 1 from public.challenges where title = 'Defi test difficile')
on conflict do nothing;

insert into public.challenges(id,title,difficulty,category,is_published)
select '1a1588ec-e9f6-4f9e-bc85-1eae5826cbc5'::uuid, 'Optimisation Index PostgreSQL', 'intermediate', 'SQL', true
where not exists (select 1 from public.challenges where title = 'Optimisation Index PostgreSQL')
on conflict do nothing;

insert into public.challenge_skills(challenge_id,skill_id,weight)
select (select id from public.challenges where title = 'Defi de test' order by id limit 1),
       (select id from public.skills where lower(trim(name)) = lower(trim('Jointures SQL')) order by id limit 1), 1
on conflict do nothing;

insert into public.challenge_skills(challenge_id,skill_id,weight)
select (select id from public.challenges where title = 'Optimisation Index PostgreSQL' order by id limit 1),
       (select id from public.skills where lower(trim(name)) = lower(trim('Jointures SQL')) order by id limit 1), 2
on conflict do nothing;

insert into public.challenge_skills(challenge_id,skill_id,weight)
select (select id from public.challenges where title = 'Defi de test' order by id limit 1),
       (select id from public.skills where lower(trim(name)) = lower(trim('Architecture Microservices NestJS')) order by id limit 1), 1
on conflict do nothing;

insert into public.challenge_skills(challenge_id,skill_id,weight)
select (select id from public.challenges where title = 'Optimisation Index PostgreSQL' order by id limit 1),
       (select id from public.skills where lower(trim(name)) = lower(trim('Index et performance')) order by id limit 1), 3
on conflict do nothing;

insert into public.challenge_skills(challenge_id,skill_id,weight)
select (select id from public.challenges where title = 'Optimisation Index PostgreSQL' order by id limit 1),
       (select id from public.skills where lower(trim(name)) = lower(trim('Sous-requetes et CTE')) order by id limit 1), 2
on conflict do nothing;

insert into public.challenge_skills(challenge_id,skill_id,weight)
select (select id from public.challenges where title = 'Defi de test' order by id limit 1),
       (select id from public.skills where lower(trim(name)) = lower(trim('Assemblage de fonctions')) order by id limit 1), 1
on conflict do nothing;

insert into public.challenge_skills(challenge_id,skill_id,weight)
select (select id from public.challenges where title = 'Defi de test' order by id limit 1),
       (select id from public.skills where lower(trim(name)) = lower(trim('Lecture de traceback')) order by id limit 1), 1
on conflict do nothing;

insert into public.challenge_skills(challenge_id,skill_id,weight)
select (select id from public.challenges where title = 'Defi de test' order by id limit 1),
       (select id from public.skills where lower(trim(name)) = lower(trim('Composition de widgets')) order by id limit 1), 1
on conflict do nothing;

insert into public.challenge_skills(challenge_id,skill_id,weight)
select (select id from public.challenges where title = 'Defi test difficile' order by id limit 1),
       (select id from public.skills where lower(trim(name)) = lower(trim('Architecture NestJS 3')) order by id limit 1), 2
on conflict do nothing;

insert into public.challenge_skills(challenge_id,skill_id,weight)
select (select id from public.challenges where title = 'Defi test moyen' order by id limit 1),
       (select id from public.skills where lower(trim(name)) = lower(trim('test')) order by id limit 1), 3
on conflict do nothing;

notify pgrst, 'reload schema';
commit;

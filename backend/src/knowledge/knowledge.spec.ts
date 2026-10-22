import {
  BadRequestException,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../app.module';
import { AuthService } from '../auth/auth.service';
import { SupabaseService } from '../supabase/supabase.service';
import { SkillProgressService } from '../skills/skill-progress.service';
import { KnowledgeStore } from './knowledge.store';
import {
  KnowledgeCatalogueService,
  usableResource,
} from './knowledge-catalogue.service';
import {
  KnowledgeImportService,
  normalizedImport,
  parseCsv,
} from './knowledge-import.service';
import {
  rankResources,
  KnowledgeRecommendationsService,
} from './knowledge-recommendations.service';
const user = '00000000-0000-4000-8000-000000000001',
  other = '00000000-0000-4000-8000-000000000002',
  published = '00000000-0000-4000-8000-000000000003',
  draft = '00000000-0000-4000-8000-000000000004',
  delivery = '00000000-0000-4000-8000-000000000005';
function fakeStore() {
  const tables: Record<string, any[]> = {
    knowledge_resources: [
      {
        id: published,
        title: 'SQL notes',
        status: 'published',
        content: 'Reviewed notes',
        resource_skills: [],
        difficulty: 'beginner',
        technology_id: null,
      },
      {
        id: draft,
        title: 'Draft',
        status: 'draft',
        content: '',
        resource_skills: [],
      },
    ],
    knowledge_recommendations: [
      { id: delivery, user_id: other, resource_id: published },
    ],
    knowledge_bookmarks: [
      {
        user_id: other,
        resource_id: published,
        resource: { status: 'draft', content: 'Private draft' },
      },
    ],
    knowledge_progress: [],
    profile_technologies: [],
    knowledge_feedback: [],
  };
  const calls: any[] = [];
  function from(table: string) {
    const filters: [string, unknown][] = [];
    let mode = 'read',
      value: any;
    const query: any = {
      select: () => query,
      order: () => query,
      range: () => query,
      limit: () => query,
      eq: (key: string, value: unknown) => {
        filters.push([key, value]);
        return query;
      },
      in: () => query,
      update: (v: any) => {
        mode = 'update';
        value = v;
        return query;
      },
      delete: () => {
        mode = 'delete';
        return query;
      },
      upsert: (v: any) => {
        mode = 'upsert';
        value = v;
        return query;
      },
      insert: (v: any) => {
        mode = 'insert';
        value = v;
        return query;
      },
    };
    function result(single = false) {
      calls.push({ table, filters: [...filters], mode, value });
      let data = (tables[table] ?? []).filter((row) =>
        filters.every(([key, value]) => row[key] === value),
      );
      if (mode === 'update')
        data = data.map((row) => Object.assign(row, value));
      if (mode === 'insert' || mode === 'upsert')
        data = Array.isArray(value) ? value : [value];
      return {
        data: single ? (data[0] ?? null) : data,
        error: null,
        count: data.length,
      };
    }
    query.maybeSingle = async () => result(true);
    query.single = async () => result(true);
    query.then = (resolve: any, reject: any) =>
      Promise.resolve(result()).then(resolve, reject);
    return query;
  }
  const rpc = jest.fn().mockResolvedValue({
    data: { state: 'started', percentage: 0 },
    error: null,
  });
  return {
    db: { from, rpc },
    check: jest.fn((error: any) => {
      if (error) throw error;
    }),
    calls,
    tables,
  };
}
describe('Knowledge HTTP authorization and ownership', () => {
  let app: INestApplication;
  const store = fakeStore();
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AuthService)
      .useValue({
        authenticate: (header?: string) => {
          if (
            !['Bearer developer', 'Bearer admin', 'Bearer other'].includes(
              header ?? '',
            )
          )
            throw new UnauthorizedException();
          return {
            id: header === 'Bearer other' ? other : user,
            role: header === 'Bearer admin' ? 'admin' : 'developer',
            status: 'active',
          };
        },
      })
      .overrideProvider(SupabaseService)
      .useValue({ client: {} })
      .overrideProvider(KnowledgeStore)
      .useValue(store)
      .overrideProvider(SkillProgressService)
      .useValue({ getUserProgress: jest.fn().mockResolvedValue([]) })
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });
  afterAll(async () => {
    await app?.close();
  });
  it('requires authentication and prevents non-admin creation and publication', async () => {
    await request(app.getHttpServer()).get('/knowledge/resources').expect(401);
    await request(app.getHttpServer())
      .post('/admin/knowledge/resources')
      .set('Authorization', 'Bearer developer')
      .send({ title: 'Bad write' })
      .expect(403);
    await request(app.getHttpServer())
      .post('/admin/knowledge/resources/' + published + '/publish')
      .set('Authorization', 'Bearer developer')
      .expect(403);
  });
  it('never returns drafts through developer direct-ID access; allows admin preview', async () => {
    await request(app.getHttpServer())
      .get('/knowledge/resources/' + draft)
      .set('Authorization', 'Bearer developer')
      .expect(404);
    await request(app.getHttpServer())
      .get('/admin/knowledge/resources/' + draft)
      .set('Authorization', 'Bearer admin')
      .expect(200);
  });
  it('derives bookmark ownership from authentication even if a body spoofs a user', async () => {
    await request(app.getHttpServer())
      .put('/me/knowledge/bookmarks/' + published)
      .set('Authorization', 'Bearer developer')
      .send({ user_id: other })
      .expect(200);
    expect(store.db.rpc).toHaveBeenLastCalledWith(
      'knowledge_save_activity',
      expect.objectContaining({
        p_user: user,
        p_resource: published,
        p_kind: 'bookmark',
      }),
    );
  });
  it('scopes bookmark reads and deletion to the signed-in account', async () => {
    await request(app.getHttpServer())
      .get('/me/knowledge/bookmarks')
      .set('Authorization', 'Bearer developer')
      .expect(200)
      .expect((response) => expect(response.body.items).toEqual([]));
    await request(app.getHttpServer())
      .delete('/me/knowledge/bookmarks/' + published)
      .set('Authorization', 'Bearer developer')
      .expect(200);
    expect(store.calls.at(-1).filters).toContainEqual(['user_id', user]);
  });
  it('redacts content that was archived after bookmarking', async () => {
    await request(app.getHttpServer())
      .get('/me/knowledge/bookmarks')
      .set('Authorization', 'Bearer other')
      .expect(200)
      .expect((response) => expect(response.body.items[0].resource).toBeNull());
  });
  it('validates progress and forbids client-supplied ownership', async () => {
    await request(app.getHttpServer())
      .patch('/me/knowledge/progress/' + published)
      .set('Authorization', 'Bearer developer')
      .send({ percentage: 101 })
      .expect(400);
    await request(app.getHttpServer())
      .patch('/me/knowledge/progress/' + published)
      .set('Authorization', 'Bearer developer')
      .send({ percentage: 50, user_id: other })
      .expect(400);
    await request(app.getHttpServer())
      .get('/me/knowledge/progress?user_id=' + other)
      .set('Authorization', 'Bearer developer')
      .expect(400);
  });
  it('prevents feedback on another account’s recommendation', async () => {
    await request(app.getHttpServer())
      .post('/me/knowledge/feedback')
      .set('Authorization', 'Bearer developer')
      .send({
        resource_id: published,
        recommendation_id: delivery,
        feedback: 'useful',
      })
      .expect(404);
    await request(app.getHttpServer())
      .post('/me/knowledge/feedback')
      .set('Authorization', 'Bearer developer')
      .send({ resource_id: published, feedback: 'useful', user_id: other })
      .expect(400);
  });
  it('records own feedback and scopes progress reads', async () => {
    await request(app.getHttpServer())
      .post('/me/knowledge/feedback')
      .set('Authorization', 'Bearer developer')
      .send({ resource_id: published, feedback: 'useful' })
      .expect(201);
    expect(store.calls.at(-1).value.user_id).toBe(user);
    await request(app.getHttpServer())
      .get('/me/knowledge/progress')
      .set('Authorization', 'Bearer developer')
      .expect(200);
    expect(store.calls.at(-1).filters).toContainEqual(['user_id', user]);
  });
  it('rejects publishing an empty draft and deletion of published resources', async () => {
    await request(app.getHttpServer())
      .post('/admin/knowledge/resources/' + draft + '/publish')
      .set('Authorization', 'Bearer admin')
      .expect(400);
    const catalogue = app.get(KnowledgeCatalogueService);
    const from = store.db.from;
    store.db.from = () =>
      ({
        delete: () => ({
          eq: () => ({
            eq: () => ({ select: async () => ({ data: [], error: null }) }),
          }),
        }),
      }) as any;
    try {
      await expect(catalogue.remove(published)).rejects.toMatchObject({
        status: 409,
      });
    } finally {
      store.db.from = from;
    }
  });
  it('validates UUIDs, pagination, enums and unsafe URLs', async () => {
    for (const query of [
      'page=0',
      'pageSize=1000',
      'sort=raw_sql',
      'type=invalid',
      'status=draft',
    ])
      await request(app.getHttpServer())
        .get('/knowledge/resources?' + query)
        .set('Authorization', 'Bearer developer')
        .expect(400);
    await request(app.getHttpServer())
      .get('/knowledge/resources/not-a-uuid')
      .set('Authorization', 'Bearer developer')
      .expect(400);
    await request(app.getHttpServer())
      .post('/admin/knowledge/resources')
      .set('Authorization', 'Bearer admin')
      .send({ title: 'Unsafe', external_url: 'javascript:alert(1)' })
      .expect(400);
  });
  it('uses the local baseline without a Kaggle service and logs deliveries without impressions', async () => {
    await request(app.getHttpServer())
      .get('/me/knowledge/recommendations')
      .set('Authorization', 'Bearer developer')
      .expect(200)
      .expect((response) => {
        expect(response.body.method).toBe('deterministic-v1');
        expect(response.body.items).toHaveLength(1);
      });
    expect(
      store.calls.some(
        (call) => call.table === 'knowledge_events' && call.mode === 'insert',
      ),
    ).toBe(false);
  });
});
describe('Publication and deterministic recommendations', () => {
  const base = {
    id: 'r1',
    title: 'SQL joins',
    status: 'published',
    difficulty: 'beginner',
    technology_id: 'sql',
    resource_skills: [{ skill_id: 'joins' }],
  };
  it('requires usable content or a safe external URL', () => {
    expect(usableResource({ content: '  ' })).toBe(false);
    expect(usableResource({ external_url: 'javascript:alert(1)' })).toBe(false);
    expect(
      usableResource({ external_url: 'https://user:pass@example.com' }),
    ).toBe(false);
    expect(usableResource({ content: 'Readable text' })).toBe(true);
    expect(usableResource({ external_url: 'https://example.com/learn' })).toBe(
      true,
    );
  });
  it('excludes completed and unavailable resources', () => {
    const result = rankResources(
      [
        base,
        { ...base, id: 'r2', status: 'draft' },
        { ...base, id: 'r3', status: 'archived' },
      ],
      [],
      new Set(),
      new Set(['r1']),
    );
    expect(result).toEqual([]);
  });
  it('does not interpret absent or unevaluated measurements as zero', () => {
    for (const measurement of [
      [],
      [
        {
          skill_id: 'joins',
          status: 'not_evaluated',
          level_score: 0,
          validated_attempts: 0,
        },
      ],
      [
        {
          skill_id: 'joins',
          status: 'beginner',
          level_score: null,
          validated_attempts: 1,
        },
      ],
    ]) {
      const result = rankResources(
        [base],
        measurement,
        new Set(['sql']),
        new Set(),
      );
      expect(result[0].evidence.level_score).toBeNull();
      expect(result[0].target_skill_id).toBeNull();
      expect(result[0].explanation).toContain('technology selected');
    }
  });
  it('uses actual evaluated associations and produces stable ordering', () => {
    const result = rankResources(
      [{ ...base, id: 'z' }, base],
      [
        {
          skill_id: 'joins',
          status: 'beginner',
          level_score: 25,
          validated_attempts: 2,
        },
      ],
      new Set(),
      new Set(),
    );
    expect(result.map((item) => item.resource.id)).toEqual(['r1', 'z']);
    expect(result[0].evidence.level_score).toBe(25);
    expect(result[0].explanation).toContain('measured assessment');
  });
});
describe('CSV validation and replay', () => {
  const row = {
    resource_id: 'coursera-1',
    title: 'SQL joins',
    description: 'Practice joins',
    tags: 'sql;database',
    difficulty: 'Beginner Level',
    external_url: 'https://www.coursera.org/learn/sql',
  };
  it('parses quoted commas, multiline cells, escaped quotes and UTF-8 BOM', () => {
    expect(
      parseCsv('\uFEFFa,b\r\n"x,y","line1\nline2"\r\n"say ""hi""",z'),
    ).toEqual([
      ['a', 'b'],
      ['x,y', 'line1\nline2'],
      ['say "hi"', 'z'],
    ]);
  });
  it('rejects malformed CSV and maps unknown difficulty without inventing duration', () => {
    expect(() => parseCsv('a,b\n"unclosed')).toThrow(BadRequestException);
    expect(normalizedImport({ ...row, difficulty: '' }).difficulty).toBe(
      'unknown',
    );
    expect(normalizedImport(row)).not.toHaveProperty('estimated_minutes');
    expect(() => normalizedImport({ ...row, difficulty: 'Made up' })).toThrow();
    expect(() =>
      normalizedImport({ ...row, external_url: 'javascript:alert(1)' }),
    ).toThrow();
    expect(
      normalizedImport({ ...row, tags: '["sql","sql","joins"]' }).tags,
    ).toEqual(['sql', 'joins']);
  });
  it('reports duplicates, invalid rows and replay without overwriting reviewed edits', async () => {
    const existing = new Set<string>();
    const store = {
      db: {
        from: () => ({
          select: () => ({
            eq: () => ({
              eq: (_: string, id: string) => ({
                maybeSingle: async () => ({
                  data: existing.has(id) ? { id } : null,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      },
      check: () => {},
    };
    const catalogue = {
      save: jest.fn(async (_: unknown, resource: any) => {
        existing.add(resource.external_source_id);
        return resource;
      }),
    };
    const importer = new KnowledgeImportService(store as any, catalogue as any);
    const csv =
      'resource_id,title,description,tags,difficulty,external_url\n1,SQL joins,Notes,sql,beginner,https://example.com/sql\n1,Edited title,Notes,sql,beginner,https://example.com/sql\n2,Bad link,Notes,sql,beginner,javascript:alert(1)';
    expect(
      await importer.import({ csv, attribution: 'Dataset attribution' }, user),
    ).toMatchObject({ accepted: 1, duplicates: 1, rejected: 1 });
    expect(
      await importer.import({ csv, attribution: 'Dataset attribution' }, user),
    ).toMatchObject({ accepted: 0, duplicates: 2, rejected: 1 });
    expect(catalogue.save).toHaveBeenCalledTimes(1);
    expect(catalogue.save.mock.calls[0][1]).toMatchObject({
      source: 'coursera',
      skill_ids: [],
      attribution: 'Dataset attribution',
    });
  });
});

describe('Recommendation delivery rechecks and optional interests', () => {
  const resource = {
    id: published,
    title: 'SQL',
    status: 'published',
    difficulty: 'unknown',
    technology_id: null,
    resource_skills: [],
  };
  function scenario(mode: 'archived' | 'completed' | 'missing_interests') {
    let resourceReads = 0,
      progressReads = 0;
    const insert = jest.fn().mockResolvedValue({ error: null });
    const store = {
      db: {
        from: (table: string) => {
          let result: any = { data: [], error: null };
          if (table === 'knowledge_resources') {
            resourceReads++;
            result.data =
              mode === 'archived' && resourceReads > 1 ? [] : [resource];
          }
          if (table === 'knowledge_progress') {
            progressReads++;
            result.data =
              mode === 'completed' && progressReads > 1
                ? [{ resource_id: published }]
                : [];
          }
          if (table === 'profile_technologies' && mode === 'missing_interests')
            result = { data: null, error: { code: 'PGRST205' } };
          const query: any = {
            select: () => query,
            eq: () => query,
            in: () => query,
            limit: () => query,
            order: () => query,
            insert,
            then: (resolve: any, reject: any) =>
              Promise.resolve(result).then(resolve, reject),
          };
          return query;
        },
      },
      check: (error: unknown) => {
        if (error) throw error;
      },
    };
    return {
      service: new KnowledgeRecommendationsService(
        store as any,
        { getUserProgress: async () => [] } as any,
      ),
      insert,
    };
  }
  it.each(['archived', 'completed'] as const)(
    'excludes resources %s after ranking and does not log unavailable deliveries',
    async (mode) => {
      const { service, insert } = scenario(mode);
      expect((await service.recommend(user)).items).toEqual([]);
      expect(insert).not.toHaveBeenCalled();
    },
  );
  it('continues with the deterministic baseline when optional interests are unavailable', async () => {
    const { service, insert } = scenario('missing_interests');
    const output = await service.recommend(user);
    expect(output.items).toHaveLength(1);
    expect(output.method).toBe('deterministic-v1');
    expect(insert.mock.calls[0][0][0].evidence.interests_available).toBe(false);
  });
});

describe('Resource RPC compatibility', () => {
  it.each(['object', 'array'])(
    'supports PostgREST composite %s responses',
    async (shape) => {
      const row = { id: published };
      const store = {
        db: {
          rpc: jest.fn().mockResolvedValue({
            data: shape === 'array' ? [row] : row,
            error: null,
          }),
        },
        check: () => {},
      };
      const catalogue = new KnowledgeCatalogueService(store as any);
      catalogue.detail = jest.fn().mockResolvedValue(row);
      expect(
        await catalogue.save(null, { title: 'SQL notes', skill_ids: [] }, user),
      ).toEqual(row);
      expect(store.db.rpc).toHaveBeenCalledWith(
        'knowledge_save_resource',
        expect.objectContaining({
          p_actor: user,
          p_skills: [],
          p_data: { title: 'SQL notes' },
        }),
      );
    },
  );
});

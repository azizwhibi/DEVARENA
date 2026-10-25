import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { KnowledgeCatalogueService } from './knowledge-catalogue.service';
import { KnowledgeExplanationService } from './knowledge-explanation.service';
describe('Grounded lesson explanations', () => {
  let original: typeof fetch;
  const catalogue = { resource: jest.fn() };
  const settings = {
    AI_PROVIDER: 'gemini',
    AI_MODEL: 'gemini-2.5-flash-lite',
    AI_API_KEY: 'test-only-not-a-key',
  };
  const config = new ConfigService(settings);
  const lesson = {
    id: 'lesson',
    title: 'Array notes',
    status: 'published',
    content: 'Arrays start at zero.',
    hidden_tests: ['secret'],
    reference_solution: 'secret',
  };
  beforeEach(() => {
    original = global.fetch;
    catalogue.resource.mockReset().mockResolvedValue(lesson);
  });
  afterEach(() => {
    global.fetch = original;
  });
  const service = (c: ConfigService = config) =>
    new KnowledgeExplanationService(
      c,
      catalogue as unknown as KnowledgeCatalogueService,
    );
  const good = () =>
    new Response(
      JSON.stringify({
        candidates: [
          {
            finishReason: 'STOP',
            content: { parts: [{ text: 'Items have positions.' }] },
          },
        ],
      }),
      { status: 200 },
    );
  it('sends only bounded lesson fields, never private fields or IDs', async () => {
    const send = jest.fn().mockResolvedValue(good());
    global.fetch = send;
    const output = await service().explain('private-user', 'lesson');
    const [url, options] = send.mock.calls[0] as [string, RequestInit];
    expect(url).not.toContain(settings.AI_API_KEY);
    expect(options.headers).toMatchObject({
      'x-goog-api-key': settings.AI_API_KEY,
    });
    expect(options.body).not.toMatch(
      /private-user|hidden_tests|reference_solution|secret/,
    );
    expect(output).toMatchObject({
      ai_generated: true,
      reviewed: false,
      text: 'Items have positions.',
    });
  });
  it('rejects draft/missing resources before contacting Gemini', async () => {
    global.fetch = jest.fn();
    catalogue.resource.mockRejectedValue(new NotFoundException());
    await expect(service().explain('user', 'draft')).rejects.toMatchObject({
      status: 404,
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });
  it('rejects empty lessons and missing configuration', async () => {
    global.fetch = jest.fn();
    catalogue.resource.mockResolvedValue({ ...lesson, content: '' });
    await expect(service().explain('user', 'lesson')).rejects.toMatchObject({
      status: 400,
    });
    catalogue.resource.mockResolvedValue(lesson);
    await expect(
      service(new ConfigService({})).explain('user', 'lesson'),
    ).rejects.toMatchObject({ status: 503 });
    expect(global.fetch).not.toHaveBeenCalled();
  });
  it('maps provider failures without exposing provider payloads', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        new Response('private provider diagnostic', { status: 429 }),
      );
    await expect(service().explain('user', 'lesson')).rejects.toMatchObject({
      status: 503,
    });
  });
  it('handles timeout and empty/blocked responses', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new DOMException('timeout', 'TimeoutError'));
    await expect(service().explain('user', 'lesson')).rejects.toMatchObject({
      status: 504,
    });
    global.fetch = jest
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ candidates: [] })));
    await expect(service().explain('user', 'lesson')).rejects.toMatchObject({
      status: 503,
    });
  });
  it('limits per user and allows a different user independently', async () => {
    global.fetch = jest.fn().mockImplementation(async () => good());
    const instance = service();
    for (let i = 0; i < 5; i++) await instance.explain('a', 'lesson');
    await expect(instance.explain('a', 'lesson')).rejects.toMatchObject({
      status: 429,
    });
    await expect(instance.explain('b', 'lesson')).resolves.toMatchObject({
      ai_generated: true,
    });
  });
  it('does not return content archived while the provider was running', async () => {
    global.fetch = jest.fn().mockResolvedValue(good());
    catalogue.resource
      .mockResolvedValueOnce(lesson)
      .mockRejectedValueOnce(new NotFoundException());
    await expect(service().explain('user', 'lesson')).rejects.toMatchObject({
      status: 404,
    });
  });
});

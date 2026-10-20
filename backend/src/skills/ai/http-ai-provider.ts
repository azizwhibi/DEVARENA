import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AiProvider } from './ai-provider.interface';

/** Réponse canonique OpenAI-compatible (chat completions). */
interface OpenAiChoice {
  message: { content: string };
}
interface OpenAiResponse {
  choices: OpenAiChoice[];
}

/** Réponse Anthropic Messages API. */
interface AnthropicContent {
  type: string;
  text?: string;
}
interface AnthropicResponse {
  content: AnthropicContent[];
}

/** Réponse Google Gemini generateContent. */
interface GeminiPart {
  text?: string;
}
interface GeminiCandidate {
  content: { parts: GeminiPart[] };
}
interface GeminiResponse {
  candidates: GeminiCandidate[];
}

/**
 * Provider IA générique configurable par variables d'environnement.
 *
 * AI_PROVIDER = 'openai' | 'anthropic' | 'gemini'
 * AI_MODEL    = identifiant du modèle (ex : gpt-4o-mini, claude-3-haiku-20240307, gemini-1.5-flash)
 * AI_API_KEY  = clé API — jamais exposée au client
 *
 * Chaque provider utilise un AbortController pour respecter timeoutMs.
 * La clé est lue uniquement au moment de l'appel (pas en cache de module).
 */
@Injectable()
export class HttpAiProvider implements AiProvider {
  private readonly logger = new Logger(HttpAiProvider.name);

  constructor(private readonly config: ConfigService) {}

  private get provider(): string {
    return (this.config.get<string>('AI_PROVIDER') ?? 'openai').toLowerCase();
  }
  private get model(): string {
    return this.config.get<string>('AI_MODEL') ?? 'gpt-4o-mini';
  }
  private get apiKey(): string {
    return this.config.get<string>('AI_API_KEY') ?? '';
  }

  async generateJson(
    systemPrompt: string,
    userBlock: string,
    timeoutMs: number,
  ): Promise<unknown | null> {
    try {
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), timeoutMs);

      let raw: string | null;
      try {
        raw = await this.callProvider(systemPrompt, userBlock, ac.signal);
      } finally {
        clearTimeout(timer);
      }

      if (raw === null) return null;

      // Extraction robuste du bloc JSON (le modèle peut entourer de ``` json ```)
      const cleaned = raw
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/, '')
        .trim();

      return JSON.parse(cleaned);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`AI provider error: ${msg}`);
      return null;
    }
  }

  private async callProvider(
    systemPrompt: string,
    userBlock: string,
    signal: AbortSignal,
  ): Promise<string | null> {
    switch (this.provider) {
      case 'anthropic':
        return this.callAnthropic(systemPrompt, userBlock, signal);
      case 'gemini':
        return this.callGemini(systemPrompt, userBlock, signal);
      default:
        return this.callOpenAi(systemPrompt, userBlock, signal);
    }
  }

  // ── OpenAI (Chat Completions) ─────────────────────────────────────────────

  private async callOpenAi(
    system: string,
    user: string,
    signal: AbortSignal,
  ): Promise<string | null> {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });
    if (!res.ok) {
      this.logger.warn(`OpenAI HTTP ${res.status}`);
      return null;
    }
    const body = (await res.json()) as OpenAiResponse;
    return body.choices?.[0]?.message?.content ?? null;
  }

  // ── Anthropic (Messages API) ──────────────────────────────────────────────

  private async callAnthropic(
    system: string,
    user: string,
    signal: AbortSignal,
  ): Promise<string | null> {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 512,
        system,
        messages: [{ role: 'user', content: user }],
      }),
    });
    if (!res.ok) {
      this.logger.warn(`Anthropic HTTP ${res.status}`);
      return null;
    }
    const body = (await res.json()) as AnthropicResponse;
    const block = body.content?.find((c) => c.type === 'text');
    return block?.text ?? null;
  }

  // ── Google Gemini (generateContent) ──────────────────────────────────────

  private async callGemini(
    system: string,
    user: string,
    signal: AbortSignal,
  ): Promise<string | null> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    });
    if (!res.ok) {
      this.logger.warn(`Gemini HTTP ${res.status}`);
      return null;
    }
    const body = (await res.json()) as GeminiResponse;
    return body.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  }
}

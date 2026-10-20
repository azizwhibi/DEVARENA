import { BadRequestException, Injectable } from '@nestjs/common';
import { isURL } from 'class-validator';
import { KnowledgeStore } from './knowledge.store';
import { KnowledgeCatalogueService } from './knowledge-catalogue.service';
import { ImportDto } from './knowledge.dto';

export function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = '',
    quoted = false,
    closed = false;
  const text = input.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else cell += char;
    } else if (char === '"' && !cell && !closed) quoted = true;
    else if (char === ',' || char === '\n') {
      row.push(cell);
      cell = '';
      closed = false;
      if (char === '\n') {
        if (row.some((value) => value.trim())) rows.push(row);
        row = [];
      }
    } else {
      if (closed && char !== '\r')
        throw new BadRequestException('CSV invalide après un guillemet.');
      if (char === '"')
        throw new BadRequestException('Guillemets CSV invalides.');
      cell += char;
    }
  }
  if (quoted) throw new BadRequestException('Guillemet CSV non fermé.');
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  if (rows.length > 501)
    throw new BadRequestException('Import limité à 500 lignes.');
  return rows;
}
const DIFFICULTY: Record<string, string> = {
  '': 'unknown',
  unknown: 'unknown',
  'not specified': 'unknown',
  'not specified level': 'unknown',
  beginner: 'beginner',
  'beginner level': 'beginner',
  introductory: 'beginner',
  intermediate: 'intermediate',
  'intermediate level': 'intermediate',
  advanced: 'advanced',
  'advanced level': 'advanced',
  expert: 'advanced',
  mixed: 'unknown',
  'mixed level': 'unknown',
  tous: 'unknown',
};
export function normalizedImport(row: Record<string, string>) {
  const title = row.title?.trim(),
    id = row.resource_id?.trim(),
    url = row.external_url?.trim();
  if (
    !id ||
    id.length > 200 ||
    !title ||
    title.length < 2 ||
    title.length > 200
  )
    throw new Error('Identifiant ou titre invalide.');
  if ((row.description?.length ?? 0) > 2000)
    throw new Error('Description trop longue.');
  if (
    !url ||
    url.length > 2000 ||
    !isURL(url, {
      protocols: ['http', 'https'],
      require_protocol: true,
      disallow_auth: true,
    })
  )
    throw new Error('URL externe HTTP(S) invalide.');
  const difficulty = DIFFICULTY[(row.difficulty ?? '').trim().toLowerCase()];
  if (!difficulty) throw new Error('Difficulté inconnue : mapping à vérifier.');
  let tags: string[];
  if (row.tags?.trim().startsWith('[')) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(row.tags);
    } catch {
      throw new Error('Tags JSON invalides.');
    }
    if (
      !Array.isArray(parsed) ||
      !parsed.every((value) => typeof value === 'string')
    )
      throw new Error('Les tags doivent être des textes.');
    tags = parsed;
  } else tags = (row.tags ?? '').split(/[;|,]/);
  tags = [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))];
  if (tags.length > 20 || tags.some((tag) => tag.length > 50))
    throw new Error('Tags trop nombreux ou trop longs.');
  return {
    title,
    external_source_id: id,
    description: row.description?.trim() ?? '',
    external_url: url,
    difficulty,
    tags,
    resource_type: 'course',
    source: 'coursera',
  };
}
@Injectable()
export class KnowledgeImportService {
  constructor(
    private readonly store: KnowledgeStore,
    private readonly catalogue: KnowledgeCatalogueService,
  ) {}
  async import(dto: ImportDto, actor: string) {
    const [headers, ...rows] = parseCsv(dto.csv);
    const required = [
      'resource_id',
      'title',
      'description',
      'tags',
      'difficulty',
      'external_url',
    ];
    if (
      !headers ||
      new Set(headers).size !== headers.length ||
      required.some((header) => !headers.includes(header))
    )
      throw new BadRequestException(
        'En-têtes attendus : ' + required.join(', '),
      );
    const report: {
      accepted: number;
      rejected: number;
      duplicates: number;
      rows: {
        line: number;
        status: string;
        message?: string;
        resource_id?: string;
      }[];
    } = { accepted: 0, rejected: 0, duplicates: 0, rows: [] };
    const seen = new Set<string>();
    for (let index = 0; index < rows.length; index++) {
      const entry = rows[index];
      try {
        if (entry.length !== headers.length)
          throw new Error('Nombre de colonnes incorrect.');
        const resource = normalizedImport(
          Object.fromEntries(headers.map((header, i) => [header, entry[i]])),
        );
        if (seen.has(resource.external_source_id)) {
          report.duplicates++;
          report.rows.push({
            line: index + 2,
            status: 'duplicate',
            resource_id: resource.external_source_id,
          });
          continue;
        }
        seen.add(resource.external_source_id);
        const existing = await this.store.db
          .from('knowledge_resources')
          .select('id')
          .eq('source', 'coursera')
          .eq('external_source_id', resource.external_source_id)
          .maybeSingle();
        this.store.check(existing.error);
        if (existing.data) {
          report.duplicates++;
          report.rows.push({
            line: index + 2,
            status: 'duplicate',
            resource_id: resource.external_source_id,
          });
          continue;
        }
        // Inserts only: replay preserves manually reviewed content and associations.
        try {
          await this.catalogue.save(
            null,
            { ...resource, attribution: dto.attribution, skill_ids: [] },
            actor,
          );
        } catch (error) {
          if ((error as { getStatus?: () => number }).getStatus?.() === 409) {
            report.duplicates++;
            report.rows.push({
              line: index + 2,
              status: 'duplicate',
              resource_id: resource.external_source_id,
            });
            continue;
          }
          throw error;
        }
        report.accepted++;
        report.rows.push({
          line: index + 2,
          status: 'accepted',
          resource_id: resource.external_source_id,
        });
      } catch (error) {
        report.rejected++;
        report.rows.push({
          line: index + 2,
          status: 'rejected',
          message: error instanceof Error ? error.message : 'Ligne invalide.',
        });
      }
    }
    return report;
  }
}

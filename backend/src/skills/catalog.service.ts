import { Injectable } from '@nestjs/common';
import { SupabaseService } from './skills-database.service';
import { CatalogQueryDto } from './dto/catalog-query.dto';

@Injectable()
export class CatalogService {
  constructor(private readonly supabase: SupabaseService) {}

  async list(query: CatalogQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let req = this.supabase.client
      .from('skills')
      .select(
        'id, name, slug, description, category:skill_categories(id, name), technology:technologies(id, name)',
        { count: 'exact' },
      )
      .eq('is_active', true);

    if (query.category) req = req.eq('category_id', query.category);
    if (query.technology) req = req.eq('technology_id', query.technology);
    if (query.q) {
      const safe = query.q.replace(/[%,()]/g, ' ').trim();
      if (safe) req = req.ilike('name', `%${safe}%`);
    }

    const { data, count, error } = await req.order('name').range(from, to);
    if (error) throw error;

    return { items: data ?? [], total: count ?? 0, page, pageSize };
  }
}

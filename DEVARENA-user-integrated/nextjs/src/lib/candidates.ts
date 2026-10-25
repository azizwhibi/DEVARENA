export interface CandidateItem {
  id: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  country: string | null;
  institution: string | null;
  skills: string[];
  tier: string;
  devScore: number;
  availability: string;
  createdAt: string;
}

export interface CandidatesResponse {
  items: CandidateItem[];
  total: number;
  page: number;
  pageSize: number;
}

export function filterCandidates(
  candidates: CandidateItem[],
  searchQuery: string,
  selectedTech: string,
): CandidateItem[] {
  const q = searchQuery.trim().toLowerCase();
  return candidates.filter((c) => {
    const matchesSearch =
      !q ||
      c.username.toLowerCase().includes(q) ||
      (c.institution ? c.institution.toLowerCase().includes(q) : false) ||
      (c.bio ? c.bio.toLowerCase().includes(q) : false) ||
      c.skills.some((s) => s.toLowerCase().includes(q));
    const matchesTech =
      selectedTech === 'all' ||
      c.skills.some((s) => s.toLowerCase() === selectedTech.toLowerCase());
    return matchesSearch && matchesTech;
  });
}

export function buildCandidatesQuery(params: {
  page?: number;
  pageSize?: number;
  q?: string;
  technology?: string;
}): string {
  const qp = new URLSearchParams();
  if (params.page && params.page > 1) qp.set('page', String(params.page));
  if (params.pageSize && params.pageSize !== 20) qp.set('pageSize', String(params.pageSize));
  if (params.q?.trim()) qp.set('q', params.q.trim());
  if (params.technology && params.technology !== 'all') qp.set('technology', params.technology.trim());
  const qs = qp.toString();
  return qs ? `/recruiter/candidates?${qs}` : '/recruiter/candidates';
}

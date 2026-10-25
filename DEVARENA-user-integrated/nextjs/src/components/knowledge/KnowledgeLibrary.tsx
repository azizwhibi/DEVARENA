'use client';
import { useEffect, useState } from 'react';
import {
  difficulties,
  types,
  useKnowledge,
  type Meta,
  type Page,
  type Recommendations,
  type Resource,
} from '@/lib/knowledge';
import {
  Failure,
  KnowledgeNav,
  Loading,
  Pagination,
  ResourceCard,
} from './KnowledgeUI';
import styles from './knowledge.module.css';
export function KnowledgeLibrary() {
  const [search, setSearch] = useState(''),
    [q, setQ] = useState(''),
    [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    type: '',
    difficulty: '',
    technology: '',
    skill: '',
  });
  useEffect(() => {
    const timer = setTimeout(() => {
      setQ(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  const params = new URLSearchParams({
    page: String(page),
    pageSize: '12',
    sort: 'newest',
  });
  if (q) params.set('q', q);
  for (const [key, value] of Object.entries(filters))
    if (value) params.set(key, value);
  const catalogue = useKnowledge<Page<Resource>>(
    '/knowledge/resources?' + params.toString(),
  );
  const meta = useKnowledge<Meta>('/knowledge/meta');
  const recommendations = useKnowledge<Recommendations>(
    '/me/knowledge/recommendations',
  );
  const showRecommended =
    !q && !Object.values(filters).some(Boolean) && page === 1;
  const recommendedIds = new Set(
    showRecommended
      ? (recommendations.data?.items ?? []).map((item) => item.resource.id)
      : [],
  );
  function filter(key: keyof typeof filters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  }
  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1 className="page-title">Knowledge</h1>
          <p className="page-subtitle">Resources for your next skill.</p>
        </div>
      </header>
      <KnowledgeNav />
      <div className={styles.filters}>
        <label className={styles.search}>
          Search
          <input
            type="search"
            className="input"
            placeholder="Title or description"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label>
          Format
          <select
            className="input"
            value={filters.type}
            onChange={(event) => filter('type', event.target.value)}
          >
            <option value="">All formats</option>
            {Object.entries(types).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Difficulty
          <select
            className="input"
            value={filters.difficulty}
            onChange={(event) => filter('difficulty', event.target.value)}
          >
            <option value="">All</option>
            {Object.entries(difficulties).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Technology
          <select
            className="input"
            value={filters.technology}
            onChange={(event) => filter('technology', event.target.value)}
          >
            <option value="">All</option>
            {meta.data?.technologies.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Skill
          <select
            className="input"
            value={filters.skill}
            onChange={(event) => filter('skill', event.target.value)}
          >
            <option value="">All</option>
            {meta.data?.skills.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {meta.error && <Failure message={meta.error} retry={meta.reload} />}
      {showRecommended && (
        <section className={styles.section} aria-label="Recommended resources">
          {recommendations.loading ? (
            <Loading />
          ) : recommendations.error ? (
            <Failure
              message={recommendations.error}
              retry={recommendations.reload}
            />
          ) : (
            !!recommendations.data?.items.length && (
              <>
                <h2 className="section-title">For you</h2>
                <div className={styles.cards}>
                  {recommendations.data.items.map((item) => (
                    <ResourceCard
                      key={item.recommendation_id}
                      resource={item.resource}
                      reason={item.explanation}
                      recommendationId={item.recommendation_id}
                      hideBookmark
                    />
                  ))}
                </div>
              </>
            )
          )}
        </section>
      )}
      <section aria-label="Catalogue">
        {catalogue.loading ? (
          <Loading />
        ) : catalogue.error ? (
          <Failure message={catalogue.error} retry={catalogue.reload} />
        ) : catalogue.data && !catalogue.data.items.length ? (
          <div className="empty-state">
            <h2>
              {q || Object.values(filters).some(Boolean)
                ? 'No resources found'
                : 'No published resources'}
            </h2>
            <p>
              {q || Object.values(filters).some(Boolean)
                ? 'Try another filter.'
                : 'Tutorials and courses appear after publication.'}
            </p>
          </div>
        ) : (
          <>
            {!!catalogue.data?.items.filter(
              (item) => !recommendedIds.has(item.id),
            ).length && (
              <>
                <h2 className="section-title">Library</h2>
                <div className={styles.cards}>
                  {catalogue.data.items
                    .filter((item) => !recommendedIds.has(item.id))
                    .map((resource) => (
                      <ResourceCard key={resource.id} resource={resource} />
                    ))}
                </div>
              </>
            )}
            {catalogue.data && (
              <Pagination {...catalogue.data} onPage={setPage} />
            )}
          </>
        )}
      </section>
    </div>
  );
}

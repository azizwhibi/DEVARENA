'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  apiRequest,
  errorText,
  statuses,
  useKnowledge,
  type Page,
  type Resource,
} from '@/lib/knowledge';
import { Failure, Loading, Pagination } from './KnowledgeUI';
import { ResourceContent } from './KnowledgeDetail';
import styles from './knowledge.module.css';
type ImportReport = {
  accepted: number;
  rejected: number;
  duplicates: number;
  rows: {
    line: number;
    status: string;
    message?: string;
    resource_id?: string;
  }[];
};
function ImportResources({ onImported }: { onImported: () => void }) {
  const [csv, setCsv] = useState(''),
    [attribution, setAttribution] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [report, setReport] = useState<ImportReport>();
  async function importCsv() {
    setBusy(true);
    setError('');
    setReport(undefined);
    try {
      const result = await apiRequest<ImportReport>('/admin/knowledge/import', {
        method: 'POST',
        body: JSON.stringify({ csv, attribution: attribution.trim() }),
      });
      setReport(result);
      onImported();
    } catch (error) {
      setError(errorText(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className={'card ' + styles.section}>
      <summary>Import CSV catalogue</summary>
      <div className={styles.form}>
        <p className="muted">
          Coursera · Import new drafts. Existing resources are preserved.
        </p>
        <label>
          CSV file
          <input
            type="file"
            accept=".csv,text/csv"
            className={styles.file}
            disabled={busy}
            onChange={async (event) => {
              setError('');
              setCsv('');
              setReport(undefined);
              const file = event.target.files?.[0];
              if (!file) return;
              if (file.size > 80000) {
                setError('Maximum file size: 80 KB.');
                return;
              }
              try {
                setCsv(await file.text());
              } catch {
                setError('Unable to read this file.');
              }
            }}
          />
        </label>
        <label>
          Attribution and source
          <input
            className="input"
            maxLength={1000}
            value={attribution}
            onChange={(event) => setAttribution(event.target.value)}
            disabled={busy}
            placeholder="Enter the dataset name and source"
          />
        </label>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={busy || !csv || !attribution.trim()}
          onClick={importCsv}
        >
          {busy ? 'Importing…' : 'Import as drafts'}
        </button>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        {report && (
          <div className={styles.report} role="status">
            <p>
              {report.accepted} accepted · {report.rejected} rejected ·{' '}
              {report.duplicates} doublons
            </p>
            <ul>
              {report.rows.map((row) => (
                <li key={row.line}>
                  Row {row.line} ·{' '}
                  {row.status === 'accepted'
                    ? 'Accepted'
                    : row.status === 'duplicate'
                      ? 'Duplicate'
                      : 'Rejected'}
                  {row.resource_id ? ' · ' + row.resource_id : ''}
                  {row.message ? ' · ' + row.message : ''}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </details>
  );
}
function Preview({ id, onClose }: { id: string; onClose: () => void }) {
  const result = useKnowledge<Resource>('/admin/knowledge/resources/' + id);
  return (
    <section className={'card ' + styles.section} aria-label="Admin preview">
      <header className="page-header">
        <h2 className="section-title">Preview</h2>
        <button className="btn btn-ghost" onClick={onClose}>
          Close
        </button>
      </header>
      {result.loading ? (
        <Loading />
      ) : result.error ? (
        <Failure message={result.error} retry={result.reload} />
      ) : (
        result.data && (
          <div className={styles.detail}>
            <h2 className="page-title">{result.data.title}</h2>
            <ResourceContent resource={result.data} trackClicks={false} />
          </div>
        )
      )}
    </section>
  );
}
export function KnowledgeAdmin() {
  const [search, setSearch] = useState(''),
    [q, setQ] = useState(''),
    [status, setStatus] = useState(''),
    [page, setPage] = useState(1),
    [preview, setPreview] = useState(''),
    [deleting, setDeleting] = useState<Resource>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setQ(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  const params = new URLSearchParams({ page: String(page), pageSize: '12' });
  if (q) params.set('q', q);
  if (status) params.set('status', status);
  const result = useKnowledge<Page<Resource>>(
    '/admin/knowledge/resources?' + params.toString(),
  );
  async function action(
    resource: Resource,
    action: 'publish' | 'archive' | 'delete',
  ) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await apiRequest(
        '/admin/knowledge/resources/' +
          resource.id +
          (action === 'delete' ? '' : '/' + action),
        { method: action === 'delete' ? 'DELETE' : 'POST' },
      );
      setDeleting(undefined);
      if (preview === resource.id) setPreview('');
      if (result.data?.items.length === 1 && page > 1) setPage(page - 1);
      else result.reload();
    } catch (error) {
      setError(errorText(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page-container">
      <header className="page-header">
        <h1 className="page-title">Resource management</h1>
        <Link href="/admin/knowledge/new" className="btn btn-primary">
          New resource
        </Link>
      </header>
      <ImportResources onImported={result.reload} />
      <div className={styles.columns + ' ' + styles.section}>
        <label>
          Search
          <input
            className="input"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Title or description"
          />
        </label>
        <label>
          Status
          <select
            className="input"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All</option>
            {Object.entries(statuses).map(([key, label]) => (
              <option value={key} key={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {deleting && (
        <div role="alert" className={styles.confirm}>
          <p>Delete draft “ {deleting.title} ”?</p>
          <button
            className="btn btn-secondary"
            disabled={busy}
            onClick={() => setDeleting(undefined)}
          >
            Cancel
          </button>
          <button
            className="btn btn-secondary"
            disabled={busy}
            onClick={() => action(deleting, 'delete')}
          >
            Delete
          </button>
        </div>
      )}
      {preview && (
        <Preview key={preview} id={preview} onClose={() => setPreview('')} />
      )}
      <section className={styles.section}>
        {result.loading ? (
          <Loading />
        ) : result.error ? (
          <Failure message={result.error} retry={result.reload} />
        ) : result.data && !result.data.items.length ? (
          <div className="empty-state">
            <h2>No resources</h2>
          </div>
        ) : (
          <div className="card table-card">
            <table>
              <thead>
                <tr>
                  <th>Resource</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {result.data?.items.map((resource) => (
                  <tr key={resource.id}>
                    <td>{resource.title}</td>
                    <td>
                      <span className="badge badge-muted">
                        {statuses[resource.status]}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <Link
                          className="btn btn-ghost"
                          href={'/admin/knowledge/' + resource.id + '/edit'}
                        >
                          Edit
                        </Link>
                        <button
                          className="btn btn-ghost"
                          onClick={() => setPreview(resource.id)}
                        >
                          Preview
                        </button>
                        {resource.status !== 'published' && (
                          <button
                            className="btn btn-secondary"
                            disabled={busy}
                            onClick={() => action(resource, 'publish')}
                          >
                            Publish
                          </button>
                        )}
                        {resource.status !== 'archived' && (
                          <button
                            className="btn btn-ghost"
                            disabled={busy}
                            onClick={() => action(resource, 'archive')}
                          >
                            Archive
                          </button>
                        )}
                        {resource.status === 'draft' && (
                          <button
                            className="btn btn-ghost"
                            disabled={busy}
                            onClick={() => setDeleting(resource)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {result.data && <Pagination {...result.data} onPage={setPage} />}
      </section>
    </div>
  );
}

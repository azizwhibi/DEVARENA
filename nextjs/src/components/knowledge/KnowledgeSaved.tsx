"use client";
import { useState } from "react";
import {
  apiRequest,
  errorText,
  useKnowledge,
  type Page,
  type Progress,
  type Resource,
} from "@/lib/knowledge";
import {
  Failure,
  KnowledgeNav,
  Loading,
  Pagination,
  ResourceCard,
} from "./KnowledgeUI";
import styles from "./knowledge.module.css";
type RecordItem = Partial<Progress> & {
  resource_id: string;
  resource: Resource | null;
  created_at?: string;
};
export function KnowledgeSaved({ kind }: { kind: "bookmarks" | "progress" }) {
  const [page, setPage] = useState(1),
    [error, setError] = useState(""),
    [busy, setBusy] = useState("");
  const result = useKnowledge<Page<RecordItem>>(
    "/me/knowledge/" + kind + "?page=" + page + "&pageSize=12",
  );
  function removed() {
    if (result.data?.items.length === 1 && page > 1) setPage(page - 1);
    else result.reload();
  }
  async function remove(id: string) {
    setBusy(id);
    setError("");
    try {
      await apiRequest("/me/knowledge/bookmarks/" + id, { method: "DELETE" });
      removed();
    } catch (error) {
      setError(errorText(error));
    } finally {
      setBusy("");
    }
  }
  return (
    <div className="page-container">
      <header className="page-header">
        <h1 className="page-title">
          {kind === "bookmarks"
            ? "Ressources enregistrées"
            : "Progression d’apprentissage"}
        </h1>
      </header>
      <KnowledgeNav />
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {result.loading ? (
        <Loading />
      ) : result.error ? (
        <Failure message={result.error} retry={result.reload} />
      ) : result.data && !result.data.items.length ? (
        <div className="empty-state">
          <h2>
            {kind === "bookmarks"
              ? "Aucune ressource enregistrée"
              : "Aucune ressource commencée"}
          </h2>
        </div>
      ) : (
        <>
          <div className={styles.cards}>
            {result.data?.items.map((item) => (
              <div key={item.resource_id} className={styles.resource}>
                {item.resource ? (
                  <ResourceCard
                    resource={{
                      ...item.resource,
                      bookmarked:
                        kind === "bookmarks" ? true : item.resource.bookmarked,
                    }}
                    hideBookmark={kind === "progress"}
                    onRemove={removed}
                  />
                ) : (
                  <div className="card">
                    <h2>Ressource indisponible</h2>
                    {kind === "bookmarks" && (
                      <button
                        className="btn btn-secondary"
                        disabled={busy === item.resource_id}
                        onClick={() => remove(item.resource_id)}
                      >
                        Retirer des enregistrements
                      </button>
                    )}
                  </div>
                )}
                {kind === "progress" && (
                  <div className="card">
                    <p>
                      {item.state === "completed" ? "Terminée" : "En cours"} ·{" "}
                      {item.percentage}%
                    </p>
                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{ width: String(item.percentage) + "%" }}
                      />
                    </div>
                    <p className="muted">
                      Commencée le{" "}
                      {new Date(item.started_at!).toLocaleDateString("fr-FR")}
                      {item.completed_at
                        ? " · Terminée le " +
                          new Date(item.completed_at).toLocaleDateString(
                            "fr-FR",
                          )
                        : " · Mise à jour le " +
                          new Date(item.updated_at!).toLocaleDateString(
                            "fr-FR",
                          )}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
          {result.data && <Pagination {...result.data} onPage={setPage} />}
        </>
      )}
    </div>
  );
}

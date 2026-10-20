"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  apiRequest,
  difficulties,
  errorText,
  types,
  useKnowledge,
  type Meta,
  type Resource,
} from "@/lib/knowledge";
import { Failure, Loading } from "./KnowledgeUI";
import { ResourceContent } from "./KnowledgeDetail";
import styles from "./knowledge.module.css";
function ResourceForm({ initial }: { initial?: Resource }) {
  const router = useRouter(),
    meta = useKnowledge<Meta>("/knowledge/meta");
  const [title, setTitle] = useState(initial?.title ?? ""),
    [description, setDescription] = useState(initial?.description ?? ""),
    [content, setContent] = useState(initial?.content ?? ""),
    [external, setExternal] = useState(initial?.external_url ?? ""),
    [format, setFormat] = useState(initial?.resource_type ?? "article"),
    [difficulty, setDifficulty] = useState(initial?.difficulty ?? "unknown"),
    [technology, setTechnology] = useState(initial?.technology_id ?? ""),
    [tags, setTags] = useState(initial?.tags.join(", ") ?? ""),
    [minutes, setMinutes] = useState(
      initial?.estimated_minutes?.toString() ?? "",
    ),
    [source, setSource] = useState(initial?.source ?? "manual"),
    [attribution, setAttribution] = useState(initial?.attribution ?? ""),
    [skillIds, setSkillIds] = useState(
      initial?.resource_skills.map((link) => link.skill_id) ?? [],
    ),
    [preview, setPreview] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const skills = [...(meta.data?.skills ?? [])];
  for (const link of initial?.resource_skills ?? [])
    if (!skills.some((item) => item.id === link.skill_id))
      skills.push({
        id: link.skill_id,
        name: link.skill?.name ?? "Compétence inactive",
      });
  const technologies = [...(meta.data?.technologies ?? [])];
  if (
    initial?.technology &&
    !technologies.some((item) => item.id === initial.technology!.id)
  )
    technologies.push(initial.technology);
  const values = {
    title: title.trim(),
    description: description.trim(),
    content,
    external_url: external.trim() || null,
    resource_type: format,
    difficulty,
    technology_id: technology || null,
    tags: [
      ...new Set(
        tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      ),
    ],
    estimated_minutes: minutes ? Number(minutes) : null,
    source: source.trim() || "manual",
    attribution: attribution.trim(),
    skill_ids: skillIds,
  };
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await apiRequest<Resource>(
        "/admin/knowledge/resources" + (initial ? "/" + initial.id : ""),
        { method: initial ? "PATCH" : "POST", body: JSON.stringify(values) },
      );
      router.push("/admin/knowledge");
    } catch (error) {
      setError(errorText(error));
      setBusy(false);
    }
  }
  const previewResource = {
    ...initial,
    ...values,
    id: initial?.id ?? "preview",
    status: "draft",
    technology: technologies.find((item) => item.id === technology) ?? null,
    resource_skills: skillIds.map((id) => ({
      skill_id: id,
      skill: skills.find((item) => item.id === id) ?? null,
    })),
  } as Resource;
  return (
    <div className="page-container">
      <header className="page-header">
        <h1 className="page-title">
          {initial ? "Modifier la ressource" : "Nouvelle ressource"}
        </h1>
        <Link className="btn btn-ghost" href="/admin/knowledge">
          Retour aux ressources
        </Link>
      </header>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {meta.error && <Failure message={meta.error} retry={meta.reload} />}
      <form className={"card " + styles.form} onSubmit={submit}>
        <fieldset disabled={busy || !meta.data} className={styles.form}>
          <label>
            Titre
            <input
              className="input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              minLength={2}
              maxLength={200}
              required
            />
          </label>
          <label>
            Description
            <textarea
              className="input"
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={2000}
            />
          </label>
          <div className={styles.columns}>
            <label>
              Format
              <select
                className="input"
                value={format}
                onChange={(event) => setFormat(event.target.value)}
              >
                {Object.entries(types).map(([key, label]) => (
                  <option value={key} key={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Difficulté
              <select
                className="input"
                value={difficulty}
                onChange={(event) => setDifficulty(event.target.value)}
              >
                {Object.entries(difficulties).map(([key, label]) => (
                  <option value={key} key={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Technologie
              <select
                className="input"
                value={technology}
                onChange={(event) => setTechnology(event.target.value)}
              >
                <option value="">Aucune</option>
                {technologies.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Temps estimé (minutes)
              <input
                className="input"
                type="number"
                min={1}
                max={100000}
                value={minutes}
                onChange={(event) => setMinutes(event.target.value)}
                placeholder="Non renseigné"
              />
            </label>
          </div>
          <label>
            Tags séparés par des virgules
            <input
              className="input"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              maxLength={1020}
            />
          </label>
          <label>
            Lien externe
            <input
              className="input"
              type="url"
              value={external}
              onChange={(event) => setExternal(event.target.value)}
              maxLength={2000}
              placeholder="https://"
            />
          </label>
          <label>
            Contenu en texte brut
            <textarea
              className={"input " + styles.contentInput}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              maxLength={80000}
            />
          </label>
          <div className={styles.columns}>
            <label>
              Source
              <input
                className="input"
                value={source}
                onChange={(event) => setSource(event.target.value)}
                maxLength={80}
                readOnly={
                  initial?.source === "coursera" && !!initial.external_source_id
                }
              />
            </label>
            <label>
              Attribution
              <input
                className="input"
                value={attribution}
                onChange={(event) => setAttribution(event.target.value)}
                maxLength={1000}
              />
            </label>
          </div>
          <fieldset>
            <legend className="section-title">Compétences liées</legend>
            {meta.loading ? (
              <Loading />
            ) : !skills.length ? (
              <p className="muted">Aucune compétence disponible.</p>
            ) : (
              <div className={styles.skills}>
                {skills.map((item) => (
                  <label key={item.id}>
                    <input
                      type="checkbox"
                      checked={skillIds.includes(item.id)}
                      onChange={(event) =>
                        setSkillIds((current) =>
                          event.target.checked
                            ? [...current, item.id]
                            : current.filter((id) => id !== item.id),
                        )
                      }
                    />
                    {item.name}
                  </label>
                ))}
              </div>
            )}
          </fieldset>
        </fieldset>
        <div className={styles.actions}>
          <button
            className="btn btn-primary"
            type="submit"
            disabled={busy || !meta.data || title.trim().length < 2}
          >
            {busy
              ? "Enregistrement…"
              : initial
                ? "Enregistrer"
                : "Créer le brouillon"}
          </button>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => setPreview(!preview)}
            aria-expanded={preview}
          >
            {preview ? "Fermer l’aperçu" : "Aperçu"}
          </button>
        </div>
        {preview && (
          <section className={styles.preview}>
            <h2 className="page-title">{title || "Sans titre"}</h2>
            <div className={styles.detail}>
              <ResourceContent resource={previewResource} trackClicks={false} />
            </div>
          </section>
        )}
      </form>
    </div>
  );
}
function ExistingEditor({ id }: { id: string }) {
  const result = useKnowledge<Resource>("/admin/knowledge/resources/" + id);
  if (result.loading)
    return (
      <div className="page-container">
        <Loading />
      </div>
    );
  if (result.error)
    return (
      <div className="page-container">
        <Failure message={result.error} retry={result.reload} />
      </div>
    );
  return <ResourceForm key={result.data!.id} initial={result.data} />;
}
export function KnowledgeEditor({ id }: { id?: string }) {
  return id ? <ExistingEditor id={id} /> : <ResourceForm />;
}

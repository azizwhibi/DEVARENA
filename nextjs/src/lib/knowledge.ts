"use client";
import { useEffect, useState } from "react";
import { apiRequest, ApiError } from "@/lib/api";
export { apiRequest };
export type Reference = { id: string; name: string };
export type Resource = {
  id: string;
  title: string;
  description: string;
  resource_type: string;
  content: string;
  external_url: string | null;
  difficulty: string;
  technology_id: string | null;
  technology: Reference | null;
  tags: string[];
  estimated_minutes: number | null;
  status: "draft" | "published" | "archived";
  source: string;
  external_source_id: string | null;
  attribution: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  resource_skills: { skill_id: string; skill: Reference | null }[];
  bookmarked?: boolean;
  progress?: Progress | null;
  challenges?: {
    id: string;
    title: string;
    difficulty: string;
    skill_id: string;
  }[];
};
export type Progress = {
  resource_id: string;
  state: "started" | "completed";
  percentage: number;
  started_at: string;
  updated_at: string;
  completed_at: string | null;
};
export type Page<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};
export type Recommendation = {
  recommendation_id: string;
  resource: Resource;
  explanation: string;
};
export type Recommendations = {
  batch_id: string;
  method: string;
  items: Recommendation[];
};
export type Meta = {
  skills: (Reference & { technology_id?: string | null })[];
  technologies: Reference[];
};
export const types: Record<string, string> = {
  article: "Article",
  tutorial: "Tutoriel",
  video: "Vidéo",
  documentation: "Documentation",
  course: "Cours",
};
export const difficulties: Record<string, string> = {
  unknown: "Non renseignée",
  beginner: "Débutant",
  intermediate: "Intermédiaire",
  advanced: "Avancé",
};
export const statuses: Record<string, string> = {
  draft: "Brouillon",
  published: "Publié",
  archived: "Archivé",
};
export const feedbackLabels: Record<string, string> = {
  useful: "Utile",
  not_relevant: "Peu pertinent",
  too_easy: "Trop facile",
  too_difficult: "Trop difficile",
};
export function safeExternal(value: string | null | undefined) {
  try {
    const url = new URL(value ?? "");
    return ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}
export function errorText(error: unknown) {
  return error instanceof ApiError && error.problem.errors?.length
    ? error.problem.errors.join(" ")
    : error instanceof Error
      ? error.message
      : "Une erreur est survenue.";
}
export function useKnowledge<T>(path: string) {
  const [version, setVersion] = useState(0);
  const key = path + "#" + version;
  const [state, setState] = useState<{ key: string; data?: T; error?: string }>(
    { key: "" },
  );
  useEffect(() => {
    const controller = new AbortController();
    void apiRequest<T>(path, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setState({ key, data });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setState({ key, error: errorText(error) });
      });
    return () => controller.abort();
  }, [path, key]);
  return {
    data: state.key === key ? state.data : undefined,
    error: state.key === key ? state.error : undefined,
    loading: state.key !== key,
    reload: () => setVersion((value) => value + 1),
  };
}
export function recordClick(resourceId: string, recommendationId?: string) {
  void apiRequest("/me/knowledge/events", {
    method: "POST",
    body: JSON.stringify({
      resource_id: resourceId,
      recommendation_id: recommendationId,
      event_type: "click",
    }),
  }).catch(() => {
    /* Navigation remains available if optional event delivery fails. */
  });
}

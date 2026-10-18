# Project navigation

Use `graphify-out/graph.json` before investigating architecture, dependencies or change impact. Query the existing graph first (`graphify query "<terms>"`, `graphify explain "path::symbol"`, or `graphify affected "<symbol>"`), then verify the cited source files before editing. Expand queries using terms from graph node labels. Do not infer absent edges as proof that no dependency exists.

After source changes, refresh the graph with `graphify update .` and inspect its integrity diagnostics. SQL has manual semantic coverage because `tree_sitter_sql` is unavailable; refresh that coverage when SQL changes. The report records extraction limits and pending live checks. Never index `.env*`, dependencies, generated build output or secrets.

The frontend's `nextjs/AGENTS.md` requires reading the installed Next.js documentation before frontend edits. Engineering specs and the task tracker live one directory above this repository in `SPEC-identity.md`, `CAPABILITY-MAP.md` and `tasks/`.

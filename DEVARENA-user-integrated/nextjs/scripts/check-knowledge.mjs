import assert from "node:assert/strict";
import { registerHooks, createRequire } from "node:module";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
const require = createRequire(import.meta.url);
const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "@/lib/supabase/client")
      return { url: "mock:auth", shortCircuit: true };
    if (specifier === "next/link")
      return { url: "mock:link", shortCircuit: true };
    if (specifier === "next/navigation")
      return { url: "mock:navigation", shortCircuit: true };
    if (specifier === "@/components/skills/WorkspaceIcon")
      return { url: "mock:icon", shortCircuit: true };
    if (specifier.endsWith(".module.css"))
      return { url: "mock:css", shortCircuit: true };
    if (specifier.startsWith("@/"))
      return next(
        new URL(
          "../src/" +
            specifier.slice(2) +
            (specifier.startsWith("@/components/") ? ".tsx" : ".ts"),
          import.meta.url,
        ).href,
        context,
      );
    if (
      specifier.startsWith("./") &&
      context.parentURL?.endsWith(".tsx") &&
      !/\.[a-z]+$/.test(specifier)
    )
      return next(new URL(specifier + ".tsx", context.parentURL).href, context);
    return next(
      specifier,
      context.parentURL?.startsWith("mock:")
        ? { ...context, parentURL: import.meta.url }
        : context,
    );
  },
  load(url, context, next) {
    const mocks = {
      "mock:auth":
        "export function createClient(){return {auth:{getSession:async()=>({data:{session:{access_token:'knowledge-session'}}})}};}",
      "mock:link":
        "import {createElement} from 'react';export default function Link(props){return createElement('a',props);}",
      "mock:navigation":
        "export function usePathname(){return '/knowledge'};export function useSearchParams(){return new URLSearchParams()}",
      "mock:icon":
        "import {createElement} from 'react';export function WorkspaceIcon(){return createElement('svg',{'aria-hidden':true})}",
      "mock:css": "export default {}",
    };
    if (mocks[url])
      return { format: "module", source: mocks[url], shortCircuit: true };
    if (url.endsWith(".tsx"))
      return {
        format: "module",
        source: ts.transpileModule(readFileSync(new URL(url), "utf8"), {
          compilerOptions: {
            jsx: ts.JsxEmit.ReactJSX,
            module: ts.ModuleKind.ESNext,
          },
        }).outputText,
        shortCircuit: true,
      };
    return next(url, context);
  },
});
const originalFetch = globalThis.fetch,
  originalApi = process.env.NEXT_PUBLIC_API_URL;
try {
  const { safeExternal, apiRequest } = await import("../src/lib/knowledge.ts");
  assert.equal(safeExternal("javascript:alert(1)"), null);
  assert.equal(safeExternal("https://user:pass@example.com"), null);
  assert.equal(
    safeExternal("https://example.com/course"),
    "https://example.com/course",
  );
  const { ResourceContent } =
    await import("../src/components/knowledge/KnowledgeDetail.tsx");
  const resource = {
    id: "resource-a",
    title: "Safe text",
    description: "<img src=x onerror=alert(1)>",
    content: "<script>alert(1)</script>",
    external_url: "javascript:alert(1)",
    resource_type: "article",
    difficulty: "unknown",
    tags: [],
    estimated_minutes: null,
    technology: null,
    source: "manual",
    attribution: "",
    status: "published",
  };
  const html = renderToStaticMarkup(
    createElement(ResourceContent, { resource, trackClicks: false }),
  );
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(html.includes("&lt;img"));
  assert.ok(!html.includes("<script>"));
  assert.ok(!html.includes('href="javascript'));
  assert.ok(html.includes("Level not specified"));
  assert.ok(!html.includes("null min"));
  const linked = renderToStaticMarkup(
    createElement(ResourceContent, {
      resource: { ...resource, external_url: "https://example.com/course" },
      trackClicks: false,
    }),
  );
  assert.ok(linked.includes('rel="noopener noreferrer"'));
  process.env.NEXT_PUBLIC_API_URL = "https://api.example.invalid";
  globalThis.fetch = async (url, init) => {
    assert.equal(
      new Headers(init.headers).get("Authorization"),
      "Bearer knowledge-session",
    );
    assert.equal(init.cache, "no-store");
    assert.equal(new URL(url).pathname, "/me/knowledge/progress/resource-a");
    assert.deepEqual(JSON.parse(init.body), { percentage: 100 });
    return Response.json({ state: "completed", percentage: 100 });
  };
  assert.equal(
    (
      await apiRequest("/me/knowledge/progress/resource-a", {
        method: "PATCH",
        body: JSON.stringify({ percentage: 100 }),
      })
    ).state,
    "completed",
  );
  const origin = "https://app.test",
    context = vm.createContext({ URL, self: undefined });
  vm.runInContext(readFileSync("public/sw.js", "utf8"), context);
  for (const path of [
    "/knowledge/resources",
    "/me/knowledge/progress",
    "/me/knowledge/recommendations",
    "/admin/knowledge/resources",
  ])
    assert.equal(
      context.classify(
        { url: origin + path, method: "GET", mode: "cors" },
        origin,
      ),
      null,
    );
  assert.equal(
    context.classify(
      { url: origin + "/knowledge", method: "GET", mode: "navigate" },
      origin,
    ),
    "navigate",
  );
  const {
    metrics,
    evaluate,
  } = require("../../backend/scripts/evaluate-knowledge.cjs");
  assert.equal(metrics(["a"], { a: 2 }).ndcgAt5, 1);
  assert.throws(() => metrics(["a"], {}), /Missing human judgment/);
  assert.equal(
    evaluate({
      version: 1,
      cases: [
        {
          case_id: "evaluation-only-fixture",
          baseline: ["a"],
          judgments: { a: 2 },
        },
      ],
    }).semanticCases,
    0,
  );
  console.log(
    "PASS: Knowledge rendering, safe links, session API use, private PWA policy and offline evaluation checks. Synthetic evaluation fixture never writes user metrics.",
  );
} finally {
  hooks.deregister();
  globalThis.fetch = originalFetch;
  if (originalApi === undefined) delete process.env.NEXT_PUBLIC_API_URL;
  else process.env.NEXT_PUBLIC_API_URL = originalApi;
}

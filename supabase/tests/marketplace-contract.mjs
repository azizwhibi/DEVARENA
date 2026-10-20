// Compares marketplace paths in api.http.ts with the Nest controllers.
// Reads the working tree, then the other feature branch when a file is absent.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

function read(path, branch) {
  const full = resolve(root, path);
  if (existsSync(full)) return readFileSync(full, 'utf8');
  return execFileSync('git', ['show', `${branch}:${path}`], { cwd: root, encoding: 'utf8' });
}

function nestRoutes(source) {
  const controller = source.match(/@Controller\('([^']+)'\)/);
  if (!controller) throw new Error('Controller path missing');
  const routes = [];
  const pattern = /@(Get|Post|Patch|Put|Delete)\('([^']*)'\)/g;
  for (const match of source.matchAll(pattern)) {
    const method = match[1].toUpperCase();
    const suffix = match[2] ? `/${match[2]}` : '';
    routes.push(`${method} /${controller[1]}${suffix}`);
  }
  return routes;
}

function readBalanced(source, openIndex) {
  let depth = 1;
  let quote = '';
  let i = openIndex;
  while (i < source.length && depth > 0) {
    const ch = source[i];
    if (quote) {
      if (ch === '\\') i += 2;
      else {
        if (ch === quote) quote = '';
        i += 1;
      }
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') quote = ch;
    else if (ch === '(') depth += 1;
    else if (ch === ')') depth -= 1;
    i += 1;
  }
  return source.slice(openIndex, i - 1);
}

function httpRoutes(source) {
  const routes = [];
  const pattern = /(?<!function )call(?:<[^>]+>)?\(/g;
  for (const match of source.matchAll(pattern)) {
    const args = readBalanced(source, match.index + match[0].length);
    const pathMatch = args.match(/^\s*(['"`])([^'"`]+)\1/);
    if (!pathMatch) throw new Error(`Unparsed marketplace call: ${args.slice(0, 80)}`);
    let path = pathMatch[2].replace(/\$\{[^}]+\}/g, ':id');
    if (!path.startsWith('/')) path = `/${path}`;
    const tail = args.slice(pathMatch[0].length);
    const method = tail.match(/json\(\s*'([A-Z]+)'/)?.[1]
      ?? tail.match(/method:\s*'([A-Z]+)'/)?.[1]
      ?? 'GET';
    routes.push(`${method} ${path}`);
  }
  return routes;
}

function unique(routes, label) {
  const seen = new Set();
  for (const route of routes) {
    if (seen.has(route)) throw new Error(`${label} declares ${route} twice`);
    seen.add(route);
  }
  return [...seen].sort();
}

const http = unique(
  httpRoutes(read('nextjs/src/lib/marketplace/api.http.ts', 'feature/marketplace-ui')),
  'api.http.ts',
);
const nest = unique(
  [
    ...nestRoutes(read('backend/src/marketplace/marketplace.controller.ts', 'feature/marketplace-backend')),
    ...nestRoutes(read('backend/src/marketplace/admin-marketplace.controller.ts', 'feature/marketplace-backend')),
  ],
  'Nest controllers',
);

const missingFromNest = http.filter((route) => !nest.includes(route));
const missingFromHttp = nest.filter((route) => !http.includes(route));
if (missingFromNest.length || missingFromHttp.length) {
  throw new Error(
    `Marketplace routes differ.\nOnly in api.http.ts: ${missingFromNest.join(', ') || 'none'}\nOnly in Nest: ${missingFromHttp.join(', ') || 'none'}`,
  );
}

console.log('Marketplace contract');
for (const route of http) console.log(route);
console.log(`${http.length} routes match`);

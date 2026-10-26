import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { registerHooks } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.endsWith('.module.css')) return { url: 'rankings-test:styles', shortCircuit: true };
    if (specifier === 'next/image') return { url: 'mock:image', shortCircuit: true };
    if (specifier === 'next/link') return { url: 'mock:link', shortCircuit: true };
    if (specifier.startsWith('@/')) {
      const base = new URL(`../src/${specifier.slice(2)}`, import.meta.url);
      return nextResolve(base.href + (existsSync(base.pathname.slice(1) + '.tsx') ? '.tsx' : '.ts'), context);
    }
    return nextResolve(
      specifier,
      context.parentURL?.startsWith('mock:') || context.parentURL?.startsWith('rankings-test:')
        ? { ...context, parentURL: import.meta.url }
        : context,
    );
  },
  load(url, context, nextLoad) {
    if (url === 'rankings-test:styles') return { format: 'module', source: 'export default new Proxy({}, {get: (_, key) => key});', shortCircuit: true };
    if (url === 'mock:image') return { format: 'module', source: "import {createElement} from 'react'; export default function Image(props){ return createElement('img', props); }", shortCircuit: true };
    if (url === 'mock:link') return { format: 'module', source: "import {createElement} from 'react'; export default function Link(props){ return createElement('a', props); }", shortCircuit: true };
    if (url.endsWith('.tsx')) return {
      format: 'module', shortCircuit: true,
      source: ts.transpileModule(readFileSync(new URL(url), 'utf8'), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext } }).outputText,
    };
    return nextLoad(url, context);
  },
});

const { buildRankingsQuery, parseRankPromotion } = await import('../src/lib/rankings.ts');
const { RankingsTable, MyStanding } = await import('../src/components/rankings/RankingsBoard.tsx');
assert.equal(buildRankingsQuery({ scope: 'global', page: 1, pageSize: 20 }), '/rankings?scope=global&page=1&pageSize=20');
const query = new URL(buildRankingsQuery({ scope: 'institution', value: '42 & Paris', search: 'a+b', page: 2, pageSize: 20 }), 'https://example.test');
assert.equal(query.searchParams.get('value'), '42 & Paris');
assert.equal(query.searchParams.get('search'), 'a+b');
assert.equal(query.searchParams.get('page'), '2');
assert.equal(new URL(buildRankingsQuery({ scope: 'country', value: '', page: 1, pageSize: 20 }), 'https://example.test').searchParams.has('value'), false);
assert.equal(parseRankPromotion({ tier: 'Gold', credits_awarded: 500, new_balance: 850 }).tier, 'Gold');
for (const invalid of [null, {}, { tier: 'Fake', credits_awarded: 500, new_balance: 850 }, { tier: 'Gold', credits_awarded: -1, new_balance: 850 }, { tier: 'Gold', credits_awarded: 1, new_balance: NaN }]) assert.equal(parseRankPromotion(invalid), null);

const render = (component, props) => renderToStaticMarkup(React.createElement(component, props));
assert.match(render(RankingsTable, { items: [], loading: true }), /role="status"/);
assert.match(render(RankingsTable, { items: [], error: 'Unable to load rankings.', onRetry() {} }), /role="alert"/);
assert.match(render(RankingsTable, { items: [] }), /No developers found/);
const item = { userId: 'one', rank: 1, username: '<alice>', institution: '42 Paris', country: 'FR', avatarUrl: null, devScore: 61.5, tier: 'Gold', division: 'II', competitivePoints: 1650, duelRating: 1210, wins: 7, matchesPlayed: 10, winRate: 70 };
const table = render(RankingsTable, { items: [item] });
for (const text of ['&lt;alice&gt;', '42 Paris', 'Gold', 'II', '1,650', '61.5', '70%', '7 / 10']) assert.ok(table.includes(text), `Missing ${text}`);
assert.ok(!table.includes('<alice>'));
const standing = render(MyStanding, { me: { ...item, eligible: true, pointsToNextTier: 150, nextTier: 'Platinum', nextTierReward: 1000, tierProgress: 50 } });
for (const text of ['My Standing', '150', 'Platinum', '1,000', 'progressbar', 'aria-valuenow="50"']) assert.ok(standing.includes(text), `Missing standing ${text}`);
assert.match(render(MyStanding, { me: { ...item, rank: null, eligible: false, nextTier: null, nextTierReward: 0, tierProgress: 100, pointsToNextTier: 0 } }), /Private standing/);
console.log('Competitive rankings query, promotion validation and UI scenarios passed.');

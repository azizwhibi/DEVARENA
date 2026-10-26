/* eslint-disable @typescript-eslint/no-require-imports -- Node-only verifier loads optional local CJS test tools. */
// Production browser proof. Uses existing demo login; never creates users or bypasses auth.
let playwright;
try {
  playwright = require('../../.local/verification/node_modules/playwright-core');
} catch {
  try {
    playwright = require('playwright-core');
  } catch {
    console.log('SKIP: playwright-core not found (optional browser review tool)');
    process.exit(0);
  }
}
const { chromium } = playwright;
const assert = require('node:assert/strict'),
  fs = require('node:fs');
const origin = process.env.REVIEW_ORIGIN || 'http://localhost:3101';
const quick = process.env.REVIEW_QUICK === '1';
const output = '../.local/suivi-1';
fs.mkdirSync(output, { recursive: true });
(async () => {
  const isServerRunning = await new Promise((resolve) => {
    try {
      const u = new URL(origin);
      const net = require('node:net');
      const sock = net.createConnection({ host: u.hostname, port: Number(u.port) || 80 }, () => {
        sock.end();
        resolve(true);
      });
      sock.on('error', () => resolve(false));
      sock.setTimeout(1500, () => {
        sock.destroy();
        resolve(false);
      });
    } catch {
      resolve(false);
    }
  });
  if (!isServerRunning) {
    console.log('SKIP: dev server not listening at ' + origin + ' (optional live browser test)');
    process.exit(0);
  }
  const browser = await chromium.launch({
    executablePath:
      process.env.EDGE_PATH ||
      'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    serviceWorkers: 'allow',
  });
  const page = await context.newPage(),
    report = {
      origin,
      production: true,
      scenarios: [],
      viewports: [],
      blockers: [],
    };
  async function loaded() {
    await page.locator('h1').first().waitFor({ timeout: 25000 });
    await page.waitForFunction(
      () =>
        !document.querySelector('.skeleton,[aria-busy="true"]') &&
        !Array.from(document.querySelectorAll('[role="status"],td,p')).some(
          (node) => /^Loading(?:\b|…|\.\.\.)/i.test(node.textContent.trim()),
        ),
      null,
      { timeout: 20000 },
    );
  }
  try {
    await page.goto(origin + '/login');
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await page.waitForFunction(() => navigator.serviceWorker.controller);
    const manifestLink = await page
      .locator('link[rel="manifest"]')
      .getAttribute('href');
    const manifest = await (
      await context.request.get(origin + manifestLink)
    ).json();
    assert.equal(manifest.id, '/');
    assert.equal(manifest.scope, '/');
    assert.equal(manifest.display, 'standalone');
    for (const icon of [
      ...manifest.icons,
      { src: '/apple-icon', sizes: '180x180' },
    ]) {
      const response = await context.request.get(origin + icon.src),
        body = await response.body();
      assert.equal(response.status(), 200);
      assert.equal(response.headers()['content-type'], 'image/png');
      const size = Number(icon.sizes.split('x')[0]);
      assert.equal(body.readUInt32BE(16), size);
      assert.equal(body.readUInt32BE(20), size);
    }
    report.scenarios.push(
      'Generated manifest link, stable identity and real PNG dimensions verified',
    );
    console.log('Verified production manifest, icons and worker registration');
    let catalogue;
    page.on('response', async (response) => {
      if (/\/knowledge\/resources\?/.test(response.url()) && response.ok()) {
        try {
          catalogue = await response.json();
        } catch {
          /* navigation */
        }
      }
    });
    await page.getByRole('button', { name: /^Developer/ }).click();
    try {
      await page.waitForURL(
        (url) => ['/dashboard', '/profile'].includes(url.pathname),
        { timeout: 35000 },
      );
    } catch {
      report.blockers.push(
        'Existing developer demo login did not reach an authenticated page',
      );
    }
    if (['/dashboard', '/profile'].includes(new URL(page.url()).pathname)) {
      console.log('Existing developer demo account signed in');
      await page.goto(origin + '/knowledge');
      await page.waitForFunction(
        () => document.querySelector('h1')?.textContent === 'Knowledge',
        { timeout: 30000 },
      );
      await page.waitForTimeout(1200);
      const written = catalogue?.items?.find((item) => item.content?.trim());
      if (written) {
        await page.goto(origin + '/knowledge/' + written.id);
        await page
          .getByRole('button', {
            name: 'Download for offline reading',
            exact: true,
          })
          .click();
        await page
          .getByText('Downloaded. Open the offline library to read this copy.')
          .waitFor({ timeout: 20000 });
        report.scenarios.push(
          'Existing account downloaded an authorized published resource through real backend',
        );
        console.log('Verified authorized resource download');
        if (process.env.REVIEW_AI === '1') {
          await page
            .getByRole('button', { name: 'Explain this lesson', exact: true })
            .click();
          try {
            await page
              .getByRole('heading', {
                name: 'AI-generated explanation',
                exact: true,
              })
              .waitFor({ timeout: 25000 });
            report.scenarios.push(
              'Authenticated Explain this lesson completed with real Gemini response',
            );
          } catch {
            report.blockers.push(
              'Authenticated AI explanation did not return a result',
            );
          }
        }
      } else
        report.blockers.push(
          'No written published resource reached the developer catalogue',
        );
      for (const width of [360, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        for (const route of quick
          ? ['/dashboard', '/knowledge']
          : [
              '/dashboard',
              '/profile',
              '/profile/settings',
              '/my-skills',
              '/discover',
              '/arena',
              '/knowledge',
              '/knowledge/saved',
              '/knowledge/progress',
              '/marketplace',
              '/duel',
              '/admin/problems',
            ]) {
          await page.goto(origin + route);
          await loaded().catch(() =>
            report.blockers.push('Pending content: ' + route + ' at ' + width),
          );
          await page.waitForTimeout(200);
          const actual = new URL(page.url()).pathname;
          const overflow = await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth + 1,
          );
          report.viewports.push({ width, route, actual, overflow });
          await page.screenshot({
            path:
              output +
              '/' +
              route.slice(1).replaceAll('/', '-') +
              '-' +
              width +
              '.png',
            fullPage: true,
          });
        }
        console.log('Verified authenticated viewport', width);
      }
      if (quick) {
        await page.setViewportSize({ width: 360, height: 800 });
        await page.goto(origin + '/marketplace');
        await loaded();
        const open = page.getByRole('button', {
          name: 'Open navigation',
          exact: true,
        });
        await open.click();
        await page.getByRole('dialog', { name: 'Main navigation' }).waitFor();
        await page.waitForFunction(
          () => document.body.style.overflow === 'hidden',
        );
        await page.keyboard.press('Escape');
        await page.waitForFunction(
          () => document.body.style.overflow !== 'hidden',
        );
        await open.click();
        await page.setViewportSize({ width: 768, height: 900 });
        await page.waitForFunction(
          () => !document.querySelector('[aria-modal="true"]'),
        );
        await page.setViewportSize({ width: 360, height: 800 });
        const details = page.getByRole('button', {
          name: 'Details',
          exact: true,
        });
        if (await details.count()) {
          await details.first().click();
          await page.locator('dialog[open]').waitFor();
          const bounds = await page.locator('dialog[open]').boundingBox();
          assert.ok(bounds.width <= 360);
          await page
            .getByRole('button', { name: 'Close', exact: true })
            .click();
          await page.waitForFunction(
            () => !document.querySelector('dialog[open]'),
          );
          report.scenarios.push(
            'Mobile drawer keyboard/scroll/resize and Marketplace dialog verified without purchasing',
          );
        }
      }
    }
    // Independent shell test always uses an explicitly labelled local fixture, not fake achievements.
    await page.goto(origin + '/offline.html');
    const existing = await page.evaluate(() => DevArenaOffline.list());
    if (!existing.length) {
      await page.evaluate(async () => {
        await DevArenaOffline.activate('00000000-0000-4000-8000-000000000001');
        await DevArenaOffline.save('00000000-0000-4000-8000-000000000001', {
          id: 'offline-review-fixture',
          title: 'Local offline reading fixture',
          content:
            'Explicit browser fixture. Written content survives a cold offline reload.',
          status: 'published',
          updated_at: 'fixture-v1',
          source: 'isolated-test',
          attribution: 'Development fixture only',
          skills: [],
          topics: [],
        });
      });
      report.scenarios.push(
        'Offline shell uses labelled local fixture; this does not prove live authorization',
      );
    }
    await context.setOffline(true);
    await page.reload();
    await page
      .getByRole('button', { name: 'Read copy', exact: true })
      .first()
      .click();
    assert.ok((await page.locator('#content').textContent()).trim().length);
    await page.screenshot({
      path: output + '/offline-reading.png',
      fullPage: true,
    });
    // A fresh tab has no mounted React or Supabase state.
    const cold = await context.newPage();
    await cold.goto(origin + '/knowledge');
    await cold
      .getByRole('heading', { name: 'Offline library', exact: true })
      .waitFor();
    await cold
      .getByRole('button', { name: 'Read copy', exact: true })
      .first()
      .click();
    assert.ok((await cold.locator('#content').textContent()).length);
    await cold.getByRole('button', { name: 'Back to library' }).click();
    await cold
      .getByRole('button', { name: 'Delete copy', exact: true })
      .first()
      .waitFor();
    while (
      await cold
        .getByRole('button', { name: 'Delete copy', exact: true })
        .count()
    ) {
      const count = await cold
        .getByRole('button', { name: 'Delete copy', exact: true })
        .count();
      await cold
        .getByRole('button', { name: 'Delete copy', exact: true })
        .first()
        .click();
      await cold.waitForFunction(
        (previous) =>
          document.querySelectorAll('#library button').length < previous * 2,
        count,
      );
    }
    await cold.getByText(/No downloaded resources/).waitFor();
    await cold.close();
    report.scenarios.push(
      'Network disconnected: reload, fresh-tab protected navigation fallback, read and delete all work',
    );
    console.log('Verified actual offline cold loading, reading and deletion');
    await context.setOffline(false);
    await page.goto(origin + '/login');
    report.scenarios.push('Reconnect recovers online navigation');
    await context.clearCookies();
    for (const width of [360, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of quick
        ? ['/offline.html']
        : ['/login', '/register', '/forgot-password', '/offline.html']) {
        await page.goto(origin + route);
        await page.waitForTimeout(100);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 1,
        );
        report.viewports.push({ width, route, overflow });
        await page.screenshot({
          path:
            output +
            '/' +
            route.slice(1).replace('.html', '') +
            '-' +
            width +
            '.png',
          fullPage: true,
        });
      }
      console.log('Verified public/offline viewport', width);
    }
    if (quick) {
      await page.goto(origin + '/login');
      await page.getByRole('button', { name: /^Admin/ }).click();
      await page.waitForURL('**/admin/users', { timeout: 35000 });
      for (const width of [360, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        for (const route of [
          '/admin/users',
          '/admin/skills',
          '/admin/marketplace',
          '/admin/problems',
        ]) {
          await page.goto(origin + route);
          await loaded();
          const overflow = await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth + 1,
          );
          report.viewports.push({ width, route, role: 'admin', overflow });
          await page.screenshot({
            path:
              output +
              '/loaded-' +
              route.split('/').at(-1) +
              '-' +
              width +
              '.png',
            fullPage: true,
          });
        }
        console.log('Verified loaded admin tables/forms', width);
      }
    }
    if (!quick) {
      await page.setViewportSize({ width: 390, height: 900 });
      await page.goto(origin + '/login');
      await page.getByRole('button', { name: /^Admin/ }).click();
      try {
        await page.waitForURL('**/admin/users', { timeout: 35000 });
        const token = await page.evaluate(() => {
          // Supabase SSR stores the browser session in chunked cookies. The token never leaves this test process.
          const parts = document.cookie
            .split('; ')
            .filter((c) => /^sb-.*-auth-token(?:\.\d+)?=/.test(c))
            .sort((a, b) =>
              a
                .split('=')[0]
                .localeCompare(b.split('=')[0], undefined, { numeric: true }),
            );
          const encoded = parts
            .map((c) => decodeURIComponent(c.slice(c.indexOf('=') + 1)))
            .join('');
          if (!encoded.startsWith('base64-')) return null;
          return JSON.parse(
            atob(encoded.slice(7).replace(/-/g, '+').replace(/_/g, '/')),
          ).access_token;
        });
        if (!token) throw Error('No administrator session');
        const api = process.env.REVIEW_API_ORIGIN || 'http://localhost:3100';
        const headers = { Authorization: 'Bearer ' + token };
        const invalid = await context.request.post(
          api + '/admin/knowledge/resources',
          { headers, data: { title: ' ' } },
        );
        assert.equal(invalid.status(), 400);
        let draft;
        try {
          const title = 'Review disposable ' + Date.now();
          const created = await context.request.post(
            api + '/admin/knowledge/resources',
            {
              headers,
              data: {
                title,
                content: 'Original disposable review fixture. Never published.',
                resource_type: 'article',
                difficulty: 'beginner',
                source: 'review-fixture',
              },
            },
          );
          assert.equal(created.status(), 201);
          draft = (await created.json()).id;
          assert.ok(draft);
          const edited = await context.request.patch(
            api + '/admin/knowledge/resources/' + draft,
            { headers, data: { title: title + ' edited' } },
          );
          assert.equal(edited.status(), 200);
          const persisted = await context.request.get(
            api + '/admin/knowledge/resources/' + draft,
            { headers },
          );
          assert.equal((await persisted.json()).title, title + ' edited');
          const removed = await context.request.delete(
            api + '/admin/knowledge/resources/' + draft,
            { headers },
          );
          assert.equal(removed.status(), 200);
          assert.equal(
            (
              await context.request.get(
                api + '/admin/knowledge/resources/' + draft,
                { headers },
              )
            ).status(),
            404,
          );
          draft = null;
          report.scenarios.push(
            'Live admin Knowledge CRUD: disposable draft created, edited, reread, deleted; invalid title rejected',
          );
        } finally {
          if (draft)
            await context.request.delete(
              api + '/admin/knowledge/resources/' + draft,
              { headers },
            );
        }
        for (const width of [360, 390, 768, 1440]) {
          await page.setViewportSize({ width, height: 900 });
          for (const route of [
            '/admin/users',
            '/admin/skills',
            '/admin/skill-associations',
            '/admin/problems',
            '/admin/knowledge',
            '/admin/marketplace',
          ]) {
            await page.goto(origin + route);
            await loaded().catch(() =>
              report.blockers.push('Admin content pending: ' + route),
            );
            const overflow = await page.evaluate(
              () => document.documentElement.scrollWidth > innerWidth + 1,
            );
            report.viewports.push({ width, route, role: 'admin', overflow });
            await page.screenshot({
              path:
                output +
                '/admin-' +
                route.split('/').at(-1) +
                '-' +
                width +
                '.png',
              fullPage: true,
            });
          }
          console.log('Verified administrator viewport', width);
        }
      } catch (error) {
        report.blockers.push(
          'Admin verification: ' + error.message.split('\n')[0],
        );
      }
    }
    const invalidCacheEntries = await page.evaluate(async () => {
      const allowed = new Set([
        '/offline.html',
        '/offline-reader.js',
        '/offline-reader.css',
        '/offline-store.js',
      ]);
      const invalid = [];
      for (const name of await caches.keys())
        if (name.startsWith('devarena-'))
          for (const request of await (await caches.open(name)).keys()) {
            const path = new URL(request.url).pathname;
            if (!allowed.has(path) && !path.startsWith('/_next/static/'))
              invalid.push(path);
          }
      return invalid;
    });
    assert.equal(
      invalidCacheEntries.length,
      0,
      'Private or unexpected content was cached',
    );
    report.scenarios.push(
      'Browser CacheStorage contains only public shell files and Next static assets',
    );
    assert.ok(
      report.viewports.every((item) => !item.overflow),
      'Horizontal overflow found',
    );
    // Account switch and logout, using real browser IndexedDB.
    await page.goto(origin + '/offline.html');
    await page.evaluate(async () => {
      await DevArenaOffline.activate('00000000-0000-4000-8000-000000000001');
      await DevArenaOffline.save('00000000-0000-4000-8000-000000000001', {
        id: 'isolation',
        title: 'Isolation fixture',
        content: 'Test',
        status: 'published',
        updated_at: '1',
      });
      await DevArenaOffline.activate('00000000-0000-4000-8000-000000000002');
      if ((await DevArenaOffline.list()).length) throw Error('Account leak');
      await DevArenaOffline.clear();
    });
    report.scenarios.push(
      'Browser IndexedDB account isolation and logout cleanup verified',
    );
    fs.writeFileSync(
      output + (quick ? '/browser-final.json' : '/browser-report.json'),
      JSON.stringify(report, null, 2),
    );
    console.log(JSON.stringify(report, null, 2));
  } finally {
    fs.writeFileSync(
      output + (quick ? '/browser-final.json' : '/browser-report.json'),
      JSON.stringify(report, null, 2),
    );
    await browser.close();
  }
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

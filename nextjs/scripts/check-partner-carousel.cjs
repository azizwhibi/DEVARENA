/* eslint-disable @typescript-eslint/no-require-imports -- Optional Node-only browser check. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const {
  chromium,
} = require('../../.local/verification/node_modules/playwright-core');
const origin = process.env.PARTNER_TEST_URL || 'http://localhost:3101';
const output = path.resolve(__dirname, '../../.local/partner-carousel');

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({
    executablePath:
      process.env.EDGE_PATH ||
      'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true,
  });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (
        message.type() === 'error' &&
        /hydrat|server rendered/i.test(message.text())
      )
        errors.push(message.text());
    });
    const response = await page.goto(origin);
    assert.equal(response.status(), 200);
    assert.match(
      await response.text(),
      /Our learning ecosystem/,
      'Server-rendered heading',
    );
    const section = page.getByRole('region', {
      name: 'Our learning ecosystem',
    });
    const viewport = section.locator('header + div');
    const track = viewport.locator(':scope > div');
    const originals = section.getByRole('link');
    const names = ['Coursera', 'edX', 'Udemy', 'Codecademy', 'Udacity'];
    await section.scrollIntoViewIfNeeded();
    await section
      .locator('img')
      .evaluateAll((images) =>
        Promise.all(images.map((image) => image.decode())),
      );
    assert.equal(
      await originals.count(),
      5,
      'Each platform appears once to assistive technology',
    );
    assert.equal(
      await section.getByRole('button').count(),
      0,
      'No carousel controls',
    );
    assert.equal(
      await section.locator('svg, h3').count(),
      0,
      'No icons or platform captions',
    );
    assert.equal(
      (await section.innerText()).replace(/\s+/g, ' ').trim(),
      "Our learning ecosystem Platforms we're exploring for future learning resources.",
    );
    for (let i = 0; i < names.length; i++) {
      assert.equal(
        await originals.nth(i).locator('img').getAttribute('alt'),
        names[i],
      );
      assert.equal(await originals.nth(i).getAttribute('target'), '_blank');
      assert.equal(
        await originals.nth(i).getAttribute('rel'),
        'noopener noreferrer',
      );
      const imagePath = await originals
        .nth(i)
        .locator('img')
        .getAttribute('src');
      assert.match(imagePath, /\.png(?:&|$|\?)/, 'PNG logos only');
      const clearPixels = await originals
        .nth(i)
        .locator('img')
        .evaluate((image) => {
          const canvas = document.createElement('canvas');
          canvas.width = image.naturalWidth;
          canvas.height = image.naturalHeight;
          const context = canvas.getContext('2d');
          context.drawImage(image, 0, 0);
          const pixels = context.getImageData(
            0,
            0,
            canvas.width,
            canvas.height,
          ).data;
          let clear = 0;
          for (let pixel = 3; pixel < pixels.length; pixel += 4)
            if (pixels[pixel] === 0) clear++;
          return clear / (canvas.width * canvas.height);
        });
      assert.ok(
        clearPixels > 0.1,
        names[i] + ' is transparent after Next.js image optimization',
      );
    }
    for (const name of [
      'coursera',
      'edx-white',
      'udemy',
      'codecademy-transparent',
      'udacity',
    ]) {
      const file = path.resolve(
        __dirname,
        '../public/images/partners/' + name + '.png',
      );
      const metadata = await sharp(file).metadata();
      const stats = await sharp(file).stats();
      assert.ok(
        metadata.hasAlpha &&
          stats.channels[3].min === 0 &&
          stats.channels[3].max === 255,
        name + ' has real transparency',
      );
    }
    for (const width of [320, 390, 768, 1440, 2560, 5120]) {
      await page.setViewportSize({ width, height: 1000 });
      await section.scrollIntoViewIfNeeded();
      await page.mouse.move(0, 0);
      await page.waitForTimeout(120);
      const metrics = await track.evaluate((node) => {
        const groups = [...node.children].map((group) =>
          group.getBoundingClientRect(),
        );
        const firstLogo = node.querySelector('img');
        return {
          overflow: document.documentElement.scrollWidth > innerWidth,
          left: node.parentElement.getBoundingClientRect().left,
          viewport: node.parentElement.clientWidth,
          screen: document.documentElement.clientWidth,
          halves: groups.map((rect) => rect.width),
          joinGap: groups[1].left - groups[0].right,
          height: firstLogo.getBoundingClientRect().height,
          filter: getComputedStyle(firstLogo).filter,
          gap: parseFloat(
            getComputedStyle(node.firstElementChild.firstElementChild).gap,
          ),
          background: getComputedStyle(firstLogo.parentElement).backgroundColor,
          duplicatesFocusable: [
            ...node.querySelectorAll('[aria-hidden="true"] a'),
          ].some((link) => link.tabIndex !== -1),
        };
      });
      if (metrics.overflow) {
        await page.screenshot({
          path: path.join(output, 'overflow-' + width + '.png'),
          fullPage: true,
        });
        console.log(
          metrics,
          await page.evaluate(() =>
            [
              ...document.querySelectorAll('body > *, header, main, section'),
            ].map((node) => ({
              tag: node.tagName,
              className: node.className,
              width: node.getBoundingClientRect().width,
              scroll: node.scrollWidth,
            })),
          ),
        );
      }
      assert.equal(metrics.overflow, false, 'No page overflow at ' + width);
      assert.equal(metrics.left, 0, 'Full bleed at ' + width);
      assert.equal(metrics.viewport, metrics.screen);
      assert.ok(
        metrics.halves[0] >= metrics.viewport,
        'Each track half fills ultrawide viewport',
      );
      assert.ok(Math.abs(metrics.halves[0] - metrics.halves[1]) < 1);
      assert.ok(
        Math.abs(metrics.joinGap) < 1,
        'No gap between identical halves',
      );
      assert.equal(metrics.height, width < 640 ? 32 : width < 1024 ? 40 : 56);
      assert.equal(metrics.gap, width < 1024 ? 48 : 80);
      assert.equal(metrics.filter, 'brightness(0) invert(1)');
      assert.equal(metrics.background, 'rgba(0, 0, 0, 0)');
      assert.equal(metrics.duplicatesFocusable, false);
      const motion = await track.evaluate((node) => {
        const animation = node.getAnimations()[0];
        animation.pause();
        const translate = () =>
          new DOMMatrixReadOnly(getComputedStyle(node).transform).m41;
        animation.currentTime = 1000;
        const first = translate();
        animation.currentTime = 2000;
        const second = translate();
        const timing = animation.effect.getTiming();
        animation.currentTime = Number(timing.duration);
        const end = translate();
        const half = node.firstElementChild.getBoundingClientRect().width;
        animation.play();
        return {
          distance: first - second,
          duration: timing.duration,
          easing: timing.easing,
          end,
          half,
        };
      });
      assert.ok(
        Math.abs(motion.distance - 40) < 1,
        'Consistent 40px/s at ' + width,
      );
      assert.equal(motion.easing, 'linear');
      // At a full cycle CSS restarts at the identical first frame.
      assert.ok(Math.abs(motion.end) < 1);
      if ([390, 1440, 5120].includes(width))
        await section.screenshot({
          path: path.join(output, 'marquee-' + width + '.png'),
        });
    }
    await page.setViewportSize({ width: 390, height: 1000 });
    await viewport.hover();
    assert.equal(
      await track.evaluate((node) => getComputedStyle(node).animationPlayState),
      'paused',
    );
    await page.mouse.move(0, 0);
    assert.equal(
      await track.evaluate((node) => getComputedStyle(node).animationPlayState),
      'running',
    );
    for (const link of await originals.all()) {
      await link.focus();
      const visible = await link.evaluate((node) => {
        const rect = node.getBoundingClientRect();
        return (
          rect.left >= 0 &&
          rect.right <= innerWidth &&
          getComputedStyle(node).outlineStyle !== 'none'
        );
      });
      assert.ok(
        visible,
        'Keyboard focus reveals original links with a focus ring',
      );
    }
    await originals.last().blur();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(120);
    assert.equal(
      await track.evaluate((node) => getComputedStyle(node).animationName),
      'none',
    );
    assert.equal(
      await section.locator('a:visible').count(),
      5,
      'Reduced motion shows originals without duplicate logos',
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await section.screenshot({
      path: path.join(output, 'marquee-reduced-motion.png'),
    });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await track.evaluate((node) =>
      node.style.setProperty('--marquee-direction', 'reverse'),
    );
    assert.equal(
      await track.evaluate((node) => getComputedStyle(node).animationDirection),
      'reverse',
    );
    await page.reload();
    await page
      .getByRole('region', { name: 'Our learning ecosystem' })
      .waitFor();
    await page.waitForTimeout(150);
    assert.deepEqual(errors, [], 'No runtime or hydration errors');
    console.log(
      'PASS: production hydration; transparent PNGs; full-bleed 320-5120px; identical filled halves; constant speed and seamless cycle; hover pause; keyboard/duplicate accessibility; reverse direction; reduced motion; no controls, cards or page overflow.',
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

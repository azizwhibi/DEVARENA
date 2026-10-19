import assert from 'node:assert/strict';
import { PRESET_INSTITUTIONS } from '../src/lib/institutions.ts';
import { getCountryOptions, getCountryName } from '../src/lib/countries.ts';

let scenarios = 0;

// 1. Preset institutions
assert.ok(Array.isArray(PRESET_INSTITUTIONS));
assert.ok(PRESET_INSTITUTIONS.length >= 10);
assert.ok(PRESET_INSTITUTIONS.includes('42'));
scenarios++;

// 2. Country options generation using Intl.DisplayNames
const countries = getCountryOptions();
assert.ok(countries.length > 200, 'Should generate standard ISO countries');
assert.ok(countries.some(c => c.code === 'FR' && c.name === 'France'));
assert.ok(countries.some(c => c.code === 'US' && c.name === 'United States'));
assert.ok(!countries.some(c => c.code === 'ZZ'), 'Must not contain ZZ');
assert.ok(!countries.some(c => c.code === 'us'), 'Must not contain lowercase codes');

// Alphabetical ordering check
for (let i = 0; i < countries.length - 1; i++) {
  assert.ok(
    countries[i].name.localeCompare(countries[i + 1].name) <= 0,
    `Countries should be sorted: ${countries[i].name} vs ${countries[i + 1].name}`,
  );
}
scenarios += 5;

// 3. Country name lookup
assert.equal(getCountryName('FR'), 'France');
assert.equal(getCountryName('US'), 'United States');
assert.equal(getCountryName('ZZ'), null);
assert.equal(getCountryName('us'), null);
assert.equal(getCountryName(''), null);
assert.equal(getCountryName(null), null);
scenarios += 6;

console.log(`PASS: ${scenarios} profile library scenarios (institutions, countries, DisplayNames)`);

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateDataset } from '../lib/dataStore';
import type { DatasetKey } from '../types/dataContracts';

const ALL_KEYS: DatasetKey[] = [
  'worked_example_13_5',
  'constrained_demo',
  'convergence_iterations',
  'scalability_nd',
  'parameter_sensitivity',
  'multimodal_optimization',
  'tv10_complexity',
  'tv10_alpha_hybrid',
];

describe('Web JSON data contracts & schema validation', () => {
  it('validates all 8 generated public/data/*.json files without NaN or schema errors', () => {
    let totalBytes = 0;
    for (const key of ALL_KEYS) {
      const filePath = resolve(__dirname, '../../public/data', `${key}.json`);
      const buf = readFileSync(filePath);
      totalBytes += buf.byteLength;
      const parsed = JSON.parse(buf.toString('utf-8')) as unknown;
      const validated = validateDataset(key, parsed);
      expect(validated).toBeTruthy();
    }
    expect(totalBytes).toBeLessThan(3 * 1024 * 1024);
  });

  it('rejects non-finite numbers (NaN / Infinity) and malformed payloads', () => {
    expect(() =>
      validateDataset('worked_example_13_5', {
        initial_population: [{ id: 1, pos: [1, 2, Number.NaN], f: 0 }],
        pair_logs: [{}, {}],
      })
    ).toThrow(/NaN\/Infinity/);

    expect(() => validateDataset('tv10_complexity', { summary: [] })).toThrow();
  });
});

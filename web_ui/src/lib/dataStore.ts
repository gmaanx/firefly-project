import { useCallback, useEffect, useState } from 'react';
import type { DatasetKey, DatasetMap } from '../types/dataContracts';

const DATASET_FILENAMES: Record<DatasetKey, string> = {
  worked_example_13_5: 'worked_example_13_5.json',
  constrained_demo: 'constrained_demo.json',
  convergence_iterations: 'convergence_iterations.json',
  scalability_nd: 'scalability_nd.json',
  parameter_sensitivity: 'parameter_sensitivity.json',
  multimodal_optimization: 'multimodal_optimization.json',
  tv10_complexity: 'tv10_complexity.json',
  tv10_alpha_hybrid: 'tv10_alpha_hybrid.json',
};

export function resolveDataUrl(filename: string): string {
  const base = import.meta.env.BASE_URL || './';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  return `${normalizedBase}data/${filename}`;
}

function assertFiniteNumbers(value: unknown, path = '$'): void {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error(`Dữ liệu chứa số không hợp lệ (NaN/Infinity) tại ${path}`);
    }
    return;
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) {
      assertFiniteNumbers(value[i], `${path}[${i}]`);
    }
    return;
  }
  if (value !== null && typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      assertFiniteNumbers(v, `${path}.${k}`);
    }
  }
}

export function validateDataset<K extends DatasetKey>(key: K, raw: unknown): DatasetMap[K] {
  if (!raw || typeof raw !== 'object') {
    throw new Error(`Schema ${key} không phải object JSON hợp lệ.`);
  }
  assertFiniteNumbers(raw, key);
  const obj = raw as Record<string, unknown>;

  switch (key) {
    case 'worked_example_13_5': {
      if (!Array.isArray(obj.initial_population) || obj.initial_population.length === 0) {
        throw new Error('worked_example_13_5 thiếu initial_population.');
      }
      if (!Array.isArray(obj.pair_logs) || obj.pair_logs.length < 2) {
        throw new Error('worked_example_13_5 thiếu pair_logs.');
      }
      break;
    }
    case 'constrained_demo': {
      if (typeof obj.penalty_lambda !== 'number' || !Array.isArray(obj.nbest) || !Array.isArray(obj.history)) {
        throw new Error('constrained_demo thiếu penalty_lambda, nbest hoặc history.');
      }
      break;
    }
    case 'convergence_iterations': {
      if (!Array.isArray(obj.by_iterations) || obj.by_iterations.length === 0) {
        throw new Error('convergence_iterations thiếu mảng by_iterations.');
      }
      break;
    }
    case 'scalability_nd': {
      if (!Array.isArray(obj.by_scale) || obj.by_scale.length === 0) {
        throw new Error('scalability_nd thiếu mảng by_scale.');
      }
      break;
    }
    case 'parameter_sensitivity': {
      if (!Array.isArray(obj.grid) || obj.grid.length === 0 || !Array.isArray(obj.gamma_sweep)) {
        throw new Error('parameter_sensitivity thiếu grid hoặc gamma_sweep.');
      }
      break;
    }
    case 'multimodal_optimization': {
      if (
        !Array.isArray(obj.gamma_summary) ||
        !obj.methodology ||
        !Array.isArray(obj.replays) ||
        obj.replays.length === 0
      ) {
        throw new Error('multimodal_optimization thiếu gamma_summary, methodology hoặc replays.');
      }
      break;
    }
    case 'tv10_complexity': {
      if (!Array.isArray(obj.summary) || typeof obj.log_log_slope !== 'number') {
        throw new Error('tv10_complexity thiếu summary hoặc log_log_slope.');
      }
      break;
    }
    case 'tv10_alpha_hybrid': {
      if (!Array.isArray(obj.runs) || !Array.isArray(obj.hybrid_runs) || !Array.isArray(obj.summary)) {
        throw new Error('tv10_alpha_hybrid thiếu runs, hybrid_runs hoặc summary.');
      }
      break;
    }
  }

  return raw as DatasetMap[K];
}

const resolvedCache = new Map<DatasetKey, DatasetMap[DatasetKey]>();
const inflightCache = new Map<DatasetKey, Promise<DatasetMap[DatasetKey]>>();
// Allow one-shot simulated fault via URL query `?fault=<datasetKey>` so retry can recover cleanly
const consumedFaultKeys = new Set<string>();

function shouldSimulateFault(key: DatasetKey): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  const faultParam = params.get('fault');
  if (!faultParam) return false;
  const requested = faultParam.split(',').map((s) => s.trim());
  if (requested.includes(key) && !consumedFaultKeys.has(key)) {
    consumedFaultKeys.add(key);
    return true;
  }
  return false;
}

export async function fetchDataset<K extends DatasetKey>(
  key: K,
  options?: { forceReload?: boolean }
): Promise<DatasetMap[K]> {
  if (options?.forceReload) {
    resolvedCache.delete(key);
    inflightCache.delete(key);
  }

  const cached = resolvedCache.get(key);
  if (cached !== undefined) {
    return cached as DatasetMap[K];
  }

  const inflight = inflightCache.get(key);
  if (inflight !== undefined) {
    return inflight as Promise<DatasetMap[K]>;
  }

  const promise = (async () => {
    if (shouldSimulateFault(key)) {
      throw new Error(`Mô phỏng lỗi tải dữ liệu cho ${DATASET_FILENAMES[key]} (nhấn "Thử lại" để khôi phục).`);
    }
    const url = resolveDataUrl(DATASET_FILENAMES[key]);
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
      throw new Error(`Không tải được ${DATASET_FILENAMES[key]} (HTTP ${res.status}).`);
    }
    let parsed: unknown;
    try {
      parsed = await res.json();
    } catch {
      throw new Error(`Phản hồi của ${DATASET_FILENAMES[key]} không phải JSON hợp lệ.`);
    }
    const validated = validateDataset(key, parsed);
    resolvedCache.set(key, validated);
    return validated;
  })();

  inflightCache.set(key, promise as Promise<DatasetMap[DatasetKey]>);
  try {
    return await promise;
  } finally {
    inflightCache.delete(key);
  }
}

export function prefetchDataset<K extends DatasetKey>(key: K): void {
  if (resolvedCache.has(key) || inflightCache.has(key)) return;
  void fetchDataset(key).catch(() => {
    // Non-blocking prefetch: actual component hook surfaces error & retry button if needed
  });
}

export interface DatasetState<K extends DatasetKey> {
  status: 'idle' | 'loading' | 'ready' | 'error';
  data: DatasetMap[K] | null;
  error: string | null;
  retry: () => void;
}

export function useDataset<K extends DatasetKey>(key: K, enabled = true): DatasetState<K> {
  const [data, setData] = useState<DatasetMap[K] | null>(() => {
    const c = resolvedCache.get(key);
    return c ? (c as DatasetMap[K]) : null;
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(() => enabled && !resolvedCache.has(key));
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    if (attempt === 0 && resolvedCache.has(key)) {
      setData(resolvedCache.get(key) as DatasetMap[K]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    fetchDataset(key, { forceReload: attempt > 0 })
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setError(null);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Lỗi không xác định khi tải JSON.');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [key, enabled, attempt]);

  const retry = useCallback(() => {
    setAttempt((n) => n + 1);
  }, []);

  const status: DatasetState<K>['status'] = data
    ? 'ready'
    : error
      ? 'error'
      : loading
        ? 'loading'
        : 'idle';

  return { status, data, error, retry };
}

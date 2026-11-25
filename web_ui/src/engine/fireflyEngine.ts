/**
 * Pure TypeScript port of the Firefly Algorithm solver (`core/problems.py`,
 * `core/parameters.py`, `core/population.py`, `core/engine.py`, and
 * `simulations/experiments.py::detect_subswarms`).
 *
 * Completely decoupled from React and Canvas.
 *
 * Key Python fidelity rules:
 * 1. Minimization: smaller f(x) = brighter firefly (`lightn[j] < lightn[i]`).
 * 2. Initial population (`t = 0`): uniform on [Lb, Ub], ranked ascending by `lightn`,
 *    `alphaUsed = alpha0`, `alphaNext = alpha0 * theta`.
 * 3. Each generation `t = 1..tMax`:
 *    - `alpha` decays AT THE START of generation `t`: `alpha_t = alpha0 * theta^t`.
 *    - Double loop `for i in 0..n-1`, `for j in 0..n-1` updates `ns[i]` and `lightn[i]`
 *      IN-PLACE immediately when `lightn[j] < lightn[i]`:
 *        `new_pos = xi + beta0 * exp(-gamma * r_ij^2) * (xj - xi) + alpha_t * scale * eps`
 *      where `scale = |Ub - Lb|` and `eps ~ U(-0.5, 0.5)^d`, clamped immediately to
 *      `[Lb, Ub]` via `findLimits` and re-evaluated immediately before checking `(i, j+1)`.
 *    - After both loops finish, `rankFireflies` sorts `ns` and `lightn` ascending.
 * 4. Worked Example 13.5 (`workedExamplePairStep`) additionally mirrors
 *    `simulations/demos.py::run_worked_example_13_5` where `scale = [1, ..., 1]`
 *    and greedy acceptance (`f_new < f_old`) is explicitly checked.
 * 5. RNG note: JS live sandbox uses deterministic Mulberry32 (`createSeededRng(seed)`)
 *    for repeatable runs per JS seed; it does NOT claim identical trajectories to NumPy's
 *    MT19937 for the same integer seed unless driven by an injected draw stream
 *    (`createSequenceRng`).
 */

export interface RandomSource {
  /** Returns uniform float in [0, 1). */
  nextUniform01(): number;
}

/** Deterministic Mulberry32 PRNG for repeatable browser sandbox runs. */
export function createSeededRng(seed: number): RandomSource {
  let state = (Math.floor(seed) >>> 0) || 0x6d2b79f5;
  return {
    nextUniform01(): number {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}

/** Deterministic draw-sequence RNG for exact step-by-step parity tests against Python. */
export function createSequenceRng(uniform01Values: readonly number[]): RandomSource {
  let idx = 0;
  return {
    nextUniform01(): number {
      if (idx >= uniform01Values.length) {
        throw new Error(`Random sequence exhausted at index ${idx}`);
      }
      const val = uniform01Values[idx];
      idx += 1;
      return val;
    },
  };
}

export type SandboxProblemId = 'sphere2d' | 'constrained2d' | 'himmelblau2d';

export interface ConstrainedBreakdown {
  objective: number;
  penalty: number;
  penalized: number;
  eqResidual: number;
  ineqResidual: number;
  totalResidual: number;
  isFeasible: boolean;
  feasibilityTol: number;
}

export interface ProblemDefinition {
  id: SandboxProblemId | string;
  name: string;
  subtitle: string;
  d: number;
  Lb: number[];
  Ub: number[];
  scale: number[];
  isConstrained: boolean;
  penaltyLambda?: number;
  feasibilityTol?: number;
  referenceOptima: number[][];
  referenceFStar: number;
  scopeNote: string;
  evaluate(x: readonly number[]): number;
  objective(x: readonly number[]): number;
  inspectConstrained?(x: readonly number[]): ConstrainedBreakdown;
}

export function createShiftedSphereProblem(d = 2, lb = -5.0, ub = 5.0): ProblemDefinition {
  const Lb = Array.from({ length: d }, () => lb);
  const Ub = Array.from({ length: d }, () => ub);
  const scale = Ub.map((u, i) => Math.abs(u - Lb[i]));
  const opt = Array.from({ length: d }, () => 1.0);
  const evalSphere = (x: readonly number[]): number => {
    let sum = 0;
    for (let k = 0; k < d; k += 1) {
      const diff = x[k] - 1.0;
      sum += diff * diff;
    }
    return sum;
  };
  return {
    id: d === 2 ? 'sphere2d' : `sphere${d}d`,
    name: d === 2 ? 'Shifted Sphere 2D' : `Shifted Sphere ${d}D`,
    subtitle: `f(x) = Σ(xₖ − 1)² trên [${lb}, ${ub}]^${d}`,
    d,
    Lb,
    Ub,
    scale,
    isConstrained: false,
    referenceOptima: [opt],
    referenceFStar: 0.0,
    scopeNote:
      d === 2
        ? 'Bản 2D trực quan hóa mặt cắt địa hình của UnconstrainedProblem (benchmark mặc định trong Python dùng D = 10).'
        : `Bài toán chuẩn UnconstrainedProblem D = ${d}.`,
    evaluate: evalSphere,
    objective: evalSphere,
  };
}

/**
 * 2D Constrained Static Penalty problem for Live Sandbox:
 *   min f(x) = (x₁ − 1)² + (x₂ − 1)²
 *   s.t. φ(x) = x₁ + x₂ − 1 = 0
 *        ψ₁(x) = −x₁ ≤ 0  (x₁ ≥ 0)
 *        ψ₂(x) = −x₂ ≤ 0  (x₂ ≥ 0)
 *   Π(x) = f(x) + λ [ φ(x)² + max(0, −x₁)² + max(0, −x₂)² ], λ = 10⁵.
 *   Analytical constrained optimum: x* = (0.5, 0.5), f(x*) = 0.5.
 */
export function createConstrained2DProblem(
  penaltyLambda = 1e5,
  lb = -5.0,
  ub = 5.0,
  feasibilityTol = 1e-2
): ProblemDefinition {
  const Lb = [lb, lb];
  const Ub = [ub, ub];
  const scale = [Math.abs(ub - lb), Math.abs(ub - lb)];

  const objective = (x: readonly number[]): number => {
    const dx1 = x[0] - 1.0;
    const dx2 = x[1] - 1.0;
    return dx1 * dx1 + dx2 * dx2;
  };

  const inspectConstrained = (x: readonly number[]): ConstrainedBreakdown => {
    const obj = objective(x);
    const phi = x[0] + x[1] - 1.0;
    const psi1 = Math.max(0.0, -x[0]);
    const psi2 = Math.max(0.0, -x[1]);
    const penalty = penaltyLambda * (phi * phi + psi1 * psi1 + psi2 * psi2);
    const eqResidual = Math.abs(phi);
    const ineqResidual = Math.max(psi1, psi2);
    const totalResidual = Math.hypot(phi, psi1, psi2);
    const isFeasible = eqResidual <= feasibilityTol && ineqResidual <= feasibilityTol;
    return {
      objective: obj,
      penalty,
      penalized: obj + penalty,
      eqResidual,
      ineqResidual,
      totalResidual,
      isFeasible,
      feasibilityTol,
    };
  };

  return {
    id: 'constrained2d',
    name: 'Hàm phạt tĩnh 2D (Penalty)',
    subtitle: 'min Σ(xₖ−1)² với x₁+x₂=1, x₁,x₂≥0, λ=10⁵',
    d: 2,
    Lb,
    Ub,
    scale,
    isConstrained: true,
    penaltyLambda,
    feasibilityTol,
    referenceOptima: [[0.5, 0.5]],
    referenceFStar: 0.5,
    scopeNote:
      'Biến thể 2D minh họa cơ chế hàm phạt tĩnh Π(x) = f(x) + P(x) trên mặt phẳng; KHÔNG phải replay của bài toán Mục 13.6 3D (x₁+x₂+x₃=1.5, x₁≤0.4).',
    objective,
    evaluate: (x) => inspectConstrained(x).penalized,
    inspectConstrained,
  };
}

export function createHimmelblau2DProblem(lb = -5.0, ub = 5.0): ProblemDefinition {
  const Lb = [lb, lb];
  const Ub = [ub, ub];
  const scale = [Math.abs(ub - lb), Math.abs(ub - lb)];
  const optima: number[][] = [
    [3.0, 2.0],
    [-2.805118, 3.131312],
    [-3.77931, -3.283186],
    [3.584428, -1.848126],
  ];
  const evalHimmelblau = (x: readonly number[]): number => {
    const a = x[0] * x[0] + x[1] - 11.0;
    const b = x[0] + x[1] * x[1] - 7.0;
    return a * a + b * b;
  };
  return {
    id: 'himmelblau2d',
    name: 'Himmelblau 2D (Đa cực trị)',
    subtitle: 'f(x) = (x₁² + x₂ − 11)² + (x₁ + x₂² − 7)² trên [-5, 5]²',
    d: 2,
    Lb,
    Ub,
    scale,
    isConstrained: false,
    referenceOptima: optima,
    referenceFStar: 0.0,
    scopeNote:
      '4 cực tiểu toàn cục f* = 0. Preset γ = 1.0 hỗ trợ quan sát tách đàn cục bộ (L = 1); số nghiệm đạt được phụ thuộc n và seed cụ thể.',
    evaluate: evalHimmelblau,
    objective: evalHimmelblau,
  };
}

export const SANDBOX_PROBLEMS: Record<SandboxProblemId, ProblemDefinition> = {
  sphere2d: createShiftedSphereProblem(2, -5.0, 5.0),
  constrained2d: createConstrained2DProblem(1e5, -5.0, 5.0, 1e-2),
  himmelblau2d: createHimmelblau2DProblem(-5.0, 5.0),
};

export interface FAParameterConfig {
  alpha0: number;
  beta0: number;
  gamma: number;
  theta: number;
}

export function calcDistance(xi: readonly number[], xj: readonly number[]): number {
  let sumSq = 0;
  for (let k = 0; k < xi.length; k += 1) {
    const d = xi[k] - xj[k];
    sumSq += d * d;
  }
  return Math.sqrt(sumSq);
}

export function calcAttractiveness(r: number, beta0: number, gamma: number): number {
  return beta0 * Math.exp(-gamma * r * r);
}

export function updateAlphaValue(currentAlpha: number, theta: number): number {
  return currentAlpha * theta;
}

export function findLimits(
  pos: readonly number[],
  Lb: readonly number[],
  Ub: readonly number[]
): number[] {
  const out = new Array<number>(pos.length);
  for (let k = 0; k < pos.length; k += 1) {
    const v = pos[k];
    out[k] = v < Lb[k] ? Lb[k] : v > Ub[k] ? Ub[k] : v;
  }
  return out;
}

export interface RankedPopulation {
  positions: number[][];
  fitness: number[];
  order: number[];
  nbest: number[];
  fbest: number;
}

export function rankFireflies(
  positions: readonly (readonly number[])[],
  fitness: readonly number[]
): RankedPopulation {
  const indices = positions.map((_, idx) => idx);
  // Deterministic ascending sort; tie-break by prior index matching stable argsort order
  indices.sort((a, b) => {
    const diff = fitness[a] - fitness[b];
    return diff !== 0 ? diff : a - b;
  });
  const sortedPositions = indices.map((idx) => [...positions[idx]]);
  const sortedFitness = indices.map((idx) => fitness[idx]);
  return {
    positions: sortedPositions,
    fitness: sortedFitness,
    order: indices,
    nbest: [...sortedPositions[0]],
    fbest: sortedFitness[0],
  };
}

export interface PairMoveResult {
  newPos: number[];
  rIj: number;
  beta: number;
  attractionStep: number[];
  randomStep: number[];
  moved: boolean;
}

export function moveFireflyPair(
  xi: readonly number[],
  xj: readonly number[],
  lightI: number,
  lightJ: number,
  alpha: number,
  params: Pick<FAParameterConfig, 'beta0' | 'gamma'>,
  scale: readonly number[],
  rngOrCustomEps: RandomSource | readonly number[]
): PairMoveResult {
  const d = xi.length;
  const rIj = calcDistance(xi, xj);
  const beta = calcAttractiveness(rIj, params.beta0, params.gamma);

  if (lightJ < lightI) {
    const attractionStep = new Array<number>(d);
    const randomStep = new Array<number>(d);
    const newPos = new Array<number>(d);
    const isCustom = Array.isArray(rngOrCustomEps);

    for (let k = 0; k < d; k += 1) {
      const epsK = isCustom
        ? (rngOrCustomEps as readonly number[])[k]
        : (rngOrCustomEps as RandomSource).nextUniform01() - 0.5;
      attractionStep[k] = beta * (xj[k] - xi[k]);
      randomStep[k] = alpha * scale[k] * epsK;
      newPos[k] = xi[k] + attractionStep[k] + randomStep[k];
    }

    return {
      newPos,
      rIj,
      beta,
      attractionStep,
      randomStep,
      moved: true,
    };
  }

  return {
    newPos: [...xi],
    rIj,
    beta,
    attractionStep: new Array<number>(d).fill(0),
    randomStep: new Array<number>(d).fill(0),
    moved: false,
  };
}

/**
 * Mirrors `simulations/demos.py::run_worked_example_13_5` single pair evaluation:
 * unit scale `[1, ..., 1]` + bounds clamp + greedy acceptance (`fNew < fOld`).
 */
export function workedExamplePairStep(
  xi: readonly number[],
  xj: readonly number[],
  fI: number,
  fJ: number,
  alpha: number,
  params: Pick<FAParameterConfig, 'beta0' | 'gamma'>,
  problem: ProblemDefinition,
  customEps: readonly number[]
): {
  rIj: number;
  beta: number;
  proposedPos: number[];
  fNew: number;
  accepted: boolean;
  resultingPos: number[];
  resultingF: number;
} {
  const unitScale = new Array<number>(problem.d).fill(1.0);
  const res = moveFireflyPair(xi, xj, fI, fJ, alpha, params, unitScale, customEps);
  const proposedPos = findLimits(res.newPos, problem.Lb, problem.Ub);
  const fNew = problem.evaluate(proposedPos);
  const accepted = fNew < fI;
  return {
    rIj: res.rIj,
    beta: res.beta,
    proposedPos,
    fNew,
    accepted,
    resultingPos: accepted ? proposedPos : [...xi],
    resultingF: accepted ? fNew : fI,
  };
}

export interface VisualPairLink {
  from: [number, number];
  to: [number, number];
  beta: number;
}

export interface SubswarmSummary {
  nClusters: number;
  noiseCount: number;
  globalOptimaFound: number;
  dispersion: number;
}

export function analyzeSubswarms2D(
  positions: readonly (readonly number[])[],
  fitness: readonly number[],
  problem: ProblemDefinition,
  eps = 0.6,
  minSize = 3
): SubswarmSummary {
  const n = positions.length;
  if (n === 0) {
    return { nClusters: 0, noiseCount: 0, globalOptimaFound: 0, dispersion: 0 };
  }

  // Pairwise Euclidean distances (matching simulations/experiments.py::detect_subswarms)
  let pairSum = 0;
  let pairCount = 0;
  const distMatrix: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      const d = Math.hypot(positions[i][0] - positions[j][0], positions[i][1] - positions[j][1]);
      distMatrix[i][j] = d;
      distMatrix[j][i] = d;
      pairSum += d;
      pairCount += 1;
    }
  }

  const seen = new Set<number>();
  const labels = new Array<number>(n).fill(-1);
  let nClusters = 0;

  for (let start = 0; start < n; start += 1) {
    if (seen.has(start)) continue;
    seen.add(start);
    const stack = [start];
    const members: number[] = [];
    while (stack.length > 0) {
      const i = stack.pop()!;
      members.push(i);
      for (let j = 0; j < n; j += 1) {
        if (distMatrix[i][j] <= eps && !seen.has(j)) {
          seen.add(j);
          stack.push(j);
        }
      }
    }
    if (members.length < minSize) continue;
    for (const idx of members) {
      labels[idx] = nClusters;
    }
    nClusters += 1;
  }

  let globalOptimaFound = 0;
  for (const opt of problem.referenceOptima) {
    let hit = false;
    for (let i = 0; i < n; i += 1) {
      const d = Math.hypot(positions[i][0] - opt[0], positions[i][1] - opt[1]);
      if (d <= 0.3 && fitness[i] <= 1e-2) {
        hit = true;
        break;
      }
    }
    if (hit) globalOptimaFound += 1;
  }

  return {
    nClusters,
    noiseCount: labels.filter((l) => l === -1).length,
    globalOptimaFound,
    dispersion: pairCount > 0 ? pairSum / pairCount : 0,
  };
}

export interface FireflySolverConfig {
  problem: ProblemDefinition;
  nFireflies: number;
  alpha0: number;
  beta0: number;
  gamma: number;
  theta: number;
  tMax: number;
  seed: number;
  maxVisualLinks?: number;
  trailLength?: number;
}

export interface FireflyGenerationSnapshot {
  t: number;
  /** For t=0: alpha0. For t>=1: alpha0 * theta^t (the alpha used during generation t). */
  alphaUsed: number;
  /** Alpha scheduled for generation t+1: alphaUsed * theta. */
  alphaNext: number;
  positions: number[][];
  fitness: number[];
  nbest: number[];
  fbest: number;
  evaluationsTotal: number;
  activeMovesInGen: number;
  constrainedBest: ConstrainedBreakdown | null;
  subswarms: SubswarmSummary | null;
  visualLinks: VisualPairLink[];
  /** Short recent best/centroid trails for rendering, purely visual (never used in solver math). */
  trails: [number, number][][];
  completed: boolean;
  stopReason: string | null;
}

export interface FireflyEngineInstance {
  readonly config: FireflySolverConfig;
  getSnapshot(): FireflyGenerationSnapshot;
  stepOneGeneration(): FireflyGenerationSnapshot;
}

export function createFireflyEngine(
  config: FireflySolverConfig,
  injectedRng?: RandomSource
): FireflyEngineInstance {
  const {
    problem,
    nFireflies,
    alpha0,
    beta0,
    gamma,
    theta,
    tMax,
    seed,
    maxVisualLinks = 36,
    trailLength = 7,
  } = config;

  if (nFireflies <= 0) {
    throw new Error('nFireflies must be positive');
  }
  if (tMax < 0) {
    throw new Error('tMax must be non-negative');
  }

  const rng = injectedRng ?? createSeededRng(seed);

  // 1. init_population(n, problem)
  const rawPositions: number[][] = [];
  const rawFitness: number[] = [];
  for (let i = 0; i < nFireflies; i += 1) {
    const pos = new Array<number>(problem.d);
    for (let k = 0; k < problem.d; k += 1) {
      pos[k] = problem.Lb[k] + (problem.Ub[k] - problem.Lb[k]) * rng.nextUniform01();
    }
    rawPositions.push(pos);
    rawFitness.push(problem.evaluate(pos));
  }

  // 2. rank_fireflies(ns, lightn) at t = 0
  const ranked0 = rankFireflies(rawPositions, rawFitness);
  let ns = ranked0.positions;
  let lightn = ranked0.fitness;
  let nbest = ranked0.nbest;
  let fbest = ranked0.fbest;
  let currentAlpha = alpha0;
  let t = 0;
  let evaluationsTotal = nFireflies;

  // Purely visual short trails per ranked slot (2D projection) so trails don't affect math
  let trails: [number, number][][] = ns.map((p) => [[p[0], p[1] ?? 0]]);

  const buildSnapshot = (
    activeMovesInGen: number,
    visualLinks: VisualPairLink[]
  ): FireflyGenerationSnapshot => {
    const completed = t >= tMax;
    const stopReason = completed
      ? `Hoàn tất ngân sách ${tMax} thế hệ (t = ${t}/${tMax}).`
      : null;

    return {
      t,
      alphaUsed: currentAlpha,
      alphaNext: currentAlpha * theta,
      positions: ns.map((p) => [...p]),
      fitness: [...lightn],
      nbest: [...nbest],
      fbest,
      evaluationsTotal,
      activeMovesInGen,
      constrainedBest: problem.inspectConstrained ? problem.inspectConstrained(nbest) : null,
      subswarms: problem.d === 2 ? analyzeSubswarms2D(ns, lightn, problem) : null,
      visualLinks,
      trails: trails.map((tr) => [...tr]),
      completed,
      stopReason,
    };
  };

  let latestSnapshot = buildSnapshot(0, []);

  return {
    config,
    getSnapshot(): FireflyGenerationSnapshot {
      return latestSnapshot;
    },
    stepOneGeneration(): FireflyGenerationSnapshot {
      if (t >= tMax) {
        return latestSnapshot;
      }

      const prevPositions2D: [number, number][] = ns.map((p) => [p[0], p[1] ?? 0]);

      // Step 3a: t = t + 1, decay alpha AT THE START of generation t (`core/engine.py` line 125)
      t += 1;
      currentAlpha = updateAlphaValue(currentAlpha, theta);

      let activeMoves = 0;
      const candidateLinks: VisualPairLink[] = [];

      // Step 3b: Nested loops `i` and `j`, in-place update + immediate clamp + immediate evaluate
      for (let i = 0; i < nFireflies; i += 1) {
        for (let j = 0; j < nFireflies; j += 1) {
          if (lightn[j] < lightn[i]) {
            const origin2D: [number, number] = [ns[i][0], ns[i][1] ?? 0];
            const target2D: [number, number] = [ns[j][0], ns[j][1] ?? 0];
            const moveRes = moveFireflyPair(
              ns[i],
              ns[j],
              lightn[i],
              lightn[j],
              currentAlpha,
              { beta0, gamma },
              problem.scale,
              rng
            );
            const clipped = findLimits(moveRes.newPos, problem.Lb, problem.Ub);
            ns[i] = clipped;
            lightn[i] = problem.evaluate(clipped);
            evaluationsTotal += 1;
            activeMoves += 1;

            if (candidateLinks.length < maxVisualLinks * 2 && moveRes.beta > 0.04) {
              candidateLinks.push({
                from: origin2D,
                to: target2D,
                beta: moveRes.beta,
              });
            }
          }
        }
      }

      // Update short visual displacement segments before re-ranking Permutes indices
      const updatedTrailsBeforeRank: [number, number][][] = ns.map((p, idx) => {
        const prevTrail = trails[idx] ?? [prevPositions2D[idx]];
        const nextPt: [number, number] = [p[0], p[1] ?? 0];
        const combined = [...prevTrail, nextPt];
        return combined.length > trailLength
          ? combined.slice(combined.length - trailLength)
          : combined;
      });

      // Step 3c: rank_fireflies after generation t (`core/engine.py` line 147)
      const ranked = rankFireflies(ns, lightn);
      ns = ranked.positions;
      lightn = ranked.fitness;
      nbest = ranked.nbest;
      fbest = ranked.fbest;
      trails = ranked.order.map((oldIdx) => updatedTrailsBeforeRank[oldIdx]);

      candidateLinks.sort((a, b) => b.beta - a.beta);
      const visualLinks = candidateLinks.slice(0, maxVisualLinks);

      latestSnapshot = buildSnapshot(activeMoves, visualLinks);
      return latestSnapshot;
    },
  };
}

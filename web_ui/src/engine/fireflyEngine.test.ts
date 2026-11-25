import { describe, expect, it } from 'vitest';
import parityFixture from './__fixtures__/python_parity_fixture.json';
import {
  SANDBOX_PROBLEMS,
  createFireflyEngine,
  createSequenceRng,
  createShiftedSphereProblem,
  findLimits,
  moveFireflyPair,
  workedExamplePairStep,
} from './fireflyEngine';

describe('fireflyEngine Python parity & numerical invariants', () => {
  it('matches Python Worked Example 13.5 accepted (x2 -> x1) and rejected (x3 -> x1) steps exactly', () => {
    const problem3d = createShiftedSphereProblem(3, -5.0, 5.0);
    const initPop = parityFixture.worked_13_5.initial_population;

    // Verify initial fitness evaluation matches Python
    for (const item of initPop) {
      expect(problem3d.evaluate(item.pos)).toBeCloseTo(item.f, 12);
    }

    const alphaT1 = 1.0 * 0.97;
    const params = { beta0: 1.0, gamma: 0.1 };

    // Pair 1: x2 -> x1 (accepted)
    const step21 = workedExamplePairStep(
      initPop[1].pos,
      initPop[0].pos,
      initPop[1].f,
      initPop[0].f,
      alphaT1,
      params,
      problem3d,
      [-0.5, 0.4, 0.1]
    );
    const py21 = parityFixture.worked_13_5.pair_logs[0];
    expect(step21.rIj).toBeCloseTo(py21.r_ij, 12);
    expect(step21.beta).toBeCloseTo(py21.beta, 12);
    step21.proposedPos.forEach((v, k) => expect(v).toBeCloseTo(py21.new_pos[k], 12));
    expect(step21.fNew).toBeCloseTo(py21.f_new, 12);
    expect(step21.accepted).toBe(true);

    // Pair 2: x3 -> x1 (rejected — position stays at x3)
    const step31 = workedExamplePairStep(
      initPop[2].pos,
      initPop[0].pos,
      initPop[2].f,
      initPop[0].f,
      alphaT1,
      params,
      problem3d,
      [-0.2, 0.1, -0.5]
    );
    const py31 = parityFixture.worked_13_5.pair_logs[1];
    expect(step31.rIj).toBeCloseTo(py31.r_ij, 12);
    expect(step31.beta).toBeCloseTo(py31.beta, 12);
    step31.proposedPos.forEach((v, k) => expect(v).toBeCloseTo(py31.new_pos[k], 12));
    expect(step31.fNew).toBeCloseTo(py31.f_new, 12);
    expect(step31.accepted).toBe(false);
    expect(step31.resultingPos).toEqual(initPop[2].pos);
  });

  it('matches Python boundary clipping (find_limits) and move_firefly_pair on boundary escape', () => {
    const c = parityFixture.clipping_case;
    const res = moveFireflyPair(
      [4.8, -4.9],
      [4.95, -4.95],
      40.0,
      10.0,
      1.0,
      { beta0: 1.0, gamma: 0.01 },
      [10.0, 10.0],
      [0.45, -0.45]
    );
    expect(res.rIj).toBeCloseTo(c.r_ij, 12);
    expect(res.beta).toBeCloseTo(c.beta, 12);
    res.newPos.forEach((v, k) => expect(v).toBeCloseTo(c.raw_new_pos[k], 12));

    const clipped = findLimits(res.newPos, [-5.0, -5.0], [5.0, 5.0]);
    expect(clipped).toEqual(c.clipped_pos);
    expect(clipped[0]).toBe(5.0);
    expect(clipped[1]).toBe(-5.0);
  });

  it('reproduces Python FireflySolver multi-generation history step-by-step when fed identical uniform draws', () => {
    const run = parityFixture.solver_run;
    const problem = createShiftedSphereProblem(run.d, run.lb, run.ub);
    const rng = createSequenceRng(run.uniform01_draws);

    const engine = createFireflyEngine(
      {
        problem,
        nFireflies: run.n,
        alpha0: run.params.alpha0,
        beta0: run.params.beta0,
        gamma: run.params.gamma,
        theta: run.params.theta,
        tMax: run.t_max,
        seed: 0,
      },
      rng
    );

    expect(engine.getSnapshot().t).toBe(0);
    expect(engine.getSnapshot().alphaUsed).toBeCloseTo(run.params.alpha0, 12);

    for (let stepIdx = 0; stepIdx < run.t_max; stepIdx += 1) {
      const snap = engine.stepOneGeneration();
      const pyStep = run.history[stepIdx];

      expect(snap.t).toBe(pyStep.t);
      expect(snap.alphaUsed).toBeCloseTo(pyStep.alpha, 12);
      expect(snap.alphaUsed).toBeCloseTo(run.params.alpha0 * Math.pow(run.params.theta, snap.t), 12);
      expect(snap.fbest).toBeCloseTo(pyStep.fbest, 11);
      snap.nbest.forEach((v, k) => expect(v).toBeCloseTo(pyStep.nbest[k], 11));
      snap.fitness.forEach((f, i) => expect(f).toBeCloseTo(pyStep.fitness[i], 11));
      snap.positions.forEach((pos, i) => {
        pos.forEach((coord, k) => expect(coord).toBeCloseTo(pyStep.positions[i][k], 11));
      });
    }

    expect(engine.getSnapshot().completed).toBe(true);
    // Calling stepOneGeneration after completion does not advance t beyond tMax
    expect(engine.stepOneGeneration().t).toBe(run.t_max);
  });

  it('guarantees repeatable JS seed resets and distinct objective vs penalized values on constrained2d', () => {
    const cfg = {
      problem: SANDBOX_PROBLEMS.constrained2d,
      nFireflies: 20,
      alpha0: 0.4,
      beta0: 1.0,
      gamma: 0.1,
      theta: 0.97,
      tMax: 25,
      seed: 42,
    };

    const engineA = createFireflyEngine(cfg);
    const engineB = createFireflyEngine(cfg);

    for (let k = 0; k < 10; k += 1) {
      const sA = engineA.stepOneGeneration();
      const sB = engineB.stepOneGeneration();
      expect(sA.t).toBe(k + 1);
      expect(sA.fbest).toBe(sB.fbest);
      expect(sA.nbest).toEqual(sB.nbest);
    }

    // Verify constrained penalty breakdown at canonical points from TV7
    const breakdownUnconstrainedOpt = SANDBOX_PROBLEMS.constrained2d.inspectConstrained!([1.0, 1.0]);
    expect(breakdownUnconstrainedOpt.objective).toBe(0);
    expect(breakdownUnconstrainedOpt.penalty).toBe(100000);
    expect(breakdownUnconstrainedOpt.penalized).toBe(100000);
    expect(breakdownUnconstrainedOpt.isFeasible).toBe(false);

    const breakdownAnalyticalOpt = SANDBOX_PROBLEMS.constrained2d.inspectConstrained!([0.5, 0.5]);
    expect(breakdownAnalyticalOpt.objective).toBeCloseTo(0.5, 12);
    expect(breakdownAnalyticalOpt.penalty).toBe(0);
    expect(breakdownAnalyticalOpt.isFeasible).toBe(true);
  });
});

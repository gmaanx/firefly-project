import {
  SANDBOX_PROBLEMS,
  createShiftedSphereProblem,
  type ProblemDefinition,
} from './fireflyEngine';

export type ExtendedSandboxProblemId =
  | 'sphere2d'
  | 'sphere10d'
  | 'rosenbrock2d'
  | 'rastrigin2d'
  | 'ackley2d'
  | 'himmelblau2d'
  | 'constrained2d';

function createRosenbrock2D(): ProblemDefinition {
  const Lb = [-2.5, -1.5];
  const Ub = [2.5, 3.5];
  const scale = [5.0, 5.0];
  const evalFn = ([x, y]: readonly number[]): number => {
    const a = 1 - x;
    const b = y - x * x;
    return a * a + 100 * b * b;
  };
  return {
    id: 'rosenbrock2d',
    name: 'Rosenbrock 2D',
    subtitle: 'f(x, y) = (1 − x)² + 100(y − x²)² · Thung lũng hẹp cong',
    d: 2,
    Lb,
    Ub,
    scale,
    isConstrained: false,
    referenceOptima: [[1, 1]],
    referenceFStar: 0,
    scopeNote: 'Thung lũng parabol hẹp kiểm tra khả năng men theo rãnh cong tới x* = (1, 1).',
    evaluate: evalFn,
    objective: evalFn,
  };
}

function createRastrigin2D(): ProblemDefinition {
  const Lb = [-5.12, -5.12];
  const Ub = [5.12, 5.12];
  const scale = [10.24, 10.24];
  const evalFn = ([x, y]: readonly number[]): number =>
    20 +
    (x * x - 10 * Math.cos(2 * Math.PI * x)) +
    (y * y - 10 * Math.cos(2 * Math.PI * y));
  return {
    id: 'rastrigin2d',
    name: 'Rastrigin 2D',
    subtitle: 'f(x) = 20 + Σ[xₖ² − 10cos(2πxₖ)] · Lưới bẫy cục bộ dày đặc',
    d: 2,
    Lb,
    Ub,
    scale,
    isConstrained: false,
    referenceOptima: [[0, 0]],
    referenceFStar: 0,
    scopeNote: 'Hàng chục hố cực tiểu cục bộ bao quanh nghiệm toàn cục x* = (0, 0).',
    evaluate: evalFn,
    objective: evalFn,
  };
}

function createAckley2D(): ProblemDefinition {
  const Lb = [-5.0, -5.0];
  const Ub = [5.0, 5.0];
  const scale = [10.0, 10.0];
  const evalFn = ([x, y]: readonly number[]): number => {
    const r = Math.sqrt(0.5 * (x * x + y * y));
    const c = 0.5 * (Math.cos(2 * Math.PI * x) + Math.cos(2 * Math.PI * y));
    return -20 * Math.exp(-0.2 * r) - Math.exp(c) + Math.E + 20;
  };
  return {
    id: 'ackley2d',
    name: 'Ackley 2D',
    subtitle: 'Phễu tâm dốc giữa bề mặt gợn sóng · x* = (0, 0)',
    d: 2,
    Lb,
    Ub,
    scale,
    isConstrained: false,
    referenceOptima: [[0, 0]],
    referenceFStar: 0,
    scopeNote: 'Biên ngoài gần như phẳng kèm nhiều gợn sóng cục bộ, hố sâu tại tâm (0, 0).',
    evaluate: evalFn,
    objective: evalFn,
  };
}

export const EXTENDED_SANDBOX_PROBLEMS: Record<
  ExtendedSandboxProblemId,
  ProblemDefinition
> = {
  sphere2d: SANDBOX_PROBLEMS.sphere2d,
  sphere10d: createShiftedSphereProblem(10, -5.0, 5.0),
  rosenbrock2d: createRosenbrock2D(),
  rastrigin2d: createRastrigin2D(),
  ackley2d: createAckley2D(),
  himmelblau2d: SANDBOX_PROBLEMS.himmelblau2d,
  constrained2d: SANDBOX_PROBLEMS.constrained2d,
};

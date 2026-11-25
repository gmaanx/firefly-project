export type DatasetKey =
  | 'worked_example_13_5'
  | 'constrained_demo'
  | 'convergence_iterations'
  | 'scalability_nd'
  | 'parameter_sensitivity'
  | 'multimodal_optimization'
  | 'tv10_complexity'
  | 'tv10_alpha_hybrid';

export interface WorkedInitialFirefly {
  id: number;
  pos: [number, number, number];
  f: number;
}

export interface WorkedPairLog {
  pair: string;
  r_ij: number;
  beta: number;
  new_pos: [number, number, number];
  f_new: number;
  accepted: boolean;
}

export interface WorkedExample135Data {
  initial_population: WorkedInitialFirefly[];
  pair_logs: WorkedPairLog[];
  nbest: [number, number, number];
  fbest: number;
}

export interface ConstrainedHistoryStep {
  t: number;
  fbest: number;
  nbest: [number, number, number];
}

export interface ConstrainedDemoData {
  penalty_lambda: number;
  nbest: [number, number, number];
  fbest_penalized: number;
  fbest_objective: number;
  is_feasible: boolean;
  history: ConstrainedHistoryStep[];
}

export interface ConvergenceMilestone {
  t_max: number;
  fbest: number;
  nbest: number[];
  curve: number[];
}

export interface ConvergenceIterationsData {
  by_iterations: ConvergenceMilestone[];
}

export interface ScalabilityRow {
  n: number;
  d: number;
  fbest_mean: number;
  fbest_std: number;
  runtime_ms: number;
}

export interface ScalabilityNdData {
  by_scale: ScalabilityRow[];
}

export interface SensitivityGridRun {
  gamma: number;
  theta: number;
  fbest: number;
  curve: number[];
  dispersion: number[];
  final_alpha?: number;
  final_nbest?: number[];
}

export interface GammaSweepItem {
  gamma: number;
  fbest: number;
  curve: number[];
}

export interface ThetaSweepItem {
  theta: number;
  fbest: number;
  curve: number[];
}

export interface ParameterSensitivityData {
  grid: SensitivityGridRun[];
  gamma_sweep: GammaSweepItem[];
  theta_sweep: ThetaSweepItem[];
}

export interface MultimodalClusterInfo {
  size: number;
  center: [number, number];
  nbest: [number, number];
  fbest: number;
}

export interface MultimodalFrame {
  t: number;
  alpha: number;
  fbest: number;
  nbest: [number, number];
  positions: [number, number][];
  fitness: number[];
}

export interface MultimodalFrameMetric {
  t: number;
  dispersion: number;
  normalized_radius: number;
  cluster_entropy: number;
  global_optima_found: number;
  n_clusters: number;
  noise_count: number;
  labels: number[];
  clusters: MultimodalClusterInfo[];
}

export interface MultimodalSeedSummary {
  seed: number;
  fbest: number;
  nbest: [number, number];
  global_optima_found: number;
  n_clusters: number;
  noise_count: number;
}

export interface MultimodalReplayRun {
  function_name: 'Himmelblau' | 'Rastrigin';
  bounds: [number, number];
  global_optima: [number, number][];
  gamma: number;
  seed: number;
  n: number;
  t_max: number;
  alpha0: number;
  theta: number;
  beta0: number;
  priority: boolean;
  sample_stride: number;
  total_generations: number;
  fbest: number;
  nbest: [number, number];
  final_positions: [number, number][];
  final_fitness: number[];
  seed_summaries: MultimodalSeedSummary[];
  history: MultimodalFrame[];
  metrics: MultimodalFrameMetric[];
}

export interface MultimodalGammaSummary {
  function_name: 'Himmelblau' | 'Rastrigin';
  gamma: number;
  repetitions: number;
  dispersion_mean: number;
  dispersion_std: number;
  normalized_radius_mean: number;
  normalized_radius_std: number;
  n_clusters_mean: number;
  n_clusters_std: number;
  noise_count_mean: number;
  noise_count_std: number;
  global_optima_found_mean: number;
  global_optima_found_std: number;
  cluster_entropy_mean: number;
  cluster_entropy_std: number;
  fbest_mean: number;
}

export interface MultimodalMethodology {
  cluster_eps: number;
  min_cluster_size: number;
  optimum_distance_tolerance: number;
  optimum_fitness_tolerance: number;
  entropy: string;
  note: string;
}

export interface MultimodalOptimizationData {
  function_name: 'Himmelblau' | 'Rastrigin';
  bounds: [number, number];
  global_optima: [number, number][];
  gamma: number;
  seed: number;
  n: number;
  t_max: number;
  alpha0: number;
  theta: number;
  beta0: number;
  fbest: number;
  nbest: [number, number];
  final_positions: [number, number][];
  final_fitness: number[];
  history: MultimodalFrame[];
  metrics: MultimodalFrameMetric[];
  gamma_summary: MultimodalGammaSummary[];
  methodology: MultimodalMethodology;
  replays: MultimodalReplayRun[];
}

export interface ComplexityRunRow {
  n: number;
  d: number;
  seed: number;
  t_max: number;
  runtime_ms: number;
  ms_per_generation: number;
  pair_checks_per_generation: number;
  objective_evaluations: number;
}

export interface ComplexitySummaryRow {
  n: number;
  median_ms_per_generation: number;
}

export interface Tv10ComplexityData {
  runs: ComplexityRunRow[];
  summary: ComplexitySummaryRow[];
  log_log_slope: number;
  timing_scope: string;
  pair_count_source: string;
  complexity: string;
}

export interface AlphaComparisonRun {
  mode: 'fixed' | 'decaying';
  seed: number;
  alpha0: number;
  theta: number;
  curve: number[];
  alpha_curve: number[];
  evaluations: number;
  fbest: number;
  first_target_t: number | null;
}

export interface HybridLocalHistoryStep {
  evaluations: number;
  fbest: number;
  nbest: number[];
}

export interface HybridComparisonRun {
  seed: number;
  fa_fbest: number;
  total_evaluations: number;
  nbest: number[];
  fbest: number;
  evaluations: number;
  history: HybridLocalHistoryStep[];
}

export interface AlphaModeSummary {
  mode: 'fixed' | 'decaying';
  fbest_mean: number;
  target_success_rate: number;
}

export interface Tv10AlphaHybridData {
  runs: AlphaComparisonRun[];
  hybrid_runs: HybridComparisonRun[];
  target: number;
  n: number;
  d: number;
  t_max: number;
  note: string;
  summary: AlphaModeSummary[];
}

export interface DatasetMap {
  worked_example_13_5: WorkedExample135Data;
  constrained_demo: ConstrainedDemoData;
  convergence_iterations: ConvergenceIterationsData;
  scalability_nd: ScalabilityNdData;
  parameter_sensitivity: ParameterSensitivityData;
  multimodal_optimization: MultimodalOptimizationData;
  tv10_complexity: Tv10ComplexityData;
  tv10_alpha_hybrid: Tv10AlphaHybridData;
}

export interface DatasetProvenance {
  key: DatasetKey;
  file: string;
  sourceFn: string;
  modulePath: string;
  problem: string;
  dimension: string;
  population: string;
  config: string;
  seedsAndRuns: string;
  statistic: string;
  unit: string;
  conditionNote: string;
}

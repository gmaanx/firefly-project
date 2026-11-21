from __future__ import annotations
import time
from contextlib import contextmanager
import numpy as np
from core.engine import FireflySolver
from core.parameters import FAParameters
from core.population import init_population, rank_fireflies
from core.problems import UnconstrainedProblem

def exp_convergence_benchmark() -> dict:
    """Benchmark hội tụ theo số vòng lặp, kích thước quần thể và số chiều.

    Input: Không có.
    Output:
        {
            "by_iterations": [
                {"t_max": int, "fbest": float, "nbest": list[float],
                 "curve": list[float]}
            ],
            "by_scale": [
                {"n": int, "d": int, "fbest_mean": float,
                 "fbest_std": float, "runtime_ms": float}
            ],
        }

    Thí nghiệm hội tụ dùng cùng một lần chạy (n=20, D=3, 500 thế hệ),
    sau đó lấy các mốc 100/200/500 để các đường cong có cùng điểm đầu.

    Thí nghiệm quy mô dùng 5 lần chạy độc lập cho mỗi cặp (n, D).
    """
    iteration_points = (100, 200, 500)
    population_sizes = (5, 10, 20, 50)
    dimensions = (3, 10)
    repetitions = 5
    base_seed = 42

    def create_solver(n: int, d: int) -> FireflySolver:
        problem = UnconstrainedProblem(d=d, lb=-5.0, ub=5.0)
        params = FAParameters(
            alpha0=1.0,
            beta0=1.0,
            gamma=0.1,
            theta=0.97,
        )
        return FireflySolver(
            problem=problem,
            params=params,
            n_fireflies=n,
        )

    # 1. Lấy ba mốc hội tụ từ cùng một trajectory 500 thế hệ.
    print("[TV8] Bắt đầu benchmark hội tụ (n=20, D=3, t=500)...", flush=True)

    np.random.seed(base_seed)
    convergence_result = create_solver(n=20, d=3).run(t_max=500)
    convergence_history = convergence_result["history"]

    by_iterations = []

    for t_max in iteration_points:
        snapshot = convergence_history[t_max - 1]

        curve = [
            float(item["fbest"])
            for item in convergence_history[:t_max]
        ]

        by_iterations.append(
            {
                "t_max": int(t_max),
                "fbest": float(snapshot["fbest"]),
                "nbest": [float(value) for value in snapshot["nbest"]],
                "curve": curve,
            }
        )

        print(
            f"[TV8] Mốc t={t_max}: fbest={snapshot['fbest']:.6e}",
            flush=True,
        )

    # 2. Đánh giá ảnh hưởng của số lượng đom đóm và số chiều.
    by_scale = []

    total_runs = len(dimensions) * len(population_sizes) * repetitions
    completed_runs = 0

    print(
        f"[TV8] Bắt đầu benchmark quy mô: {total_runs} lần chạy độc lập...",
        flush=True,
    )

    for d in dimensions:
        for n in population_sizes:
            fitness_values = []
            runtime_values = []

            for run_index in range(repetitions):
                completed_runs += 1
                seed = base_seed + completed_runs
                np.random.seed(seed)

                solver = create_solver(n=n, d=d)

                start_time = time.perf_counter()
                result = solver.run(t_max=500)
                runtime_ms = (time.perf_counter() - start_time) * 1000.0

                fitness_values.append(float(result["fbest"]))
                runtime_values.append(float(runtime_ms))

                print(
                    f"[TV8] [{completed_runs}/{total_runs}] "
                    f"n={n}, D={d}, run={run_index + 1}/{repetitions} "
                    f"-> fbest={result['fbest']:.6e}, "
                    f"time={runtime_ms:.1f} ms",
                    flush=True,
                )

            by_scale.append(
                {
                    "n": int(n),
                    "d": int(d),
                    "fbest_mean": float(np.mean(fitness_values)),
                    "fbest_std": float(np.std(fitness_values, ddof=1)),
                    "runtime_ms": float(np.mean(runtime_values)),
                }
            )

    print("[TV8] Benchmark hoàn tất.", flush=True)

    return {
        "by_iterations": by_iterations,
        "by_scale": by_scale,
    }


def exp_parameter_sensitivity() -> dict:
    """Khảo sát 15 cặp (gamma, theta) bằng FireflySolver của TV5.

    Mỗi cặp chạy 500 vòng trên Sphere dịch tâm (D=10, [-5, 5]^10,
    n=20, alpha0=beta0=1). Vì nghiệm tối ưu có f*=0 nên `curve` chứa
    sai số mục tiêu fbest(t) - f* và `fbest` là sai số ở vòng cuối.

    `grid` chứa gamma, theta, fbest, curve, dispersion và history cho
    mỗi cặp. `dispersion` là trung bình khoảng cách Euclid của các cặp
    đom đóm phân biệt tại mỗi vòng. `curve` và `dispersion` dùng cùng
    thứ tự với `history`. TV5 xếp vị trí theo fitness ở mỗi vòng nên
    cùng chỉ số hàng có thể chỉ hai cá thể khác nhau ở hai vòng.

    `gamma_sweep` giữ theta=0.97 và `theta_sweep` giữ gamma=0.1.
    Đặt np.random.seed(seed) trước khi gọi để tái lập kết quả. Mọi cặp
    bắt đầu từ cùng trạng thái RNG và hàm khôi phục trạng thái khi thoát.
    """
    gamma_values = (1e-5, 0.01, 0.1, 1.0, 50.0)
    theta_values = (0.9, 0.97, 1.0)
    n_fireflies, dimension, t_max = 20, 10, 500
    pair_i, pair_j = np.triu_indices(n_fireflies, k=1)
    initial_rng_state = np.random.get_state()

    def run_one(gamma: float, theta: float) -> dict:
        np.random.set_state(initial_rng_state)
        problem = UnconstrainedProblem(d=dimension, lb=-5.0, ub=5.0)
        params = FAParameters(alpha0=1.0, beta0=1.0, gamma=gamma, theta=theta)
        solver = FireflySolver(problem=problem, params=params, n_fireflies=n_fireflies)
        result = solver.run(t_max=t_max)
        history = result["history"]
        if len(history) != t_max:
            raise ValueError(f"Thiếu snapshot cho gamma={gamma}, theta={theta}")

        fbest = float(result["fbest"])
        curve = [float(step["fbest"]) for step in history]
        positions = np.asarray([step["positions"] for step in history], dtype=float)
        pair_distances = np.linalg.norm(positions[:, pair_i] - positions[:, pair_j], axis=-1)
        dispersion = pair_distances.mean(axis=1).tolist()

        return {
            "gamma": gamma,
            "theta": theta,
            "fbest": fbest,
            "curve": curve,
            "dispersion": dispersion,
            "history": history,
        }

    try:
        grid = [run_one(gamma, theta) for gamma in gamma_values for theta in theta_values]
    finally:
        np.random.set_state(initial_rng_state)

    return {
        "grid": grid,
        "gamma_sweep": [
            {key: run[key] for key in ("gamma", "fbest", "curve")}
            for run in grid if run["theta"] == 0.97
        ],
        "theta_sweep": [
            {key: run[key] for key in ("theta", "fbest", "curve")}
            for run in grid if run["gamma"] == 0.1
        ],
    }


def exp_multimodal_optimization() -> dict:
    """Input: Không có (khảo sát tách đàn trên hàm mục tiêu đa cực trị).
    Output mẫu: {
        "function_name": str,
        "bounds": list[float],
        "global_optima": list[list[float]],
        "final_positions": list[list[float]],
        "final_fitness": list[float],
        "history": [{"t": int, "positions": list[list[float]], "fitness": list[float]}],
    }
    """
    return run_multimodal_experiment()


# TV10 experiments (kept with TV8/TV9 for the shared export contract).
class MultimodalProblem(UnconstrainedProblem):
    def __init__(self, name: str = "Himmelblau") -> None:
        if name not in ("Himmelblau", "Rastrigin"):
            raise ValueError("Unknown benchmark")
        super().__init__(d=2, lb=-5.0 if name == "Himmelblau" else -5.12,
                         ub=5.0 if name == "Himmelblau" else 5.12)
        self.name = name
        self.global_optima = np.array([
            [3.0, 2.0], [-2.805118, 3.131312],
            [-3.779310, -3.283186], [3.584428, -1.848126],
        ]) if name == "Himmelblau" else np.zeros((1, 2))

    def evaluate(self, x: np.ndarray) -> float:
        x = np.asarray(x, dtype=float)
        if self.name == "Himmelblau":
            return float((x[0]**2 + x[1] - 11)**2 + (x[0] + x[1]**2 - 7)**2)
        return float(10 * self.d + np.sum(x*x - 10*np.cos(2*np.pi*x)))


@contextmanager
def seeded(seed: int):
    """Isolate the legacy solver's global RNG, also on exceptions."""
    state = np.random.get_state()
    try:
        np.random.seed(seed)
        yield
    finally:
        np.random.set_state(state)


def run_seeded(problem, params, n: int, t_max: int, seed: int) -> dict:
    if n < 1 or t_max < 0:
        raise ValueError("n >= 1 and t_max >= 0 required")
    with seeded(seed):
        # Reconstruct t=0 using precisely the same RNG and ranking as TV5.
        ns, light = init_population(n, problem)
        ns, light, best, fb = rank_fireflies(ns, light)
        initial = dict(t=0, alpha=params.alpha0, positions=ns.tolist(),
                       fitness=light.tolist(), nbest=best.tolist(), fbest=fb)
        np.random.seed(seed)
        result = FireflySolver(problem, params, n_fireflies=n).run(t_max=t_max)
    result["initial"] = initial
    return result


def detect_subswarms(positions, fitness, eps: float = 0.6,
                     min_size: int = 3) -> dict:
    """Euclidean radius graph components; small components are noise (-1).

    Fixed eps across gamma avoids confusing visibility radius with detection.
    Components can chain; a cluster is not evidence of a stationary point.
    """
    pos, fit = np.asarray(positions, float), np.asarray(fitness, float)
    if pos.ndim != 2 or fit.shape != (len(pos),) or eps <= 0 or min_size < 1:
        raise ValueError("Invalid positions, fitness or clustering settings")
    distance = np.linalg.norm(pos[:, None] - pos[None, :], axis=-1)
    seen, labels, clusters = set(), [-1] * len(pos), []
    for start in range(len(pos)):
        if start in seen:
            continue
        seen.add(start)
        stack, members = [start], []
        while stack:
            i = stack.pop()
            members.append(i)
            for j in np.flatnonzero(distance[i] <= eps):
                j = int(j)
                if j not in seen:
                    seen.add(j)
                    stack.append(j)
        if len(members) < min_size:
            continue
        members.sort()
        best = members[int(np.argmin(fit[members]))]
        for i in members:
            labels[i] = len(clusters)
        clusters.append(dict(size=len(members), indices=members,
                             center=pos[members].mean(axis=0).tolist(),
                             nbest=pos[best].tolist(), fbest=float(fit[best])))
    return dict(labels=labels, clusters=clusters,
                n_clusters=len(clusters), noise_count=labels.count(-1))


def population_metrics(positions, fitness, problem, eps=0.6, min_size=3) -> dict:
    pos = np.asarray(positions, float)
    distances = np.linalg.norm(pos[:, None] - pos[None, :], axis=-1)
    pairs = distances[np.triu_indices(len(pos), k=1)]
    clustering = detect_subswarms(pos, fitness, eps, min_size)
    # Count each reference optimum once, requiring both proximity and cost.
    hits = np.linalg.norm(pos[:, None] - problem.global_optima[None, :], axis=-1) <= 0.3
    hits &= np.asarray(fitness)[:, None] <= 1e-2
    p = (np.array([c["size"] for c in clustering["clusters"]], float) / len(pos))
    entropy = float(-np.sum(p * np.log(p)))
    return dict(dispersion=float(pairs.mean()) if len(pairs) else 0.0,
                normalized_radius=float(np.sqrt(np.mean(np.sum(
                    ((pos - pos.mean(axis=0)) / problem.scale)**2, axis=1)))),
                cluster_entropy=entropy,
                global_optima_found=int(np.any(hits, axis=0).sum()), **clustering)


def run_multimodal_experiment(*, gammas=(1e-5, 0.01, 0.1, 1.0, 5.0),
                             seeds=(0, 1, 2), n=40, t_max=180) -> dict:
    if not gammas or not seeds or any(not np.isfinite(g) or g < 0 for g in gammas):
        raise ValueError("Nonempty seeds and finite nonnegative gammas required")
    runs, summaries = [], []
    for name in ("Himmelblau", "Rastrigin"):
        problem = MultimodalProblem(name)
        for gamma in gammas:
            group = []
            for seed in seeds:
                result = run_seeded(problem, FAParameters(
                    alpha0=0.05, gamma=gamma, theta=0.97), n, t_max, seed)
                history = [result["initial"], *result["history"]]
                metrics = [dict(t=h["t"], **population_metrics(
                    h["positions"], h["fitness"], problem)) for h in history]
                final = history[-1]
                run = dict(function_name=name, bounds=[float(problem.Lb[0]), float(problem.Ub[0])],
                           global_optima=problem.global_optima.tolist(), gamma=float(gamma),
                           seed=int(seed), n=n, t_max=t_max, alpha0=0.05, theta=0.97,
                           beta0=1.0, final_positions=final["positions"],
                           final_fitness=final["fitness"], fbest=float(result["fbest"]),
                           nbest=result["nbest"].tolist(), history=history, metrics=metrics)
                runs.append(run)
                group.append(run)
            summary = dict(function_name=name, gamma=float(gamma), repetitions=len(seeds))
            for key in ("dispersion", "normalized_radius", "n_clusters", "noise_count",
                        "global_optima_found", "cluster_entropy"):
                values = [r["metrics"][-1][key] for r in group]
                summary[key + "_mean"] = float(np.mean(values))
                summary[key + "_std"] = float(np.std(values, ddof=1)) if len(values) > 1 else 0.0
            summary["fbest_mean"] = float(np.mean([r["fbest"] for r in group]))
            summaries.append(summary)
            print(f"[TV10] {name}, gamma={gamma}: modes={summary['global_optima_found_mean']:.2f}, "
                  f"clusters={summary['n_clusters_mean']:.2f}", flush=True)
    # Keep the original TV11 schema at top level; additive keys expose all runs.
    representative = next((r for r in runs if r["function_name"] == "Himmelblau"
                           and r["gamma"] == 1.0), runs[0])
    return dict(**representative, runs=runs, gamma_summary=summaries,
                methodology=dict(cluster_eps=0.6, min_cluster_size=3,
                    optimum_distance_tolerance=0.3, optimum_fitness_tolerance=0.01,
                    entropy="-sum(p log p); p=cluster size/n; noise excluded",
                    note="Post-processing only; gamma very large may yield random walks, not optima."))


class CountingProblem(UnconstrainedProblem):
    def __init__(self, d=5):
        super().__init__(d=d)
        self.evaluations = 0

    def evaluate(self, x):
        self.evaluations += 1
        return super().evaluate(x)


def exp_complexity(*, sizes=(10, 20, 40, 80, 160), seeds=(0, 1, 2), t_max=8) -> dict:
    if len(sizes) < 2 or len(set(sizes)) != len(sizes) or min(sizes) < 1 or not seeds or t_max < 1:
        raise ValueError("Need distinct positive sizes, seeds and t_max >= 1")
    # Warm up imports and numeric code, excluded from measurements.
    with seeded(0):
        FireflySolver(CountingProblem(), FAParameters(), 5).run(1)
    rows = []
    for n in sizes:
        for seed in seeds:
            problem = CountingProblem()
            with seeded(seed):
                solver = FireflySolver(problem, FAParameters(), n)
                start = time.perf_counter()
                solver.run(t_max)
                elapsed = time.perf_counter() - start
            rows.append(dict(n=n, d=5, seed=seed, t_max=t_max,
                             runtime_ms=elapsed*1000, ms_per_generation=elapsed*1000/t_max,
                             pair_checks_per_generation=n*n, objective_evaluations=problem.evaluations))
    summary = [dict(n=n, median_ms_per_generation=float(np.median([
        r["ms_per_generation"] for r in rows if r["n"] == n]))) for n in sizes]
    slope = float(np.polyfit(np.log(sizes), np.log([
        r["median_ms_per_generation"] for r in summary]), 1)[0])
    return dict(runs=rows, summary=summary, log_log_slope=slope,
                timing_scope="Full TV5 run incl. initialization, ranking, history; divided by t_max",
                pair_count_source="Derived exactly from TV5's two range(n) loops, including i=j",
                complexity="O(t_max * n^2 * (d + objective_cost)); O(n^2) per generation for fixed d/cost")


def hybrid_local_search(problem, x, *, seed=0, steps=200, step0=0.05) -> dict:
    """Demo Hybrid FA + shrinking Gaussian local search, with actual budgets."""
    if steps < 0 or step0 < 0:
        raise ValueError("steps and step0 must be nonnegative")
    rng = np.random.default_rng(seed)
    best = np.asarray(x, float).copy()
    fb = problem.evaluate(best)
    history = [dict(evaluations=1, fbest=fb, nbest=best.tolist())]
    for k in range(steps):
        step = step0 * 0.98**k * problem.scale
        candidate = np.clip(best + rng.normal(size=problem.d)*step, problem.Lb, problem.Ub)
        fc = problem.evaluate(candidate)
        if fc < fb:
            best, fb = candidate, fc
        history.append(dict(evaluations=k+2, fbest=fb, nbest=best.tolist()))
    return dict(nbest=best.tolist(), fbest=fb, evaluations=steps+1, history=history)


def exp_alpha_comparison(*, seeds=(0, 1, 2, 3, 4), n=20, t_max=120,
                         local_steps=200, target=1e-3) -> dict:
    if not seeds or t_max < 1 or n < 1:
        raise ValueError("Nonempty seeds, n >= 1 and t_max >= 1 required")
    runs, hybrids = [], []
    for seed in seeds:
        for mode, theta in (("fixed", 1.0), ("decaying", 0.97)):
            problem = CountingProblem()
            result = run_seeded(problem, FAParameters(alpha0=0.5, gamma=0.1,
                                theta=theta), n, t_max, seed)
            # t=0 reconstruction adds n evaluations outside the actual solve.
            evaluations = problem.evaluations - n
            history = [result["initial"], *result["history"]]
            curve = [h["fbest"] for h in history]
            runs.append(dict(mode=mode, seed=seed, alpha0=0.5, theta=theta,
                             curve=curve, alpha_curve=[h["alpha"] for h in history],
                             evaluations=evaluations, fbest=float(result["fbest"]),
                             first_target_t=next((i for i, f in enumerate(curve) if f <= target), None)))
            if mode == "decaying":
                local = hybrid_local_search(problem, result["nbest"], seed=seed, steps=local_steps)
                hybrids.append(dict(seed=seed, fa_fbest=float(result["fbest"]),
                                    total_evaluations=evaluations+local["evaluations"], **local))
    return dict(runs=runs, hybrid_runs=hybrids, target=target, n=n, d=5, t_max=t_max,
                note="Geometric decay is a predetermined schedule, not feedback self-adaptation. "
                     "Hybrid adds local evaluations; it is not an equal-budget speed comparison.",
                summary=[dict(mode=mode, fbest_mean=float(np.mean([r["fbest"] for r in runs if r["mode"] == mode])),
                              target_success_rate=float(np.mean([r["first_target_t"] is not None for r in runs if r["mode"] == mode])))
                         for mode in ("fixed", "decaying")])

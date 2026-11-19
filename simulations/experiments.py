from __future__ import annotations
import time
import numpy as np
from core.engine import FireflySolver
from core.parameters import FAParameters
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
    """Input: Không có (khảo sát độ nhạy tham số gamma và theta).
    Output mẫu: {
        "gamma_sweep": [{"gamma": float, "fbest": float, "curve": list[float]}],
        "theta_sweep": [{"theta": float, "fbest": float, "curve": list[float]}],
    }
    """
    raise NotImplementedError("TODO: Phụ trách bởi TV9")


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
    raise NotImplementedError("TODO: Phụ trách bởi TV10")

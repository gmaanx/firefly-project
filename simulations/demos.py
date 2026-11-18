from __future__ import annotations

import numpy as np

from core.engine import FireflySolver, move_firefly_pair
from core.parameters import FAParameters
from core.population import find_limits
from core.problems import ConstrainedProblem, UnconstrainedProblem


def run_worked_example_13_5() -> dict:
    """Input: Không có (5 đom đóm, D = 3 theo Mục 13.5).
    Output mẫu: {
        "initial_population": [{"id": int, "pos": list[float], "f": float}],
        "pair_logs": [
            {
                "pair": str,
                "r_ij": float,
                "beta": float,
                "new_pos": list[float],
                "f_new": float,
                "accepted": bool,
            }
        ],
        "nbest": list[float],
        "fbest": float,
    }
    """
    # 1. Khởi tạo bài toán 3D theo Eq. 13.10: f(x) = sum((x_i - 1)^2), Lb = -5, Ub = 5
    problem = UnconstrainedProblem(d=3, lb=-5.0, ub=5.0)

    # 2. Khởi tạo tham số thuật toán theo Eq. 13.10
    params = FAParameters(alpha0=1.0, beta0=1.0, gamma=0.1, theta=0.97)

    # 3. Tọa độ 5 đom đóm ban đầu theo Eq. 13.11
    initial_positions = [
        [2.0, 2.0, 3.0],    # x1: f(x1) = 6.00
        [5.0, 0.0, 5.0],    # x2: f(x2) = 33.00
        [-3.0, -2.0, 0.0],  # x3: f(x3) = 26.00
        [-5.0, 0.0, 5.0],   # x4: f(x4) = 53.00
        [3.0, 4.0, 5.0],    # x5: f(x5) = 29.00
    ]

    pop_positions = [np.array(pos, dtype=float) for pos in initial_positions]
    pop_fitness = [problem.evaluate(pos) for pos in pop_positions]

    initial_population = [
        {
            "id": i + 1,
            "pos": [float(coord) for coord in pop_positions[i]],
            "f": float(pop_fitness[i]),
        }
        for i in range(len(pop_positions))
    ]

    # 4. Giảm hệ số ngẫu nhiên alpha tại thế hệ t = 1: alpha = alpha0 * theta = 0.97
    params.update_alpha(params.alpha)

    # Đơn vị scale = np.ones(d) để bước ngẫu nhiên khớp với alpha * eps_i^t (Eq. 13.14 & Eq. 13.18)
    unit_scale = np.ones(problem.d, dtype=float)

    # 5. Di chuyển cặp x2 -> x1 với epsilon_2 = [-0.5, 0.4, 0.1]
    eps_2 = np.array([-0.5, 0.4, 0.1], dtype=float)
    res_21 = move_firefly_pair(
        xi=pop_positions[1],
        xj=pop_positions[0],
        light_i=pop_fitness[1],
        light_j=pop_fitness[0],
        params=params,
        scale=unit_scale,
        custom_eps=eps_2,
    )
    new_pos_2 = find_limits(res_21["new_pos"], problem.Lb, problem.Ub)
    f_new_2 = problem.evaluate(new_pos_2)
    # Cơ chế chấp nhận tham lam (greedy acceptance)
    accepted_2 = bool(f_new_2 < pop_fitness[1])
    if accepted_2:
        pop_positions[1] = new_pos_2
        pop_fitness[1] = f_new_2

    # 6. Di chuyển cặp x3 -> x1 với epsilon_3 = [-0.2, 0.1, -0.5]
    eps_3 = np.array([-0.2, 0.1, -0.5], dtype=float)
    res_31 = move_firefly_pair(
        xi=pop_positions[2],
        xj=pop_positions[0],
        light_i=pop_fitness[2],
        light_j=pop_fitness[0],
        params=params,
        scale=unit_scale,
        custom_eps=eps_3,
    )
    new_pos_3 = find_limits(res_31["new_pos"], problem.Lb, problem.Ub)
    f_new_3 = problem.evaluate(new_pos_3)
    # Cơ chế chấp nhận tham lam (greedy acceptance)
    accepted_3 = bool(f_new_3 < pop_fitness[2])
    if accepted_3:
        pop_positions[2] = new_pos_3
        pop_fitness[2] = f_new_3

    pair_logs = [
        {
            "pair": "x2 -> x1",
            "r_ij": float(res_21["r_ij"]),
            "beta": float(res_21["beta"]),
            "new_pos": [float(val) for val in new_pos_2],
            "f_new": float(f_new_2),
            "accepted": accepted_2,
        },
        {
            "pair": "x3 -> x1",
            "r_ij": float(res_31["r_ij"]),
            "beta": float(res_31["beta"]),
            "new_pos": [float(val) for val in new_pos_3],
            "f_new": float(f_new_3),
            "accepted": accepted_3,
        },
    ]

    # 7. Xác định đom đóm tốt nhất (nbest, fbest)
    best_idx = int(np.argmin(pop_fitness))
    nbest = [float(val) for val in pop_positions[best_idx]]
    fbest = float(pop_fitness[best_idx])

    return {
        "initial_population": initial_population,
        "pair_logs": pair_logs,
        "nbest": nbest,
        "fbest": fbest,
    }


def run_constrained_demo() -> dict:
    """Input: Không có (mô phỏng bài toán có ràng buộc với ConstrainedProblem).
    Output mẫu: {
        "penalty_lambda": float,
        "nbest": list[float],
        "fbest_penalized": float,
        "fbest_objective": float,
        "is_feasible": bool,
        "history": [{"t": int, "fbest": float, "nbest": list[float]}],
    }
    """
    d = 3
    penalty_lambda = 1e3
    problem = ConstrainedProblem(d=d, lb=-5.0, ub=5.0, penalty_lambda=penalty_lambda)
    params = FAParameters(alpha0=1.0, beta0=1.0, gamma=1.0 / (10.0**2), theta=0.97)

    # Cố định seed để kết quả tái lập được khi TV10 xuất JSON
    np.random.seed(42)
    solver = FireflySolver(problem=problem, params=params, n_fireflies=25)
    result = solver.run(t_max=300)

    nbest = np.asarray(result["nbest"], dtype=float)
    history = [
        {
            "t": int(h["t"]),
            "fbest": float(h["fbest"]),
            "nbest": [float(v) for v in h["nbest"]],
        }
        for h in result["history"]
    ]

    return {
        "penalty_lambda": float(penalty_lambda),
        "nbest": [float(v) for v in nbest],
        "fbest_penalized": float(result["fbest"]),
        "fbest_objective": float(problem.objective(nbest)),
        "is_feasible": problem.is_feasible(nbest),
        "history": history,
    }

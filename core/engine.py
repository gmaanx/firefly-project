from __future__ import annotations

import numpy as np

from core.parameters import FAParameters
from core.problems import UnconstrainedProblem


def move_firefly_pair(
    xi: np.ndarray,
    xj: np.ndarray,
    light_i: float,
    light_j: float,
    params: FAParameters,
    scale: np.ndarray,
    custom_eps: np.ndarray | None = None,
) -> dict:
    """Input: xi (d,), xj (d,), light_i (float), light_j (float), params (FAParameters), scale (d,), custom_eps ((d,) | None).
    Output mẫu: {
        "new_pos": np.ndarray (d,),
        "r_ij": float,
        "beta": float,
        "attraction_step": np.ndarray (d,),
        "random_step": np.ndarray (d,),
    }
    """
    xi_arr = np.asarray(xi, dtype=float)
    xj_arr = np.asarray(xj, dtype=float)
    scale_arr = np.asarray(scale, dtype=float)

    if xi_arr.shape != xj_arr.shape:
        raise ValueError(f"Shape mismatch: xi {xi_arr.shape} vs xj {xj_arr.shape}")
    if scale_arr.shape != xi_arr.shape:
        raise ValueError(f"Shape mismatch: scale {scale_arr.shape} vs xi {xi_arr.shape}")

    d = xi_arr.shape[0]

    r_ij = params.calc_distance(xi_arr, xj_arr)
    beta = params.calc_attractiveness(r_ij)

    if float(light_j) < float(light_i):
        attraction_step = beta * (xj_arr - xi_arr)

        if custom_eps is not None:
            eps = np.asarray(custom_eps, dtype=float)
            if eps.shape != xi_arr.shape:
                raise ValueError(
                    f"Shape mismatch: custom_eps {eps.shape} vs xi {xi_arr.shape}"
                )
        else:
            eps = np.random.uniform(-0.5, 0.5, size=d)

        random_step = params.alpha * scale_arr * eps

        new_pos = xi_arr + attraction_step + random_step
    else:
        attraction_step = np.zeros(d, dtype=float)
        random_step = np.zeros(d, dtype=float)
        new_pos = xi_arr.copy()

    return {
        "new_pos": new_pos,
        "r_ij": float(r_ij),
        "beta": float(beta),
        "attraction_step": attraction_step,
        "random_step": random_step,
    }


class FireflySolver:
    problem: UnconstrainedProblem
    params: FAParameters
    n_fireflies: int

    def __init__(
        self,
        problem: UnconstrainedProblem,
        params: FAParameters,
        n_fireflies: int = 20,
    ) -> None:
        """Input: problem (UnconstrainedProblem), params (FAParameters), n_fireflies (int).
        Output: Khởi tạo self.problem, self.params, self.n_fireflies.
        """
        self.problem = problem
        self.params = params
        self.n_fireflies = int(n_fireflies)

    def run(self, t_max: int = 500) -> dict:
        """Input: t_max (int).
        Output mẫu: {
            "nbest": np.ndarray (d,),
            "fbest": float,
            "history": [
                {
                    "t": int,
                    "alpha": float,
                    "nbest": list[float],
                    "fbest": float,
                    "positions": list[list[float]],
                    "fitness": list[float],
                }
            ],
        }
        """
        from core.population import init_population, find_limits, rank_fireflies

        # 1. Khởi tạo quần thể ban đầu và tính độ sáng
        ns, lightn = init_population(self.n_fireflies, self.problem)

        # 2. Xếp hạng ban đầu để xác định nbest, fbest
        ns, lightn, nbest, fbest = rank_fireflies(ns, lightn)

        history: list[dict] = []

        # 3. Vòng lặp chính qua các thế hệ t = 1 -> t_max
        for t in range(1, int(t_max) + 1):
            # Giảm hệ số ngẫu nhiên alpha ở đầu mỗi thế hệ
            self.params.update_alpha(self.params.alpha)

            # Hai vòng lặp lồng nhau duyệt qua toàn bộ cặp đom đóm
            for i in range(self.n_fireflies):
                for j in range(self.n_fireflies):
                    if lightn[j] < lightn[i]:
                        move_res = move_firefly_pair(
                            xi=ns[i],
                            xj=ns[j],
                            light_i=lightn[i],
                            light_j=lightn[j],
                            params=self.params,
                            scale=self.problem.scale,
                        )
                        # Kẹp biên vị trí mới trong miền [Lb, Ub]
                        new_pos = find_limits(
                            move_res["new_pos"], self.problem.Lb, self.problem.Ub
                        )
                        ns[i] = new_pos
                        lightn[i] = self.problem.evaluate(new_pos)

            # Xếp hạng lại đàn đom đóm sau thế hệ t
            ns, lightn, nbest, fbest = rank_fireflies(ns, lightn)

            # Lưu lại lịch sử thế hệ t
            history.append(
                {
                    "t": int(t),
                    "alpha": float(self.params.alpha),
                    "nbest": [float(val) for val in nbest],
                    "fbest": float(fbest),
                    "positions": [row.tolist() for row in ns],
                    "fitness": [float(val) for val in lightn],
                }
            )

        return {
            "nbest": nbest,
            "fbest": float(fbest),
            "history": history,
        }

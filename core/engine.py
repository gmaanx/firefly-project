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
    raise NotImplementedError("TODO: Phụ trách bởi TV4")


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
        raise NotImplementedError("TODO: Phụ trách bởi TV5")

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
        raise NotImplementedError("TODO: Phụ trách bởi TV5")

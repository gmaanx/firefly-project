from __future__ import annotations

import numpy as np

from core.problems import UnconstrainedProblem


def init_population(
    n: int,
    problem: UnconstrainedProblem,
) -> tuple[np.ndarray, np.ndarray]:
    """Input: n (int), problem (UnconstrainedProblem).
    Output mẫu: (ns: np.ndarray shape=(n, d), Lightn: np.ndarray shape=(n,)).
    """
    raise NotImplementedError("TODO: Phụ trách bởi TV3")


def find_limits(
    ns: np.ndarray,
    lb: np.ndarray,
    ub: np.ndarray,
) -> np.ndarray:
    """Input: ns (np.ndarray, shape=(n, d) hoặc (d,)), lb (shape=(d,)), ub (shape=(d,)).
    Output: Mảng tọa độ đã kẹp biên trong [Lb, Ub] (np.ndarray cùng shape với ns).
    """
    raise NotImplementedError("TODO: Phụ trách bởi TV3")


def rank_fireflies(
    ns: np.ndarray,
    lightn: np.ndarray,
) -> tuple[np.ndarray, np.ndarray, np.ndarray, float]:
    """Input: ns (np.ndarray, shape=(n, d)), lightn (np.ndarray, shape=(n,)).
    Output mẫu: (
        sorted_ns: np.ndarray shape=(n, d),
        sorted_lightn: np.ndarray shape=(n,),
        nbest: np.ndarray shape=(d,),
        fbest: float,
    ).
    """
    raise NotImplementedError("TODO: Phụ trách bởi TV3")

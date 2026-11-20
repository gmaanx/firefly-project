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
    d = problem.d
    Lb = np.asarray(problem.Lb, dtype=float)
    Ub = np.asarray(problem.Ub, dtype=float)

    ns = Lb + (Ub - Lb) * np.random.rand(n, d)

    Lightn = np.zeros(n, dtype=float)
    for i in range(n):
        Lightn[i] = problem.evaluate(ns[i])

    return ns, Lightn


def find_limits(
    ns: np.ndarray,
    lb: np.ndarray,
    ub: np.ndarray,
) -> np.ndarray:
    """Input: ns (np.ndarray, shape=(n, d) hoặc (d,)), lb (shape=(d,)), ub (shape=(d,)).
    Output: Mảng tọa độ đã kẹp biên trong [Lb, Ub] (np.ndarray cùng shape với ns).
    """
    Lb = np.asarray(lb, dtype=float)
    Ub = np.asarray(ub, dtype=float)

    ns_clipped = np.clip(ns, Lb, Ub)

    return ns_clipped


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
    sorted_indices = np.argsort(lightn)

    Lightn_sorted = lightn[sorted_indices]
    ns_sorted = ns[sorted_indices]

    fbest = float(Lightn_sorted[0])
    nbest = ns_sorted[0].copy()

    return ns_sorted, Lightn_sorted, nbest, fbest

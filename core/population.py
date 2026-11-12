import numpy as np


def init_population(n, problem):
    d = problem.d
    Lb = np.asarray(problem.Lb, dtype=float)
    Ub = np.asarray(problem.Ub, dtype=float)

    ns = Lb + (Ub - Lb) * np.random.rand(n, d)

    Lightn = np.zeros(n, dtype=float)
    for i in range(n):
        Lightn[i] = problem.evaluate(ns[i])

    return ns, Lightn


def find_limits(ns, Lb, Ub):
    
    Lb = np.asarray(Lb, dtype=float)
    Ub = np.asarray(Ub, dtype=float)

    ns_clipped = np.clip(ns, Lb, Ub)

    return ns_clipped


def rank_fireflies(ns, Lightn):
    sorted_indices = np.argsort(Lightn)

    Lightn_sorted = Lightn[sorted_indices]
    ns_sorted = ns[sorted_indices]

    fbest = float(Lightn_sorted[0])
    nbest = ns_sorted[0].copy()

    return ns_sorted, Lightn_sorted, nbest, fbest
from __future__ import annotations


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
    raise NotImplementedError("TODO: Phụ trách bởi TV6")


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
    raise NotImplementedError("TODO: Phụ trách bởi TV7")

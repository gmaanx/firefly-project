from __future__ import annotations


def exp_convergence_benchmark() -> dict:
    """Input: Không có (khảo sát tại t = 100, 200, 500 và quy mô (n, D)).
    Output mẫu: {
        "by_iterations": [
            {"t_max": int, "fbest": float, "nbest": list[float], "curve": list[float]}
        ],
        "by_scale": [
            {"n": int, "d": int, "fbest_mean": float, "fbest_std": float, "runtime_ms": float}
        ],
    }
    """
    raise NotImplementedError("TODO: Phụ trách bởi TV8")


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

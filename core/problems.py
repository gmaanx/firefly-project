from __future__ import annotations

import numpy as np


class UnconstrainedProblem:
    d: int
    Lb: np.ndarray
    Ub: np.ndarray
    scale: np.ndarray

    def __init__(self, d: int = 10, lb: float = -5.0, ub: float = 5.0) -> None:
        """Input: d (int), lb (float), ub (float).
        Output: Khởi tạo self.d, self.Lb (d,), self.Ub (d,), self.scale (d,).
        """
        self.d = d
        # Khởi tạo vector cận dưới nhân rộng ra d chiều
        self.Lb = lb * np.ones(d, dtype=float)
        # Khởi tạo vector cận trên nhân rộng ra d chiều
        self.Ub = ub * np.ones(d, dtype=float)
        # Tính độ rộng miền tìm kiếm theo tài liệu Firefly Algorithm
        self.scale = np.abs(self.Ub - self.Lb)

    def evaluate(self, x: np.ndarray) -> float:
        """Input: x (np.ndarray, shape=(d,)).
        Output: Giá trị hàm mục tiêu cost f(x) (float).
        """
        # Hàm mục tiêu chuẩn Sphere function: f(x) = sum((x_i - 1)^2)
        # Nghiệm tối ưu lý thuyết là x = [1, 1, ..., 1]
        x = np.asarray(x, dtype=float)
        return float(np.sum((x - 1.0) ** 2))


class ConstrainedProblem(UnconstrainedProblem):
    penalty_lambda: float

    def __init__(
        self,
        d: int,
        lb: float,
        ub: float,
        penalty_lambda: float = 1e5,
    ) -> None:
        """Input: d (int), lb (float), ub (float), penalty_lambda (float).
        Output: Khởi tạo miền tìm kiếm (Lb, Ub, scale) và self.penalty_lambda.
        """
        raise NotImplementedError("TODO: Phụ trách bởi TV7")

    def equality_constraints(self, x: np.ndarray) -> np.ndarray:
        """Input: x (np.ndarray, shape=(d,)).
        Output: Vector ràng buộc đẳng thức phi(x) (np.ndarray, shape=(p,)) với phi_i(x) = 0.
        """
        raise NotImplementedError("TODO: Phụ trách bởi TV7")

    def inequality_constraints(self, x: np.ndarray) -> np.ndarray:
        """Input: x (np.ndarray, shape=(d,)).
        Output: Vector ràng buộc bất đẳng thức psi(x) (np.ndarray, shape=(q,)) với psi_j(x) <= 0.
        """
        raise NotImplementedError("TODO: Phụ trách bởi TV7")

    def penalty(self, x: np.ndarray) -> float:
        """Input: x (np.ndarray, shape=(d,)).
        Output: Giá trị hàm phạt tĩnh P(x) (float >= 0).
        """
        raise NotImplementedError("TODO: Phụ trách bởi TV7")

    def evaluate(self, x: np.ndarray) -> float:
        """Input: x (np.ndarray, shape=(d,)).
        Output: Giá trị hàm mục tiêu biến đổi Pi(x) = f(x) + P(x) (float).
        """
        raise NotImplementedError("TODO: Phụ trách bởi TV7")

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
    """Bài toán có ràng buộc, đưa về không ràng buộc bằng hàm phạt tĩnh (Mục 13.6).

    Dạng tổng quát (Eq. 13.20-13.22):
        min f(x)  với  phi_i(x) = 0 (i = 1..M)  và  psi_j(x) <= 0 (j = 1..N)
    Hàm mục tiêu biến đổi (Eq. 13.23-13.24):
        Pi(x) = f(x) + P(x)
        P(x)  = lambda * sum_i phi_i(x)^2 + lambda * sum_j [max(0, psi_j(x))]^2

    Bài toán mẫu mặc định (mọi d >= 2), nghiệm tối ưu có ràng buộc đã biết:
        phi(x) = sum(x) - d/2 = 0      (ràng buộc đẳng thức)
        psi(x) = x_1 - 0.4  <= 0       (ràng buộc bất đẳng thức)
    Cực tiểu hóa f(x) = sum((x_i - 1)^2) dưới hai ràng buộc này cho
        x* = [0.4, (d/2 - 0.4)/(d-1), ..., (d/2 - 0.4)/(d-1)]
    """

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
        if d < 2:
            raise ValueError("d must be >= 2 for the default constraints")
        if penalty_lambda <= 0:
            raise ValueError("penalty_lambda must be positive (lambda > 0)")
        super().__init__(d=d, lb=lb, ub=ub)
        self.penalty_lambda = float(penalty_lambda)

    def objective(self, x: np.ndarray) -> float:
        """Hàm mục tiêu gốc f(x) (chưa cộng phạt), dùng để báo cáo fbest_objective."""
        return super().evaluate(x)

    def equality_constraints(self, x: np.ndarray) -> np.ndarray:
        """Input: x (np.ndarray, shape=(d,)).
        Output: Vector ràng buộc đẳng thức phi(x) (np.ndarray, shape=(p,)) với phi_i(x) = 0.
        """
        x = np.asarray(x, dtype=float)
        return np.array([np.sum(x) - self.d / 2.0], dtype=float)

    def inequality_constraints(self, x: np.ndarray) -> np.ndarray:
        """Input: x (np.ndarray, shape=(d,)).
        Output: Vector ràng buộc bất đẳng thức psi(x) (np.ndarray, shape=(q,)) với psi_j(x) <= 0.
        """
        x = np.asarray(x, dtype=float)
        return np.array([x[0] - 0.4], dtype=float)

    def penalty(self, x: np.ndarray) -> float:
        """Input: x (np.ndarray, shape=(d,)).
        Output: Giá trị hàm phạt tĩnh P(x) (float >= 0).
        """
        phi = self.equality_constraints(x)
        psi = self.inequality_constraints(x)
        # Eq. 13.24: lambda * phi^2 + lambda * [max(0, psi)]^2
        return float(
            self.penalty_lambda
            * (np.sum(phi**2) + np.sum(np.maximum(0.0, psi) ** 2))
        )

    def evaluate(self, x: np.ndarray) -> float:
        """Input: x (np.ndarray, shape=(d,)).
        Output: Giá trị hàm mục tiêu biến đổi Pi(x) = f(x) + P(x) (float).
        """
        return self.objective(x) + self.penalty(x)

    def is_feasible(self, x: np.ndarray, tol: float = 1e-2) -> bool:
        """True nếu |phi_i(x)| <= tol và psi_j(x) <= tol với mọi i, j."""
        phi = self.equality_constraints(x)
        psi = self.inequality_constraints(x)
        return bool(np.all(np.abs(phi) <= tol) and np.all(psi <= tol))

from __future__ import annotations

import numpy as np


class FAParameters:
    alpha0: float
    alpha: float
    beta0: float
    gamma: float
    theta: float

    def __init__(
        self,
        alpha0: float = 1.0,
        beta0: float = 1.0,
        gamma: float = 0.1,
        theta: float = 0.97,
    ) -> None:
        """Input: alpha0 (float), beta0 (float), gamma (float), theta (float).
        Output: Khởi tạo self.alpha0, self.alpha, self.beta0, self.gamma, self.theta.
        """
        self.alpha0 = float(alpha0)
        self.alpha = float(alpha0)
        self.beta0 = float(beta0)
        self.gamma = float(gamma)
        self.theta = float(theta)

    def calc_distance(self, xi: np.ndarray, xj: np.ndarray) -> float:
        """Input: xi (np.ndarray, shape=(d,)), xj (np.ndarray, shape=(d,)).
        Output: Khoảng cách Euclid r_ij (float >= 0).
        """
        xi_arr = np.asarray(xi, dtype=float)
        xj_arr = np.asarray(xj, dtype=float)
        return float(np.sqrt(np.sum((xi_arr - xj_arr) ** 2)))

    def calc_attractiveness(self, r: float) -> float:
        """Input: r (float).
        Output: Độ hấp dẫn beta (float).
        """
        return float(self.beta0 * np.exp(-self.gamma * (float(r) ** 2)))

    def update_alpha(self, current_alpha: float) -> float:
        """Input: current_alpha (float).
        Output: Hệ số ngẫu nhiên mới sau khi giảm alpha (float).
        """
        self.alpha = float(current_alpha) * self.theta
        return self.alpha
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
        raise NotImplementedError("TODO: Phụ trách bởi TV2")

    def calc_distance(self, xi: np.ndarray, xj: np.ndarray) -> float:
        """Input: xi (np.ndarray, shape=(d,)), xj (np.ndarray, shape=(d,)).
        Output: Khoảng cách Euclid r_ij (float >= 0).
        """
        raise NotImplementedError("TODO: Phụ trách bởi TV2")

    def calc_attractiveness(self, r: float) -> float:
        """Input: r (float).
        Output: Độ hấp dẫn beta (float).
        """
        raise NotImplementedError("TODO: Phụ trách bởi TV2")

    def update_alpha(self, current_alpha: float) -> float:
        """Input: current_alpha (float).
        Output: Hệ số ngẫu nhiên mới sau khi giảm alpha (float).
        """
        raise NotImplementedError("TODO: Phụ trách bởi TV2")

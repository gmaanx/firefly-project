from __future__ import annotations

from pathlib import Path

EXPORT_DIR: Path = Path(__file__).resolve().parent / "data_exports"

EXPECTED_JSON_FILES: tuple[str, ...] = (
    "worked_example_13_5.json",
    "constrained_demo.json",
    "convergence_iterations.json",
    "scalability_nd.json",
    "parameter_sensitivity.json",
    "multimodal_optimization.json",
)


def export_all_to_json(output_dir: Path | str = EXPORT_DIR) -> dict[str, str]:
    """Input: output_dir (Path | str, mặc định là thư mục data_exports/).
    Output mẫu: {
        "worked_example_13_5": "data_exports/worked_example_13_5.json",
        "constrained_demo": "data_exports/constrained_demo.json",
        "convergence_iterations": "data_exports/convergence_iterations.json",
        "scalability_nd": "data_exports/scalability_nd.json",
        "parameter_sensitivity": "data_exports/parameter_sensitivity.json",
        "multimodal_optimization": "data_exports/multimodal_optimization.json",
    }
    """
    raise NotImplementedError("TODO: Phụ trách bởi TV10")


if __name__ == "__main__":
    export_all_to_json()

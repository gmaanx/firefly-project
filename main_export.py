from __future__ import annotations

from pathlib import Path
import json
import numpy as np

from simulations.demos import run_constrained_demo, run_worked_example_13_5
from simulations.experiments import (
    exp_alpha_comparison,
    exp_complexity,
    exp_convergence_benchmark,
    exp_multimodal_optimization,
    exp_parameter_sensitivity,
)

EXPORT_DIR: Path = Path(__file__).resolve().parent / "data_exports"

EXPECTED_JSON_FILES: tuple[str, ...] = (
    "worked_example_13_5.json",
    "constrained_demo.json",
    "convergence_iterations.json",
    "scalability_nd.json",
    "parameter_sensitivity.json",
    "multimodal_optimization.json",
    "tv10_complexity.json",
    "tv10_alpha_hybrid.json",
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
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    state = np.random.get_state()
    paths = {}

    def save(name, data):
        path = output_dir / (name + ".json")
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2,
                                   allow_nan=False), encoding="utf-8")
        paths[name] = str(path)
        print(f"[Export] {path}", flush=True)

    try:
        np.random.seed(42)
        save("worked_example_13_5", run_worked_example_13_5())
        save("constrained_demo", run_constrained_demo())
        benchmark = exp_convergence_benchmark()
        save("convergence_iterations", {"by_iterations": benchmark["by_iterations"]})
        save("scalability_nd", {"by_scale": benchmark["by_scale"]})
        np.random.seed(42)
        save("parameter_sensitivity", exp_parameter_sensitivity())
        multimodal = exp_multimodal_optimization()
        save("multimodal_optimization", multimodal)
        # TV10's numerical results are JSON-first. Plot generation is optional
        # and intentionally outside this shared export path.
        save("tv10_complexity", exp_complexity())
        save("tv10_alpha_hybrid", exp_alpha_comparison())
    finally:
        np.random.set_state(state)
    return paths


if __name__ == "__main__":
    export_all_to_json()

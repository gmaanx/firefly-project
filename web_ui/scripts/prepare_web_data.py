from __future__ import annotations

"""Prepare verified, minified JSON datasets for the Firefly Algorithm web presentation.

Reads existing exports under `<repo_root>/data_exports/` when present AND verified
compatible with the current Python solver/demo implementation; otherwise regenerates
from `simulations.demos` and `simulations.experiments` directly without calling
`exp_convergence_benchmark()` twice.

Outputs strictly 8 minified UTF-8 JSON files (`allow_nan=False`) under
`web_ui/public/data/` with total uncompressed size < 3 MB.
"""

import argparse
import json
import math
import sys
from pathlib import Path
from typing import Any, Dict, List, Sequence, Tuple

import numpy as np

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from simulations.demos import run_constrained_demo, run_worked_example_13_5
from simulations.experiments import (
    exp_alpha_comparison,
    exp_complexity,
    exp_convergence_benchmark,
    exp_multimodal_optimization,
    exp_parameter_sensitivity,
)

RAW_EXPORT_DIR = REPO_ROOT / "data_exports"
WEB_DATA_DIR = REPO_ROOT / "web_ui" / "public" / "data"
MAX_BUDGET_BYTES = 3 * 1024 * 1024  # 3 MB uncompressed ceiling

EXPECTED_FILES: Tuple[str, ...] = (
    "worked_example_13_5.json",
    "constrained_demo.json",
    "convergence_iterations.json",
    "scalability_nd.json",
    "parameter_sensitivity.json",
    "multimodal_optimization.json",
    "tv10_complexity.json",
    "tv10_alpha_hybrid.json",
)


def assert_finite_tree(value: Any, path: str = "$") -> None:
    """Recursively ensure no NaN or Infinity exists before serializing."""
    if isinstance(value, float):
        if not math.isfinite(value):
            raise ValueError(f"Non-finite float {value!r} at {path}")
    elif isinstance(value, dict):
        for k, v in value.items():
            assert_finite_tree(v, f"{path}.{k}")
    elif isinstance(value, (list, tuple)):
        for idx, item in enumerate(value):
            assert_finite_tree(item, f"{path}[{idx}]")


def load_raw_json(name: str) -> Any:
    path = RAW_EXPORT_DIR / name
    return json.loads(path.read_text(encoding="utf-8"))


def raw_exports_compatible() -> Tuple[bool, str]:
    """Verify existing data_exports/*.json match current repo code & schemas."""
    for fname in EXPECTED_FILES:
        if not (RAW_EXPORT_DIR / fname).is_file():
            return False, f"Missing {fname} in {RAW_EXPORT_DIR}"

    try:
        raw_13_5 = load_raw_json("worked_example_13_5.json")
        live_13_5 = run_worked_example_13_5()
        if not np.allclose(raw_13_5["fbest"], live_13_5["fbest"], rtol=0, atol=1e-12):
            return False, "worked_example_13_5 fbest mismatch against live code"
        if len(raw_13_5.get("pair_logs", [])) != len(live_13_5["pair_logs"]):
            return False, "worked_example_13_5 pair_logs length mismatch"
        for a, b in zip(raw_13_5["pair_logs"], live_13_5["pair_logs"]):
            if a["pair"] != b["pair"] or a["accepted"] != b["accepted"]:
                return False, f"worked_example_13_5 decision mismatch on {a['pair']}"
            if not np.allclose(a["f_new"], b["f_new"], rtol=0, atol=1e-12):
                return False, f"worked_example_13_5 f_new mismatch on {a['pair']}"

        state = np.random.get_state()
        try:
            raw_const = load_raw_json("constrained_demo.json")
            live_const = run_constrained_demo()
        finally:
            np.random.set_state(state)

        if not np.allclose(
            raw_const["fbest_penalized"], live_const["fbest_penalized"], rtol=0, atol=1e-12
        ):
            return False, "constrained_demo fbest_penalized mismatch against live seed=42 run"

        ps = load_raw_json("parameter_sensitivity.json")
        if len(ps.get("grid", [])) != 15 or len(ps["grid"][0].get("curve", [])) != 500:
            return False, "parameter_sensitivity schema/length mismatch"

        mm = load_raw_json("multimodal_optimization.json")
        if "gamma_summary" not in mm or "methodology" not in mm or "runs" not in mm:
            return False, "multimodal_optimization missing required keys"

        comp = load_raw_json("tv10_complexity.json")
        if "log_log_slope" not in comp or "summary" not in comp:
            return False, "tv10_complexity missing required keys"

        ah = load_raw_json("tv10_alpha_hybrid.json")
        if "runs" not in ah or "hybrid_runs" not in ah or "summary" not in ah:
            return False, "tv10_alpha_hybrid missing required keys"
    except Exception as exc:  # pragma: no cover - defensive diagnostics
        return False, f"Compatibility check failed: {exc}"

    return True, "Verified compatible with current core/ and simulations/ code"


def compact_parameter_sensitivity(raw: Dict[str, Any]) -> Dict[str, Any]:
    """Strip 10D coordinate history copies while preserving all 15 grid configs & 500-step curves."""
    grid_out: List[Dict[str, Any]] = []
    for item in raw["grid"]:
        history = item.get("history", [])
        final_step = history[-1] if history else None
        entry: Dict[str, Any] = {
            "gamma": float(item["gamma"]),
            "theta": float(item["theta"]),
            "fbest": float(item["fbest"]),
            "curve": [float(v) for v in item["curve"]],
            "dispersion": [float(v) for v in item["dispersion"]],
        }
        if final_step is not None:
            entry["final_alpha"] = float(final_step["alpha"])
            entry["final_nbest"] = [float(v) for v in final_step["nbest"]]
        grid_out.append(entry)

    gamma_sweep_out = [
        {
            "gamma": float(item["gamma"]),
            "fbest": float(item["fbest"]),
            "curve": [float(v) for v in item["curve"]],
        }
        for item in raw.get("gamma_sweep", [])
    ]
    theta_sweep_out = [
        {
            "theta": float(item["theta"]),
            "fbest": float(item["fbest"]),
            "curve": [float(v) for v in item["curve"]],
        }
        for item in raw.get("theta_sweep", [])
    ]

    return {
        "grid": grid_out,
        "gamma_sweep": gamma_sweep_out,
        "theta_sweep": theta_sweep_out,
    }


def sample_indices(length: int, stride: int, milestones: Sequence[int]) -> List[int]:
    """Select sorted unique indices keeping first, last, milestones, and uniform stride."""
    if length <= 0:
        return []
    chosen = {0, length - 1}
    for idx in range(0, length, stride):
        chosen.add(idx)
    for m in milestones:
        if 0 <= m < length:
            chosen.add(m)
    return sorted(chosen)


def compact_multimodal(raw: Dict[str, Any], stride: int = 3) -> Dict[str, Any]:
    """Preserve gamma_summary, methodology, global_optima, bounds, and sampled replays.

    Retains original generation index `t` on every sampled frame without mutating
    source history semantics. Prioritizes Himmelblau {1e-5, 0.1, 1.0} and
    Rastrigin {0.01, 1.0, 5.0}, while keeping one representative replay (`seed=0`)
    for every available `(function_name, gamma)` pair so the user can inspect any gamma.
    """
    milestones = (0, 1, 5, 10, 20, 30, 45, 60, 90, 120, 150, 180)
    priority_pairs = {
        ("Himmelblau", 1e-5),
        ("Himmelblau", 0.1),
        ("Himmelblau", 1.0),
        ("Rastrigin", 0.01),
        ("Rastrigin", 1.0),
        ("Rastrigin", 5.0),
    }

    runs = raw.get("runs", [])
    # Group by (function_name, gamma) and pick seed=0 (or first available seed) as representative replay
    grouped: Dict[Tuple[str, float], List[Dict[str, Any]]] = {}
    for r in runs:
        key = (str(r["function_name"]), float(r["gamma"]))
        grouped.setdefault(key, []).append(r)

    representative_replays: List[Dict[str, Any]] = []
    for (fn_name, gamma), group_runs in grouped.items():
        chosen_run = next((r for r in group_runs if int(r.get("seed", 0)) == 0), group_runs[0])
        hist = chosen_run.get("history", [])
        mets = chosen_run.get("metrics", [])
        local_stride = stride if (fn_name, gamma) in priority_pairs else max(stride + 2, 5)
        idxs = sample_indices(len(hist), local_stride, milestones)

        sampled_history: List[Dict[str, Any]] = []
        sampled_metrics: List[Dict[str, Any]] = []
        for idx in idxs:
            h = hist[idx]
            sampled_history.append(
                {
                    "t": int(h["t"]),
                    "alpha": float(h["alpha"]),
                    "fbest": float(h["fbest"]),
                    "nbest": [float(v) for v in h["nbest"]],
                    "positions": [
                        [float(c) for c in pos] for pos in h["positions"]
                    ],
                    "fitness": [float(f) for f in h["fitness"]],
                }
            )
            if idx < len(mets):
                m = mets[idx]
                sampled_metrics.append(
                    {
                        "t": int(m["t"]),
                        "dispersion": float(m["dispersion"]),
                        "normalized_radius": float(m["normalized_radius"]),
                        "cluster_entropy": float(m["cluster_entropy"]),
                        "global_optima_found": int(m["global_optima_found"]),
                        "n_clusters": int(m["n_clusters"]),
                        "noise_count": int(m["noise_count"]),
                        "labels": [int(lbl) for lbl in m["labels"]],
                        "clusters": [
                            {
                                "size": int(c["size"]),
                                "center": [float(v) for v in c["center"]],
                                "nbest": [float(v) for v in c["nbest"]],
                                "fbest": float(c["fbest"]),
                            }
                            for c in m.get("clusters", [])
                        ],
                    }
                )

        seed_summaries = [
            {
                "seed": int(r["seed"]),
                "fbest": float(r["fbest"]),
                "nbest": [float(v) for v in r["nbest"]],
                "global_optima_found": int(r["metrics"][-1]["global_optima_found"])
                if r.get("metrics")
                else 0,
                "n_clusters": int(r["metrics"][-1]["n_clusters"])
                if r.get("metrics")
                else 0,
                "noise_count": int(r["metrics"][-1]["noise_count"])
                if r.get("metrics")
                else 0,
            }
            for r in group_runs
        ]

        representative_replays.append(
            {
                "function_name": fn_name,
                "bounds": [float(v) for v in chosen_run["bounds"]],
                "global_optima": [
                    [float(c) for c in opt] for opt in chosen_run["global_optima"]
                ],
                "gamma": float(gamma),
                "seed": int(chosen_run["seed"]),
                "n": int(chosen_run["n"]),
                "t_max": int(chosen_run["t_max"]),
                "alpha0": float(chosen_run["alpha0"]),
                "theta": float(chosen_run["theta"]),
                "beta0": float(chosen_run["beta0"]),
                "priority": (fn_name, gamma) in priority_pairs,
                "sample_stride": local_stride,
                "total_generations": int(chosen_run["t_max"]),
                "fbest": float(chosen_run["fbest"]),
                "nbest": [float(v) for v in chosen_run["nbest"]],
                "final_positions": [
                    [float(c) for c in pos]
                    for pos in chosen_run["final_positions"]
                ],
                "final_fitness": [float(f) for f in chosen_run["final_fitness"]],
                "seed_summaries": seed_summaries,
                "history": sampled_history,
                "metrics": sampled_metrics,
            }
        )

    default_rep = next(
        (
            r
            for r in representative_replays
            if r["function_name"] == "Himmelblau" and abs(r["gamma"] - 1.0) < 1e-12
        ),
        representative_replays[0],
    )

    return {
        "function_name": default_rep["function_name"],
        "bounds": default_rep["bounds"],
        "global_optima": default_rep["global_optima"],
        "gamma": default_rep["gamma"],
        "seed": default_rep["seed"],
        "n": default_rep["n"],
        "t_max": default_rep["t_max"],
        "alpha0": default_rep["alpha0"],
        "theta": default_rep["theta"],
        "beta0": default_rep["beta0"],
        "fbest": default_rep["fbest"],
        "nbest": default_rep["nbest"],
        "final_positions": default_rep["final_positions"],
        "final_fitness": default_rep["final_fitness"],
        "history": default_rep["history"],
        "metrics": default_rep["metrics"],
        "gamma_summary": raw["gamma_summary"],
        "methodology": raw["methodology"],
        "replays": representative_replays,
    }


def write_minified_json(path: Path, payload: Any) -> int:
    assert_finite_tree(payload)
    encoded = json.dumps(
        payload,
        ensure_ascii=False,
        separators=(",", ":"),
        allow_nan=False,
    )
    data_bytes = encoded.encode("utf-8")
    path.write_bytes(data_bytes)
    return len(data_bytes)


def build_datasets(force_regenerate: bool = False) -> Tuple[str, Dict[str, Any]]:
    if not force_regenerate:
        ok, reason = raw_exports_compatible()
        if ok:
            return (
                f"data_exports ({reason})",
                {
                    "worked_example_13_5.json": load_raw_json("worked_example_13_5.json"),
                    "constrained_demo.json": load_raw_json("constrained_demo.json"),
                    "convergence_iterations.json": load_raw_json("convergence_iterations.json"),
                    "scalability_nd.json": load_raw_json("scalability_nd.json"),
                    "parameter_sensitivity.json": compact_parameter_sensitivity(
                        load_raw_json("parameter_sensitivity.json")
                    ),
                    "multimodal_optimization.json": compact_multimodal(
                        load_raw_json("multimodal_optimization.json"), stride=3
                    ),
                    "tv10_complexity.json": load_raw_json("tv10_complexity.json"),
                    "tv10_alpha_hybrid.json": load_raw_json("tv10_alpha_hybrid.json"),
                },
            )
        print(f"[prepare_web_data] Falling back to live simulation run: {reason}")

    state = np.random.get_state()
    try:
        np.random.seed(42)
        worked = run_worked_example_13_5()
        constrained = run_constrained_demo()
        benchmark = exp_convergence_benchmark()
        np.random.seed(42)
        sensitivity = compact_parameter_sensitivity(exp_parameter_sensitivity())
        multimodal = compact_multimodal(exp_multimodal_optimization(), stride=3)
        complexity = exp_complexity()
        alpha_hybrid = exp_alpha_comparison()
    finally:
        np.random.set_state(state)

    return (
        "live simulations (seed=42)",
        {
            "worked_example_13_5.json": worked,
            "constrained_demo.json": constrained,
            "convergence_iterations.json": {"by_iterations": benchmark["by_iterations"]},
            "scalability_nd.json": {"by_scale": benchmark["by_scale"]},
            "parameter_sensitivity.json": sensitivity,
            "multimodal_optimization.json": multimodal,
            "tv10_complexity.json": complexity,
            "tv10_alpha_hybrid.json": alpha_hybrid,
        },
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Prepare web_ui/public/data/*.json")
    parser.add_argument(
        "--regenerate",
        action="store_true",
        help="Run Python simulations directly instead of reading verified data_exports/",
    )
    args = parser.parse_args()

    WEB_DATA_DIR.mkdir(parents=True, exist_ok=True)
    # Remove any stale JSON files not in EXPECTED_FILES
    for existing in WEB_DATA_DIR.glob("*"):
        if existing.name not in EXPECTED_FILES:
            existing.unlink()

    source_label, datasets = build_datasets(force_regenerate=args.regenerate)

    # Adaptive stride fallback if multimodal exceeds total 3 MB ceiling
    sizes: Dict[str, int] = {}
    for fname in EXPECTED_FILES:
        sizes[fname] = write_minified_json(WEB_DATA_DIR / fname, datasets[fname])

    total_bytes = sum(sizes.values())
    if total_bytes >= MAX_BUDGET_BYTES and not args.regenerate and (
        RAW_EXPORT_DIR / "multimodal_optimization.json"
    ).is_file():
        for fallback_stride in (4, 5, 6):
            datasets["multimodal_optimization.json"] = compact_multimodal(
                load_raw_json("multimodal_optimization.json"), stride=fallback_stride
            )
            sizes["multimodal_optimization.json"] = write_minified_json(
                WEB_DATA_DIR / "multimodal_optimization.json",
                datasets["multimodal_optimization.json"],
            )
            total_bytes = sum(sizes.values())
            if total_bytes < MAX_BUDGET_BYTES:
                break

    if set(sizes.keys()) != set(EXPECTED_FILES):
        raise RuntimeError(f"Expected 8 files, got {sorted(sizes.keys())}")
    if total_bytes >= MAX_BUDGET_BYTES:
        raise RuntimeError(
            f"Total web data {total_bytes} bytes exceeds 3 MB budget ({MAX_BUDGET_BYTES} bytes)"
        )

    print(f"[prepare_web_data] Source: {source_label}")
    for fname in EXPECTED_FILES:
        kb = sizes[fname] / 1024.0
        print(f"  - {fname:<30} {sizes[fname]:>9,d} B ({kb:>7.2f} KB)")
    print(
        f"[prepare_web_data] Total ({len(EXPECTED_FILES)} files): "
        f"{total_bytes:,d} B ({total_bytes / (1024 * 1024):.3f} MB < 3.000 MB)"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

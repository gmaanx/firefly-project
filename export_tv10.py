"""Headless PNG/CSV/JSON exports for TV10. No optimization on import."""
from __future__ import annotations

import csv
import json
from pathlib import Path
import numpy as np

from simulations.tv10 import (MultimodalProblem, run_multimodal_experiment,
                             exp_complexity, exp_alpha_comparison)


def export_tv10_results(output_dir, *, multimodal=None, complexity=None, alpha=None):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    if multimodal is None:
        multimodal = run_multimodal_experiment()
    if complexity is None:
        complexity = exp_complexity()
    if alpha is None:
        alpha = exp_alpha_comparison()
    paths = []

    def write_json(name, data):
        path = output_dir / name
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2, allow_nan=False), encoding="utf-8")
        paths.append(str(path))

    def write_csv(name, rows):
        path = output_dir / name
        with path.open("w", newline="", encoding="utf-8-sig") as stream:
            writer = csv.DictWriter(stream, fieldnames=list(rows[0]))
            writer.writeheader()
            writer.writerows(rows)
        paths.append(str(path))

    def save(fig, name):
        fig.tight_layout()
        path = output_dir / name
        fig.savefig(path, dpi=150)
        plt.close(fig)
        paths.append(str(path))

    write_json("multimodal.json", multimodal)
    write_json("complexity.json", complexity)
    write_json("alpha_comparison.json", alpha)
    write_csv("multimodal_summary.csv", multimodal["gamma_summary"])
    metric_rows, position_rows = [], []
    for run in multimodal["runs"]:
        prefix = {k: run[k] for k in ("function_name", "gamma", "seed")}
        for h, metric in zip(run["history"], run["metrics"]):
            metric_rows.append(dict(**prefix, t=h["t"], alpha=h["alpha"], fbest=h["fbest"],
                **{k: metric[k] for k in ("dispersion", "normalized_radius", "n_clusters",
                                          "noise_count", "global_optima_found", "cluster_entropy")}))
            for rank, (pos, fit, label) in enumerate(zip(h["positions"], h["fitness"], metric["labels"])):
                position_rows.append(dict(**prefix, t=h["t"], rank=rank, x=pos[0], y=pos[1],
                                          fitness=fit, cluster=label))
    write_csv("diversity_history.csv", metric_rows)
    write_csv("population_history.csv", position_rows)
    write_csv("complexity_runs.csv", complexity["runs"])
    write_csv("alpha_runs.csv", [{k: r[k] for k in (
        "mode", "seed", "alpha0", "theta", "evaluations", "fbest", "first_target_t")}
        for r in alpha["runs"]])
    write_csv("hybrid_history.csv", [dict(seed=r["seed"], fa_fbest=r["fa_fbest"],
        total_evaluations=r["total_evaluations"]-r["evaluations"]+h["evaluations"],
        local_evaluations=h["evaluations"], fbest=h["fbest"])
        for r in alpha["hybrid_runs"] for h in r["history"]])

    fig, ax = plt.subplots(figsize=(7, 4))
    radius = np.linspace(0, 10, 300)
    for gamma in sorted({r["gamma"] for r in multimodal["runs"]}):
        ax.plot(radius, np.exp(-gamma*radius**2), label=f"gamma={gamma:g}")
    ax.set(xlabel="Distance r", ylabel="beta(r) / beta0", title="Distance-dependent attraction")
    ax.legend(); ax.grid(alpha=0.3)
    save(fig, "attractiveness.png")

    for name in ("Himmelblau", "Rastrigin"):
        selected = [r for r in multimodal["runs"] if r["function_name"] == name
                    and r["seed"] == multimodal["runs"][0]["seed"]]
        fig, axes = plt.subplots(len(selected), 4, figsize=(14, 2.8*len(selected)), squeeze=False)
        problem = MultimodalProblem(name)
        grid = np.linspace(problem.Lb[0], problem.Ub[0], 110)
        x, y = np.meshgrid(grid, grid)
        z = np.array([problem.evaluate(p) for p in np.column_stack((x.ravel(), y.ravel()))]).reshape(x.shape)
        for row, run in enumerate(selected):
            indices = [0, len(run["history"])//4, len(run["history"])//2, len(run["history"])-1]
            for col, idx in enumerate(indices):
                ax = axes[row, col]
                h, m = run["history"][idx], run["metrics"][idx]
                pos = np.array(h["positions"])
                ax.contour(x, y, z, levels=16, cmap="Greys", alpha=0.5)
                ax.scatter(pos[:, 0], pos[:, 1], c=m["labels"], cmap="tab20", vmin=-1, vmax=19, s=18)
                ax.scatter(*problem.global_optima.T, c="red", marker="x", s=50)
                ax.set(xlim=(grid[0], grid[-1]), ylim=(grid[0], grid[-1]),
                       title=f"g={run['gamma']:g}, t={h['t']}, clusters={m['n_clusters']}")
        fig.suptitle(f"{name}: seed {selected[0]['seed']}; colors = snapshot clusters; red = global optima")
        save(fig, f"subswarming_{name.lower()}.png")

        fig, axes = plt.subplots(1, 3, figsize=(13, 4))
        for gamma in sorted({r["gamma"] for r in selected}):
            group = [r for r in multimodal["runs"] if r["function_name"] == name and r["gamma"] == gamma]
            for ax, key in zip(axes, ("dispersion", "n_clusters", "global_optima_found")):
                values = np.array([[m[key] for m in r["metrics"]] for r in group])
                mean, sd = values.mean(axis=0), values.std(axis=0)
                ts = [h["t"] for h in group[0]["history"]]
                ax.plot(ts, mean, label=f"g={gamma:g}")
                ax.fill_between(ts, np.maximum(0, mean-sd), mean+sd, alpha=0.1)
                ax.set(xlabel="Generation", ylabel=key, title="Mean +/- SD across seeds")
        axes[0].legend(fontsize=8)
        save(fig, f"diversity_{name.lower()}.png")

    fig, axes = plt.subplots(1, 2, figsize=(10, 4))
    ns = np.array([r["n"] for r in complexity["summary"]])
    timing = np.array([r["median_ms_per_generation"] for r in complexity["summary"]])
    axes[0].loglog(ns, timing, "o-", label=f"Measured slope {complexity['log_log_slope']:.2f}")
    axes[0].loglog(ns, timing[0]*(ns/ns[0])**2, "--", label="n^2 reference")
    axes[0].set(xlabel="Population n", ylabel="Median ms / generation")
    axes[0].legend()
    axes[1].plot(ns, ns**2, "o-")
    axes[1].set(xlabel="Population n", ylabel="Pair checks / generation (from loops)")
    save(fig, "complexity.png")

    fig, axes = plt.subplots(1, 2, figsize=(11, 4))
    for mode in ("fixed", "decaying"):
        values = np.array([r["curve"] for r in alpha["runs"] if r["mode"] == mode])
        mean, sd = values.mean(axis=0), values.std(axis=0)
        axes[0].semilogy(np.maximum(mean, 1e-18), label=mode)
        axes[0].fill_between(range(len(mean)), np.maximum(mean-sd, 1e-18), np.maximum(mean+sd, 1e-18), alpha=0.15)
    axes[0].set(xlabel="Generation", ylabel="Sphere fbest", title="Paired seeds, mean +/- SD")
    axes[0].legend()
    for run in alpha["hybrid_runs"]:
        axes[1].semilogy([h["evaluations"] for h in run["history"]],
                        [max(h["fbest"], 1e-18) for h in run["history"]], label=f"seed={run['seed']}")
    axes[1].set(xlabel="Additional local evaluations", ylabel="fbest", title="Hybrid refinement after decaying FA")
    axes[1].legend()
    save(fig, "alpha_hybrid.png")

    write_json("manifest.json", dict(files=[Path(p).name for p in paths]))
    print(f"[TV10] Exported {len(paths)} files to {output_dir}", flush=True)
    return paths


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", type=Path, default=Path(__file__).resolve().parent / "results" / "tv10")
    args = parser.parse_args()
    export_tv10_results(args.output_dir)

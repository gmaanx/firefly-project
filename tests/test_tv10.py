"""Numerical and integration regressions for TV10 (stdlib unittest)."""
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import numpy as np

from core.engine import FireflySolver
from core.parameters import FAParameters
from core.problems import UnconstrainedProblem
from simulations.experiments import (
    MultimodalProblem, detect_subswarms, population_metrics, run_seeded,
    run_multimodal_experiment, exp_complexity, exp_alpha_comparison,
    hybrid_local_search, seeded,
)


class TV10Tests(unittest.TestCase):
    def test_group_export_contract_and_failure_rng_restore(self):
        import main_export
        before = np.random.get_state()
        with tempfile.TemporaryDirectory() as tmp, \
                patch.object(main_export, 'run_worked_example_13_5', return_value={'fbest': 0}), \
                patch.object(main_export, 'run_constrained_demo', return_value={'is_feasible': True}), \
                patch.object(main_export, 'exp_convergence_benchmark', return_value={'by_iterations': [], 'by_scale': []}), \
                patch.object(main_export, 'exp_parameter_sensitivity', return_value={'grid': []}), \
                patch.object(main_export, 'exp_multimodal_optimization', return_value={'history': []}), \
                patch.object(main_export, 'exp_complexity', return_value={'runs': [], 'summary': []}), \
                patch.object(main_export, 'exp_alpha_comparison', return_value={'runs': [], 'hybrid_runs': []}):
            paths = main_export.export_all_to_json(tmp)
            self.assertEqual({Path(p).name for p in paths.values()}, set(main_export.EXPECTED_JSON_FILES))
            self.assertEqual(json.loads(Path(paths['convergence_iterations']).read_text()), {'by_iterations': []})
            self.assertEqual(json.loads(Path(paths['scalability_nd']).read_text()), {'by_scale': []})
            with patch.object(main_export, 'exp_convergence_benchmark', side_effect=RuntimeError('test')):
                with self.assertRaises(RuntimeError):
                    main_export.export_all_to_json(tmp)
        after = np.random.get_state()
        np.testing.assert_array_equal(before[1], after[1])
        self.assertEqual(before[2:], after[2:])

    def test_shared_solver_equivalence_and_rng_isolation(self):
        before = np.random.get_state()
        problem = UnconstrainedProblem(d=3)
        actual = run_seeded(problem, FAParameters(), 8, 4, 7)
        after = np.random.get_state()
        np.testing.assert_array_equal(before[1], after[1])
        self.assertEqual(before[2:], after[2:])
        with seeded(7):
            expected = FireflySolver(problem, FAParameters(), 8).run(4)
        self.assertEqual(actual['history'], expected['history'])
        result = run_seeded(problem, FAParameters(), 8, 0, 7)
        self.assertEqual(result['initial']['fbest'], result['fbest'])

    def test_clusters_noise_and_unique_optima(self):
        problem = MultimodalProblem()
        points = np.repeat(problem.global_optima[:2], 3, axis=0)
        points = np.vstack((points, [[0, 0]]))
        fitness = [problem.evaluate(x) for x in points]
        metrics = population_metrics(points, fitness, problem)
        self.assertEqual(metrics['n_clusters'], 2)
        self.assertEqual(metrics['noise_count'], 1)
        self.assertEqual(metrics['global_optima_found'], 2)
        self.assertEqual(detect_subswarms([[0, 0]], [0])['noise_count'], 1)
        self.assertEqual(population_metrics([[0, 0]], [0], problem)['dispersion'], 0)
        # Proximity alone cannot declare an optimum when cost is poor.
        self.assertEqual(population_metrics(points, np.ones(7), problem)['global_optima_found'], 0)

    def test_history_bounds_and_fitness_alignment(self):
        data = run_multimodal_experiment(gammas=(0.01, 1.0), seeds=(0,), n=8, t_max=3)
        self.assertEqual(len(data['runs']), 4)
        for run in data['runs']:
            problem = MultimodalProblem(run['function_name'])
            self.assertEqual([h['t'] for h in run['history']], [0, 1, 2, 3])
            for h in run['history']:
                pos = np.array(h['positions'])
                self.assertTrue(np.all(pos >= problem.Lb) and np.all(pos <= problem.Ub))
                np.testing.assert_allclose(h['fitness'], [problem.evaluate(x) for x in pos])
                self.assertAlmostEqual(h['alpha'], 0.05 * 0.97**h['t'])
            curve = [h['fbest'] for h in run['history']]
            self.assertTrue(np.all(np.diff(curve) <= 1e-12))
        json.dumps(data, allow_nan=False)

    def test_alpha_and_hybrid_budgets(self):
        data = exp_alpha_comparison(seeds=(5,), n=6, t_max=4, local_steps=12)
        fixed, decaying = data['runs']
        self.assertEqual(fixed['curve'][0], decaying['curve'][0])
        np.testing.assert_allclose(fixed['alpha_curve'], 0.5)
        np.testing.assert_allclose(decaying['alpha_curve'], 0.5 * 0.97**np.arange(5))
        hybrid = data['hybrid_runs'][0]
        self.assertLessEqual(hybrid['fbest'], hybrid['fa_fbest'])
        self.assertEqual(hybrid['total_evaluations'], decaying['evaluations'] + 13)
        self.assertEqual(hybrid_local_search(UnconstrainedProblem(d=2), [1, 1], steps=0)['fbest'], 0)

    def test_complexity_and_export_artifacts(self):
        multimodal = run_multimodal_experiment(gammas=(0.01, 1.0), seeds=(0,), n=6, t_max=2)
        complexity = exp_complexity(sizes=(4, 8), seeds=(0,), t_max=2)
        alpha = exp_alpha_comparison(seeds=(0,), n=5, t_max=2, local_steps=3)
        for row in complexity['runs']:
            self.assertEqual(row['pair_checks_per_generation'], row['n']**2)
            self.assertGreaterEqual(row['objective_evaluations'], row['n'])
            self.assertGreater(row['runtime_ms'], 0)
        # The shared exporter serializes numerical TV10 results directly as JSON;
        # this assertion is deliberately independent of optional plotting tools.
        for data in (multimodal, complexity, alpha):
            encoded = json.dumps(data, allow_nan=False)
            self.assertGreater(len(encoded), 0)


if __name__ == '__main__':
    unittest.main()

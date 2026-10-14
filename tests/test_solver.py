import itertools
import math
import random
import unittest
from solver import DEMO, cost, distance_matrix, local_beam, solve, two_opt


class SolverTests(unittest.TestCase):
    def test_square_exact(self):
        points = [{"name": str(i), "x": x, "y": y} for i, (x, y) in
                  enumerate([(0, 0), (100, 100), (100, 0), (0, 100)])]
        r = solve({"stops": points})
        self.assertAlmostEqual(r["optimized"]["distance"], 400)
        self.assertAlmostEqual(r["gap_percent"], 0)

    def test_triangle_and_collinear(self):
        for coords, expected in [([(0, 0), (3, 0), (0, 4)], 12),
                                 ([(0, 0), (2, 0), (5, 0)], 10)]:
            r = solve({"stops": [{"name": str(i), "x": x, "y": y}
                                 for i, (x, y) in enumerate(coords)]})
            self.assertAlmostEqual(r["optimized"]["distance"], expected)

    def test_validity_monotonicity_and_reproducibility(self):
        for n in [3, 8, 10, 25]:
            rng = random.Random(n)
            stops = [{"name": str(i), "x": rng.randrange(1000),
                      "y": rng.randrange(1000)} for i in range(n)]
            data = {"stops": stops, "beam": 6, "iterations": 25, "seed": 42}
            a, b = solve(data), solve(data)
            self.assertEqual(a["optimized"], b["optimized"])
            route = a["optimized"]["route"]
            self.assertEqual(route[0], route[-1])
            self.assertEqual(sorted(route[:-1]), list(range(n)))
            self.assertLessEqual(a["optimized"]["distance"], a["beam"]["distance"]+1e-8)
            self.assertLessEqual(a["beam"]["distance"], a["nearest"]["distance"]+1e-8)
            history = [v["distance"] for v in a["history"]]
            self.assertTrue(all(y <= x+1e-8 for x, y in zip(history, history[1:])))
            self.assertAlmostEqual(sum(v["distance"] for v in a["legs"]),
                                   a["optimized"]["distance"])

    def test_exact_reference_independent_enumeration(self):
        r = solve({"stops": DEMO[:7]})
        m = distance_matrix(DEMO[:7])
        reference = min(cost((0,)+p, m) for p in itertools.permutations(range(1, 7)))
        self.assertAlmostEqual(r["exact"]["distance"], reference)
        self.assertGreaterEqual(r["optimized"]["distance"]+1e-8, reference)

    def test_crossing_removed(self):
        m = distance_matrix([{"x": x, "y": y} for x, y in
                             [(0, 0), (100, 100), (100, 0), (0, 100)]])
        route, moves = two_opt((0, 1, 2, 3), m)
        self.assertAlmostEqual(cost(route, m), 400)
        self.assertTrue(moves)

    def test_invalid_inputs(self):
        for data in [None, {}, {"stops": DEMO[:2]}, {"stops": DEMO*3},
                     {"stops": DEMO, "beam": 0}, {"stops": DEMO, "seed": True},
                     {"stops": DEMO, "iterations": 151},
                     {"stops": [{"name": "x", "x": math.nan, "y": 0}]+DEMO[:2]},
                     {"stops": [DEMO[0], DEMO[0], DEMO[1]]}]:
            with self.assertRaises(ValueError):
                solve(data)


if __name__ == "__main__":
    unittest.main(verbosity=2)

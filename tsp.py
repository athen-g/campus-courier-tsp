"""Main TSP algorithm: Local Beam Search followed by 2-opt."""
import itertools
import random
from tour_utils import canonical, cost, nearest_neighbor


def local_beam(matrix, width, iterations, seed):
    """Elitist beam: all swap successors compete with retained parents."""
    rng = random.Random(seed)
    n = len(matrix)
    initial = {nearest_neighbor(matrix), canonical(range(n))}
    # Small instances can have fewer unique tours than the requested width.
    for _ in range(width * 20):
        initial.add(canonical([0] + rng.sample(range(1, n), n - 1)))
        if len(initial) >= width:
            break
    beam = sorted(initial, key=lambda r: (cost(r, matrix), r))[:width]
    history = [{"iteration": 0, "distance": cost(beam[0], matrix)}]
    evaluations = 0
    reason = "iteration limit"
    for step in range(1, iterations + 1):
        candidates = set(beam)
        for route in beam:
            for i, j in itertools.combinations(range(1, n), 2):
                child = list(route)
                child[i], child[j] = child[j], child[i]
                candidates.add(canonical(child))
        scores = [(cost(r, matrix), r) for r in candidates]
        evaluations += len(scores)
        new = [r for _, r in sorted(scores)[:width]]
        history.append({"iteration": step, "distance": cost(new[0], matrix)})
        if new == beam:
            reason = "beam unchanged"
            break
        beam = new
    return beam[0], history, evaluations, reason

def two_opt(route, matrix):
    """Best improvement segment reversal; dispatch stays at index zero."""
    route = tuple(route)
    moves = []
    while True:
        best, best_cost = route, cost(route, matrix)
        for i in range(1, len(route) - 1):
            for j in range(i + 1, len(route)):
                child = route[:i] + tuple(reversed(route[i:j + 1])) + route[j + 1:]
                value = cost(child, matrix)
                if value < best_cost - 1e-9:
                    best, best_cost = child, value
        if best == route:
            return canonical(route), moves
        route = best
        moves.append(best_cost)

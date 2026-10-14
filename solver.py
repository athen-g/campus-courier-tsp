"""Symmetric Euclidean TSP: local beam search and 2-opt refinement."""
import itertools
import math
import time
from tsp import local_beam, two_opt
from tour_utils import cost, distance_matrix, nearest_neighbor


DEMO = [
    {"name": "Dispatch", "x": 80, "y": 100},
    {"name": "Library", "x": 240, "y": 90},
    {"name": "Hostel A", "x": 850, "y": 140},
    {"name": "Workshop", "x": 460, "y": 360},
    {"name": "Canteen", "x": 160, "y": 560},
    {"name": "Admin", "x": 580, "y": 110},
    {"name": "Sports Hall", "x": 820, "y": 580},
    {"name": "Lab Block", "x": 320, "y": 620},
    {"name": "Hostel B", "x": 690, "y": 400},
    {"name": "Medical", "x": 110, "y": 320},
]


def validate(data):
    if not isinstance(data, dict):
        raise ValueError("Request must be a JSON object.")
    stops = data.get("stops")
    if not isinstance(stops, list) or not 3 <= len(stops) <= 25:
        raise ValueError("Enter between 3 and 25 stops, including dispatch.")
    clean, seen = [], set()
    for stop in stops:
        if not isinstance(stop, dict):
            raise ValueError("Each stop must contain a name, x and y.")
        name = stop.get("name")
        if not isinstance(name, str) or not 1 <= len(name.strip()) <= 30:
            raise ValueError("Stop names must have 1 to 30 characters.")
        coords = [stop.get("x"), stop.get("y")]
        if any(type(v) not in (int, float) or not math.isfinite(v)
               or not 0 <= v <= 1000 for v in coords):
            raise ValueError("Coordinates must be finite numbers from 0 to 1000.")
        point = tuple(coords)
        if point in seen:
            raise ValueError("Two stops cannot share the same coordinates.")
        seen.add(point)
        clean.append({"name": name.strip(), "x": coords[0], "y": coords[1]})
    params = {}
    for key, default, low, high in [("beam", 6, 1, 12),
                                    ("iterations", 60, 1, 150),
                                    ("seed", 42, 0, 999999)]:
        value = data.get(key, default)
        if type(value) is not int or not low <= value <= high:
            raise ValueError(f"{key} must be an integer from {low} to {high}.")
        params[key] = value
    return clean, params


def exact_tour(matrix):
    """Exhaustive reference for at most nine stops, not the main solver."""
    if len(matrix) > 9:
        return None
    routes = ((0,) + p for p in itertools.permutations(range(1, len(matrix))))
    route = min(routes, key=lambda r: (cost(r, matrix), r))
    return {"route": list(route) + [0], "distance": cost(route, matrix)}


def solve(data):
    stops, params = validate(data)
    matrix = distance_matrix(stops)
    started = time.perf_counter()
    baseline = tuple(range(len(stops)))
    greedy = nearest_neighbor(matrix)
    beam, history, evaluations, reason = local_beam(matrix, **{
        "width": params["beam"], "iterations": params["iterations"],
        "seed": params["seed"]})
    final, moves = two_opt(beam, matrix)
    elapsed = (time.perf_counter() - started) * 1000
    exact = exact_tour(matrix)
    def record(route):
        return {"route": list(route) + [0], "distance": cost(route, matrix)}
    final_cost, base_cost = cost(final, matrix), cost(baseline, matrix)
    return {"stops": stops, "parameters": params,
            "baseline": record(baseline), "nearest": record(greedy),
            "beam": record(beam), "optimized": record(final),
            "history": history, "two_opt_history": moves,
            "evaluations": evaluations, "stop_reason": reason,
            "runtime_ms": elapsed, "exact": exact,
            "gap_percent": (100 * (final_cost / exact["distance"] - 1)
                            if exact else None),
            "saving_percent": 100 * (1 - final_cost / base_cost),
            "legs": [{"from": a, "to": b, "distance": matrix[a][b]}
                     for a, b in zip(list(final), list(final[1:]) + [0])]}


if __name__ == "__main__":
    import json
    print(json.dumps(solve({"stops": DEMO}), indent=2))

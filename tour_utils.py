"""Distance and tour helpers for the TSP algorithms."""
import math


def distance_matrix(stops):
    return [[math.hypot(a["x"] - b["x"], a["y"] - b["y"])
             for b in stops] for a in stops]

def cost(route, matrix):
    return sum(matrix[route[i - 1]][route[i]] for i in range(len(route)))

def canonical(route):
    """Keep dispatch fixed; reverse tours are equivalent in symmetric TSP."""
    route = tuple(route)
    return min(route, (0,) + tuple(reversed(route[1:])))

def nearest_neighbor(matrix):
    route, left = [0], set(range(1, len(matrix)))
    while left:
        nxt = min(left, key=lambda v: (matrix[route[-1]][v], v))
        route.append(nxt)
        left.remove(nxt)
    return canonical(route)

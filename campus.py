"""Estimated campus road network, redrawn from the supplied Wadia layout."""
import json, math, heapq
from pathlib import Path
CAMPUS = json.loads((Path(__file__).parent / "static/campus.json").read_text(encoding="utf-8"))
DEMO = CAMPUS["stops"]

def road_distances(stops):
    nodes = CAMPUS["nodes"]
    graph = {k: [] for k in nodes}
    for a, b in CAMPUS["edges"]:
        d = math.dist(nodes[a], nodes[b])
        graph[a].append((b, d)); graph[b].append((a, d))
    keys = []
    for s in stops:
        matches = [k for k, xy in nodes.items() if xy == [s["x"], s["y"]]]
        if not matches:
            raise ValueError("Campus stops must use a road junction shown on the map.")
        keys.append(matches[0])
    matrix, paths = [], {}
    for i, source in enumerate(keys):
        best = {source: 0}; routes = {source: [source]}; queue = [(0, source)]
        while queue:
            dist, a = heapq.heappop(queue)
            if dist > best[a]: continue
            for b, weight in graph[a]:
                candidate = dist + weight
                if candidate < best.get(b, float("inf")):
                    best[b] = candidate; routes[b] = routes[a] + [b]
                    heapq.heappush(queue, (candidate, b))
        matrix.append([best[k] for k in keys])
        for j, k in enumerate(keys): paths[f"{i}-{j}"] = [nodes[v] for v in routes[k]]
    return matrix, paths

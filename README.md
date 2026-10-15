# Campus Courier

A college AI mini-project with two independent delivery planners. Both use the Traveling Salesman Problem, Local Beam Search and 2-opt to order stops and return to dispatch.

## Run

Requires Python 3.10 or newer. No third-party packages or API keys.

```sh
python server.py
```

Open http://127.0.0.1:8765 for the 2D campus map, or http://127.0.0.1:8765/engineering.html for the 3D Engineering College planner. To choose another port, run `python server.py --port 8774`. Keep the terminal open while using the app.

## 2D campus

The original vector map follows Wadia College campus, with north on the left. Select destinations from the dropdown, clear the list to start a new trip, or load the campus stops. The first stop is dispatch. Dijkstra computes distances along the internal road graph; beam search and 2-opt choose a service order. The map and solver share the same road network. Roads may be retraced. Distances are illustrative estimates, not surveyed measurements.

Compare input order, nearest-neighbor, beam-search and refined routes, inspect leg distances, or export the result as JSON. Campus search settings include beam width, iteration limit and seed. Exhaustive verification is available for up to nine stops. Larger heuristic results are not claimed globally optimal.

## 3D Engineering College

A separate dark blueprint view shows ground plus five floors. Rotate the projected wireframe, adjust floor separation or select an individual floor. Choose a floor and destination, add individual stops, or use Load Floor Destinations. Indoor trips support 2–25 distinct destinations and stairs, lifts, or both.

The schematic follows supplied floor sketches: the ground east wing is shorter; the ground floor has the entrance, office, print shop, large workshop and small workshop. Entrance-to-workshop travel must go up on the east side, cross floor 1 and descend on the west side. Staircases are south of their opposing lifts. Floor 1 contains Library 101 and the drawing room. Floor 2 contains the principal office and staff washroom. Floors 3 and 5 have balconies in the positions used by floor 4's common rooms.

Room numbers alternate between rows, west to east except on floor 1, which starts east with Library 101. Classrooms, labs, faculty offices and washrooms are numbered; common areas and circulation are unnumbered. The inventory follows the sketches rather than inserting rooms to reach 20. Labels and numbering remain editable in `indoor.py`.

Dijkstra computes indoor paths, then Local Beam Search and 2-opt order deliveries. The route response must match the displayed building revision, preventing old server models from drawing incorrect routes. Travel times use illustrative walking, stair and lift costs; lift queues are excluded. Geometry is schematic and is not an evacuation plan or an accessibility certification.

## Code

- `tsp.py`: main Local Beam Search and 2-opt algorithms.
- `tour_utils.py`: tour cost, canonical order and nearest-neighbor helpers.
- `campus.py`, `static/campus.json`: campus road graph and shortest paths.
- `indoor.py`: six-level building, room inventory and floor-aware routing.
- `solver.py`, `server.py`: campus orchestration and local HTTP endpoints.
- `static/`: both interfaces and the original Wadia SVG map.
- `tests/`: routing and input-validation checks.

Run `python -m unittest discover -s tests -v` from this folder. Current suite: 10 tests, including workshop access, east-side library routing and stale-model rejection. Browser visual verification is still pending; do not treat these tests as visual QA.

The repository contains code and README only, with map assets required by the app. No assignment report is included.

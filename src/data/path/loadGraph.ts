import graphJson from "./path.graph.json";
import { RAW_PATH_POIS } from "./pathDirectory";
import type { PathGraph, PathNode, PathPOI } from "./types";

let cached: PathGraph | null = null;

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function gridToXY(grid: string, mapWidth: number, mapHeight: number) {
  const colLetter = grid[0]?.toUpperCase();
  const rowNum = Number.parseInt(grid.slice(1), 10);
  if (!colLetter || Number.isNaN(rowNum)) return null;

  const colIndex = colLetter.charCodeAt(0) - "A".charCodeAt(0);
  const COLS = 7;
  const ROWS = 12;

  const x = ((colIndex + 0.5) / COLS) * mapWidth;
  const y = ((rowNum - 0.5) / ROWS) * mapHeight;
  return { x, y };
}

function snapToNearestNode(nodes: PathNode[], x: number, y: number) {
  if (!nodes.length) return undefined;
  let bestId = nodes[0].id;
  let bestD2 = Number.POSITIVE_INFINITY;

  for (const node of nodes) {
    const dx = node.x - x;
    const dy = node.y - y;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestD2) {
      bestD2 = d2;
      bestId = node.id;
    }
  }

  return bestId;
}

export function loadGraph(): PathGraph {
  if (cached) return cached;

  const base = graphJson as PathGraph;
  const width = base.meta?.width ?? 1064;
  const height = base.meta?.height ?? 1786;

  const pois: PathPOI[] = RAW_PATH_POIS.map((raw) => {
    const grid = raw.grid;
    if (!grid) return raw;

    const xy = gridToXY(grid, width, height);
    if (!xy) return raw;

    return {
      ...raw,
      x: xy.x,
      y: xy.y,
      nodeId: snapToNearestNode(base.nodes, xy.x, xy.y),
    };
  });

  cached = {
    ...base,
    meta: { width, height },
    pois,
  };

  return cached;
}

export function findPOIByName(graph: PathGraph, name: string) {
  const query = normalize(name);
  if (!query) return null;

  const exact = graph.pois.find((poi) => normalize(poi.name) === query);
  if (exact) return exact;

  return (
    graph.pois.find((poi) => normalize(poi.name).includes(query)) ??
    graph.pois.find((poi) => query.includes(normalize(poi.name))) ??
    null
  );
}

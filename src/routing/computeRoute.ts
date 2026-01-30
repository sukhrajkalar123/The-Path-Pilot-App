import type { PathEdge, PathGraph, PathNode, RouteStats } from "../data/path/types";

type Neighbor = {
  to: string;
  meters: number;
  accessible?: boolean;
};

type Options = {
  accessibleOnly?: boolean;
};

const GRID_COLS = 7;
const GRID_ROWS = 12;
const METERS_PER_GRID_COL = 100;
const METERS_PER_GRID_ROW = 100;
const DEFAULT_STEP_LENGTH_M = 0.78;
const DEFAULT_WALKING_SPEED_M_PER_MIN = 75;

function parseEnvNumber(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function resolveMetersPerPixel(graph: PathGraph) {
  const override = parseEnvNumber(
    process.env.EXPO_PUBLIC_METERS_PER_PIXEL,
    NaN
  );
  if (Number.isFinite(override)) return override;

  const width = graph.meta?.width ?? 1064;
  const height = graph.meta?.height ?? 1786;
  const scaleX = (GRID_COLS * METERS_PER_GRID_COL) / width;
  const scaleY = (GRID_ROWS * METERS_PER_GRID_ROW) / height;
  return (scaleX + scaleY) / 2;
}

function edgeDistance(
  edge: PathEdge,
  nodesById: Map<string, PathNode>,
  metersPerPixel: number
) {
  if (typeof edge.meters === "number") return edge.meters * metersPerPixel;
  const from = nodesById.get(edge.from);
  const to = nodesById.get(edge.to);
  if (!from || !to) return 0;
  const dx = from.x - to.x;
  const dy = from.y - to.y;
  return Math.hypot(dx, dy) * metersPerPixel;
}

function buildAdjacency(
  graph: PathGraph,
  nodesById: Map<string, PathNode>,
  metersPerPixel: number
) {
  const adjacency = new Map<string, Neighbor[]>();
  for (const edge of graph.edges) {
    const meters = edgeDistance(edge, nodesById, metersPerPixel);
    if (!adjacency.has(edge.from)) adjacency.set(edge.from, []);
    if (!adjacency.has(edge.to)) adjacency.set(edge.to, []);
    adjacency.get(edge.from)!.push({ to: edge.to, meters, accessible: edge.accessible });
    adjacency.get(edge.to)!.push({ to: edge.from, meters, accessible: edge.accessible });
  }
  return adjacency;
}

export function computeShortestPath(
  graph: PathGraph,
  startId: string,
  endId: string,
  options: Options = {}
) {
  const nodesById = new Map(graph.nodes.map((n) => [n.id, n]));
  const metersPerPixel = resolveMetersPerPixel(graph);
  const adjacency = buildAdjacency(graph, nodesById, metersPerPixel);
  const nodeIds = graph.nodes.map((n) => n.id);

  const dist: Record<string, number> = {};
  const prev: Record<string, string | null> = {};

  for (const nodeId of nodeIds) {
    dist[nodeId] = Number.POSITIVE_INFINITY;
    prev[nodeId] = null;
  }
  dist[startId] = 0;

  const unvisited = new Set(nodeIds);

  while (unvisited.size > 0) {
    let current: string | null = null;
    let currentDist = Number.POSITIVE_INFINITY;

    for (const nodeId of unvisited) {
      if (dist[nodeId] < currentDist) {
        currentDist = dist[nodeId];
        current = nodeId;
      }
    }

    if (!current) break;
    if (current === endId) break;

    unvisited.delete(current);
    const neighbors = adjacency.get(current) ?? [];
    for (const neighbor of neighbors) {
      if (options.accessibleOnly && neighbor.accessible === false) continue;
      if (!unvisited.has(neighbor.to)) continue;
      const alt = dist[current] + neighbor.meters;
      if (alt < dist[neighbor.to]) {
        dist[neighbor.to] = alt;
        prev[neighbor.to] = current;
      }
    }
  }

  if (!Number.isFinite(dist[endId])) {
    return null;
  }

  const pathIds: string[] = [];
  let cursor: string | null = endId;
  while (cursor) {
    pathIds.unshift(cursor);
    cursor = prev[cursor];
  }

  const points = pathIds.map((id) => nodesById.get(id)).filter(Boolean) as PathNode[];
  const meters = Number.isFinite(dist[endId]) ? dist[endId] : 0;
  const stepLength = parseEnvNumber(
    process.env.EXPO_PUBLIC_STEP_LENGTH_M,
    DEFAULT_STEP_LENGTH_M
  );
  const walkingSpeed = parseEnvNumber(
    process.env.EXPO_PUBLIC_WALKING_SPEED_M_PER_MIN,
    DEFAULT_WALKING_SPEED_M_PER_MIN
  );
  const minutes = meters > 0 ? Math.max(1, Math.round(meters / walkingSpeed)) : 0;
  const steps = meters > 0 ? Math.max(1, Math.round(meters / stepLength)) : 0;

  const stats: RouteStats = {
    meters,
    minutes,
    steps,
  };

  return { points, stats };
}

export function smoothRoute(points: PathNode[]) {
  if (points.length < 3) return points;
  const smoothed: PathNode[] = [points[0]];

  for (let i = 1; i < points.length - 1; i += 1) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    const dx1 = curr.x - prev.x;
    const dy1 = curr.y - prev.y;
    const dx2 = next.x - curr.x;
    const dy2 = next.y - curr.y;
    const cross = dx1 * dy2 - dy1 * dx2;
    if (Math.abs(cross) > 0.01) {
      smoothed.push(curr);
    }
  }

  smoothed.push(points[points.length - 1]);
  return smoothed;
}

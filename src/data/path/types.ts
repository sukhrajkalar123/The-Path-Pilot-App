export type PathNode = {
  id: string;
  x: number;
  y: number;
  level?: number;
};

export type PathEdge = {
  from: string;
  to: string;
  meters?: number;
  accessible?: boolean;
};

export type PathPOI = {
  id: string;
  name: string;
  grid?: string;
  category?: string;
  nodeId?: string;
  x?: number;
  y?: number;
  keywords?: string[];
};

export type PathGraph = {
  nodes: PathNode[];
  edges: PathEdge[];
  pois: PathPOI[];
  meta: {
    width: number;
    height: number;
  };
};

export type RouteStats = {
  meters: number;
  minutes: number;
  steps: number;
};

const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");

const input = path.join(__dirname, "../assets/maps/path-map.png");
const output = path.join(__dirname, "../src/data/path/path.graph.json");

function getArg(name, fallback) {
  const prefix = `--${name}=`;
  const hit = process.argv.find((arg) => arg.startsWith(prefix));
  if (!hit) return fallback;
  const value = hit.slice(prefix.length);
  if (typeof fallback === "number") return Number(value);
  if (typeof fallback === "boolean") return value === "true";
  return value;
}

const STEP = getArg("step", 4);
const H_MIN = getArg("hmin", 80);
const H_MAX = getArg("hmax", 160);
const S_MIN = getArg("smin", 20);
const V_MIN = getArg("vmin", 40);
const WINDOW = getArg("window", 1);
const MIN_HITS = getArg("minhits", 1);
const RADIUS = getArg("radius", 14);

function rgbToHsv(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    switch (max) {
      case r:
        h = ((g - b) / d) % 6;
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  const v = max;
  return { h, s, v };
}

function loadPng(filePath) {
  const data = fs.readFileSync(filePath);
  return PNG.sync.read(data);
}

function buildMask(png) {
  const { width, height } = png;
  const mask = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = (width * y + x) << 2;
      const r = png.data[idx];
      const g = png.data[idx + 1];
      const b = png.data[idx + 2];
      const { h, s, v } = rgbToHsv(r, g, b);
      const H = h / 2;
      const S = s * 255;
      const V = v * 255;
      if (H >= H_MIN && H <= H_MAX && S >= S_MIN && V >= V_MIN) {
        mask[y * width + x] = 1;
      }
    }
  }
  return mask;
}

function countHits(mask, width, height, x, y) {
  let hits = 0;
  for (let dy = -WINDOW; dy <= WINDOW; dy += 1) {
    for (let dx = -WINDOW; dx <= WINDOW; dx += 1) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      if (mask[ny * width + nx]) hits += 1;
    }
  }
  return hits;
}

function generateGraph() {
  const png = loadPng(input);
  const { width, height } = png;
  const mask = buildMask(png);

  const nodes = [];
  const nodeIndex = new Map();

  for (let y = 0; y < height; y += STEP) {
    for (let x = 0; x < width; x += STEP) {
      const hits = countHits(mask, width, height, x, y);
      if (hits >= MIN_HITS) {
        const id = `n${nodes.length}`;
        nodes.push({ id, x, y, level: 1 });
        nodeIndex.set(`${x},${y}`, id);
      }
    }
  }

  const edges = [];
  const cellSize = RADIUS;
  const buckets = new Map();
  nodes.forEach((node, idx) => {
    const cx = Math.floor(node.x / cellSize);
    const cy = Math.floor(node.y / cellSize);
    const key = `${cx},${cy}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(idx);
  });

  for (let i = 0; i < nodes.length; i += 1) {
    const node = nodes[i];
    const cx = Math.floor(node.x / cellSize);
    const cy = Math.floor(node.y / cellSize);

    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dy = -1; dy <= 1; dy += 1) {
        const key = `${cx + dx},${cy + dy}`;
        const bucket = buckets.get(key);
        if (!bucket) continue;

        for (const j of bucket) {
          if (j <= i) continue;
          const other = nodes[j];
          const dist = Math.hypot(node.x - other.x, node.y - other.y);
          if (dist <= RADIUS) {
            edges.push({ from: node.id, to: other.id, meters: dist, accessible: true });
          }
        }
      }
    }
  }

  const graph = {
    meta: { width, height },
    nodes,
    edges,
    pois: [],
  };

  fs.writeFileSync(output, JSON.stringify(graph));

  console.log(`Generated ${nodes.length} nodes, ${edges.length} edges.`);
  console.log(`Map size: ${width}x${height}`);
}

generateGraph();

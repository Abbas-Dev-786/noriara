export interface Point {
  x: number;
  y: number;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Distance between two points */
export function dist(p1: Point, p2: Point): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Shortest distance from a point p to a line segment v-w */
export function distToSegment(p: Point, v: Point, w: Point): number {
  const l2 = dist(v, w) ** 2;
  if (l2 === 0) return dist(p, v);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return dist(p, {
    x: v.x + t * (w.x - v.x),
    y: v.y + t * (w.y - v.y),
  });
}

/** Check if a line segment intersects a circle */
export function segmentIntersectsCircle(
  v: Point,
  w: Point,
  center: Point,
  radius: number
): boolean {
  return distToSegment(center, v, w) <= radius;
}

/** Check if a point is inside a circle */
export function isPointInCircle(p: Point, center: Point, radius: number): boolean {
  return dist(p, center) <= radius;
}

export function polylineLength(path: Point[]): number {
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    total += dist(path[i - 1] as Point, path[i] as Point);
  }
  return total;
}

export function smoothPath(path: Point[], iterations: number = 2): Point[] {
  if (path.length < 3) return [...path];

  let current = [...path];

  for (let pass = 0; pass < iterations; pass++) {
    const next: Point[] = [current[0] as Point];
    for (let i = 0; i < current.length - 1; i++) {
      const p0 = current[i] as Point;
      const p1 = current[i + 1] as Point;
      next.push({
        x: lerp(p0.x, p1.x, 0.25),
        y: lerp(p0.y, p1.y, 0.25),
      });
      next.push({
        x: lerp(p0.x, p1.x, 0.75),
        y: lerp(p0.y, p1.y, 0.75),
      });
    }
    next.push(current[current.length - 1] as Point);
    current = next;
  }

  return current;
}

/**
 * Normalizes a polyline into an array of points separated by exactly `step` distance.
 */
export function normalizePath(path: Point[], step: number): Point[] {
  if (path.length < 2) return [...path];
  
  const result: Point[] = [path[0] as Point];
  let currentPathIndex = 0;
  let currentPoint = path[0] as Point;
  let distanceRemaining = step;

  while (currentPathIndex < path.length - 1) {
    const nextPathPoint = path[currentPathIndex + 1] as Point;
    const segmentLength = dist(currentPoint, nextPathPoint);

    if (segmentLength < distanceRemaining) {
      distanceRemaining -= segmentLength;
      currentPoint = nextPathPoint;
      currentPathIndex++;
    } else {
      const t = distanceRemaining / segmentLength;
      const newPoint = {
        x: currentPoint.x + t * (nextPathPoint.x - currentPoint.x),
        y: currentPoint.y + t * (nextPathPoint.y - currentPoint.y),
      };
      result.push(newPoint);
      currentPoint = newPoint;
      distanceRemaining = step;
    }
  }

  const lastPoint = path[path.length - 1] as Point;
  if (dist(result[result.length - 1] as Point, lastPoint) > step * 0.5) {
    result.push(lastPoint);
  }

  return result;
}

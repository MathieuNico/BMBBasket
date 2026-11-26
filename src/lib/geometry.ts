import type { Point } from './types'

export const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)

export const lerp = (a: Point, b: Point, t: number): Point => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
})

export function length(line: Point[]) {
  let total = 0
  for (let i = 1; i < line.length; i++) total += dist(line[i - 1], line[i])
  return total
}

/** Point situé à la distance `d` depuis le début de la ligne. */
export function pointAtDistance(line: Point[], d: number): Point {
  if (d <= 0) return line[0]
  for (let i = 1; i < line.length; i++) {
    const seg = dist(line[i - 1], line[i])
    if (d <= seg && seg > 0) return lerp(line[i - 1], line[i], d / seg)
    d -= seg
  }
  return line[line.length - 1]
}

export const pointAt = (line: Point[], t: number) => pointAtDistance(line, length(line) * t)

export function distanceToSegment(p: Point, a: Point, b: Point) {
  const l2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2
  if (l2 === 0) return dist(p, a)
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2))
  return dist(p, lerp(a, b, t))
}

export function distanceToLine(p: Point, line: Point[]) {
  let best = Infinity
  for (let i = 1; i < line.length; i++) best = Math.min(best, distanceToSegment(p, line[i - 1], line[i]))
  return best
}

/** Réduit un tracé au doigt à quelques points (Ramer-Douglas-Peucker). */
export function simplify(line: Point[], tolerance: number): Point[] {
  if (line.length <= 2) return line
  const a = line[0]
  const b = line[line.length - 1]
  let index = 0
  let max = 0
  for (let i = 1; i < line.length - 1; i++) {
    const d = distanceToSegment(line[i], a, b)
    if (d > max) {
      max = d
      index = i
    }
  }
  if (max <= tolerance) return [a, b]
  return [...simplify(line.slice(0, index + 1), tolerance).slice(0, -1), ...simplify(line.slice(index), tolerance)]
}

/** Courbe lisse passant par tous les points (Catmull-Rom), renvoyée en petits segments. */
export function smooth(points: Point[], samples = 12): Point[] {
  if (points.length <= 2) return points
  const out: Point[] = [points[0]]
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? p2
    for (let s = 1; s <= samples; s++) {
      const t = s / samples
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (3 * b - a - 3 * c + d) * t * t * t)
      out.push({ x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) })
    }
  }
  return out
}

/** Raccourcit une ligne à ses deux extrémités (pour ne pas recouvrir les joueurs). */
export function trim(line: Point[], head: number, tail: number): Point[] {
  const total = length(line)
  if (total <= head + tail + 1) return line
  const out = [pointAtDistance(line, head)]
  let walked = 0
  for (let i = 1; i < line.length - 1; i++) {
    walked += dist(line[i - 1], line[i])
    if (walked > head && walked < total - tail) out.push(line[i])
  }
  out.push(pointAtDistance(line, total - tail))
  return out
}

/** Ligne ondulée (dribble), qui se termine droite pour que la flèche reste lisible. */
export function wavy(line: Point[], amplitude = 2, period = 8): Point[] {
  const total = length(line)
  const out: Point[] = []
  for (let d = 0; d < total; d += 0.8) {
    const p = pointAtDistance(line, d)
    const q = pointAtDistance(line, d + 0.8)
    const l = dist(p, q) || 1
    const fade = Math.max(0, Math.min(1, d / 4, (total - 6 - d) / 4))
    const o = Math.sin((d / period) * Math.PI * 2) * amplitude * fade
    out.push({ x: p.x - ((q.y - p.y) / l) * o, y: p.y + ((q.x - p.x) / l) * o })
  }
  out.push(line[line.length - 1])
  return out
}

export const toPath = (line: Point[]) =>
  line.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')

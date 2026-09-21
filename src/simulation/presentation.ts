import type {Vec3} from '../data/types';
import type {SceneCommand} from './types';

export const actionNames: Record<string, string> = {move: '沿径而行', visit: '寻人相访', talk: '低声叙话', read: '展卷细读', write: '提笔写字', rest: '停步静养', observe: '顾盼园景', wait: '稍候片刻'};

/** Sampling stays on the validated polyline, including bridges and courtyard gates. */
export function prepareRoute(points: Vec3[]) {
  const distances = [0];
  for (let i = 1; i < points.length; i++) distances.push(distances[i - 1] + Math.hypot(...points[i].map((v, n) => v - points[i - 1][n])));
  return {points, distances, length: distances.at(-1) ?? 0};
}
export function routePoint(route: ReturnType<typeof prepareRoute>, distance: number): Vec3 {
  if (!route.points.length) return [0, 0, 0];
  if (route.length < 1e-6) return [...route.points.at(-1)!];
  const d = Math.max(0, Math.min(route.length, distance));
  let i = 1;
  while (i < route.points.length - 1 && (route.distances[i] < d || route.distances[i] === route.distances[i - 1])) i++;
  const length = route.distances[i] - route.distances[i - 1];
  const t = length > 0 ? (d - route.distances[i - 1]) / length : 1;
  return route.points[i - 1].map((v, axis) => v + (route.points[i][axis] - v) * t) as Vec3;
}
export function commandDuration(command: SceneCommand, length: number) {
  if (length > .01) return Math.min(14, Math.max(1.4, length <= 18 ? length / 2.1 : 8.6 + Math.log1p((length - 18) / 22) * 2));
  if (command.action.action === 'talk') return Math.min(6, Math.max(3, (command.action.content?.length ?? 0) / 22));
  return command.action.action === 'write' || command.action.action === 'read' ? 3.4 : 2.5;
}
export function turnToward(current: number, target: number, delta: number) {
  const difference = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + difference * (1 - Math.exp(-10 * Math.min(delta, .1)));
}

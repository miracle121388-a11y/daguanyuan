import type {CanonData, Manifest, Vec3} from '../data/types';
import {agentIds, type AgentId} from './types';
import stage from '../../config/simulation.stage.json';

/** Staged walking approaches follow the existing Blender courtyard paving.
 * They add no buildings or canon. Blender x/y/z maps to Three x/z/-y.
 * See r8_courtyard.py, refined_modules.py and the GLB clearance report. */
export const courtRoutes = stage.courts as unknown as Record<string, {name: string; points: Vec3[]}>;
export function slotOffset(id: AgentId): Vec3 {
  const slot = agentIds.indexOf(id);
  return [slot % 2 ? .65 : -.65, 0, slot < 2 ? .65 : -.65];
}
export function courtPath(manifest: Manifest, placeId: string, agent: AgentId): Vec3[] {
  const place = manifest.places.find(p => p.id === placeId), route = courtRoutes[placeId];
  if (!place || !route) return [];
  const offset = slotOffset(agent);
  return route.points.map(point => point.map((v, i) => v + place.position[i] + offset[i]) as Vec3);
}
export function placeSetting(data: CanonData, id: string) {
  const place = data.places.find(p => p.id === id);
  return {id, name: place?.name ?? id, atmosphere: place?.theme ?? '园中停留',
    activities: id === 'qiushuangzhai' ? ['write', 'talk', 'read'] : id === 'xiaoxiangguan' ? ['write', 'read', 'rest'] : id === 'hengwuyuan' ? ['read', 'observe'] : ['observe', 'talk', 'rest'],
    spots: courtRoutes[id] ? ['gate', 'court'] : ['gate']};
}
export function spotName(data: CanonData, location: string, spot?: string) {
  const place = data.places.find(p => p.id === location)?.name ?? location;
  return spot === 'court' && courtRoutes[location] ? `${place} · ${courtRoutes[location].name}` : place;
}

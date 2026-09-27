import design from '../../config/simulation.characters.json';
import type {AgentId} from '../simulation/types';

export type CharacterDetail = 'high' | 'low';
export const characterRevision = design.revision;
export function characterDetail(focused: boolean, quality: 'high' | 'low', camera: string): CharacterDetail {
  return focused && (camera === 'portrait' || quality === 'high' && camera !== 'follow') ? 'high' : 'low';
}
export function characterAsset(id: AgentId, detail: CharacterDetail, base = '/'): string {
  return `${base}models/characters/${id}${detail === 'low' ? '-low' : ''}.glb?v=${characterRevision}`;
}
export function facePerformance(time: number, index: number, pose: string, motion: boolean, tea: boolean) {
  const phase = (time + index * 1.07) % 4.7;
  return {
    blink: motion && phase < .18 ? Math.sin(phase / .18 * Math.PI) : 0,
    speak: motion && pose === 'talk' ? .075 + .09 * Math.sin(time * 9) ** 2 : 0,
    grasp: pose === 'read' || pose === 'write' ? .48 : tea && pose === 'rest' ? .72 : pose === 'talk' ? .23 : .12,
  };
}

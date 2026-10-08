import {describe, expect, it} from 'vitest';
import {characterAsset, characterDetail, facePerformance} from '../src/scene/characterPresentation';

describe('character close-view presentation', () => {
  it('loads detailed anatomy only for the selected close view, with portrait as an explicit opt-in on mobile', () => {
    expect(characterDetail(false, 'high', 'portrait')).toBe('low');
    expect(characterDetail(true, 'high', 'follow')).toBe('low');
    expect(characterDetail(true, 'low', 'close')).toBe('low');
    expect(characterDetail(true, 'high', 'close')).toBe('high');
    expect(characterDetail(true, 'low', 'portrait')).toBe('high');
    expect(characterAsset('daiyu', 'low', '/garden/')).toMatch(/^\/garden\/models\/characters-stream\/daiyu-low\.glb\?v=/);
  });
  it('keeps all expressions bounded and disables facial motion when reduced motion is requested', () => {
    for (let i=0;i<470;i++) for (let person=0;person<4;person++) {
      for (const value of Object.values(facePerformance(i/100, person, 'talk', true, false))) {
        expect(value).toBeGreaterThanOrEqual(0); expect(value).toBeLessThanOrEqual(1);
      }
    }
    expect(facePerformance(.09, 0, 'talk', false, false)).toMatchObject({blink:0, speak:0});
    expect(facePerformance(.09, 0, 'observe', true, false).speak).toBe(0);
  });
  it('relaxes the fingers after a book or teacup is put away', () => {
    const rest=facePerformance(2, 0, 'observe', true, false).grasp;
    expect(facePerformance(2, 0, 'read', true, false).grasp).toBeGreaterThan(rest);
    expect(facePerformance(2, 0, 'rest', true, true).grasp).toBeGreaterThan(rest);
    expect(facePerformance(2, 0, 'rest', true, false).grasp).toBe(rest);
  });
});

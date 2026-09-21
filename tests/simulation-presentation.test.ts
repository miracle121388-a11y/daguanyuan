import {describe, expect, it} from 'vitest';
import {commandDuration, prepareRoute, routePoint, turnToward} from '../src/simulation/presentation';
import type {SceneCommand} from '../src/simulation/types';

describe('staged movement stays on the garden route', () => {
  it('walks around a right-angle wall rather than cutting through it', () => {
    const route = prepareRoute([[0,0,0],[0,0,5],[8,0,5]]);
    expect(route.length).toBe(13);
    expect(routePoint(route, 4)).toEqual([0,0,4]);
    expect(routePoint(route, 5)).toEqual([0,0,5]);
    expect(routePoint(route, 9)).toEqual([4,0,5]);
    for (let distance = 0; distance <= route.length; distance += .2) {
      const point = routePoint(route, distance);
      expect(point[0] === 0 || point[2] === 5).toBe(true);
    }
  });
  it('keeps the vertical profile of steps and bridge approaches', () => {
    const route = prepareRoute([[0,.1,0],[0,3.1,4],[0,3.1,9]]);
    expect(route.length).toBe(10);
    expect(routePoint(route, 2.5)).toEqual([0,1.6,2]);
    expect(routePoint(route, 7.5)).toEqual([0,3.1,6.5]);
  });
  it('handles repeated gate points, a stationary command and an empty route', () => {
    const route = prepareRoute([[1,2,3],[1,2,3],[1,2,6],[1,2,6]]);
    expect(routePoint(route, 0)).toEqual([1,2,3]);
    expect(routePoint(route, 2)).toEqual([1,2,5]);
    expect(routePoint(route, 3)).toEqual([1,2,6]);
    expect(routePoint(prepareRoute([[7,.2,4],[7,.2,4]]), 10)).toEqual([7,.2,4]);
    expect(routePoint(prepareRoute([]), 0)).toEqual([0,0,0]);
  });
  it('clamps overshoot to exact logical arrival and does not mutate route data', () => {
    const route = prepareRoute([[1,2,3],[4,6,3]]), original = structuredClone(route);
    expect(routePoint(route, -5)).toEqual([1,2,3]);
    expect(routePoint(route, 500)).toEqual([4,6,3]);
    routePoint(route, 0)[0] = 999;
    expect(route).toEqual(original);
  });
});

describe('visible action pacing and turns', () => {
  const command: SceneCommand = {action:{agent:'baoyu',action:'move',reason:''},path:[]};
  it('keeps a short walk readable and compresses a long journey into a bounded shot', () => {
    expect(commandDuration(command, .8)).toBeGreaterThanOrEqual(1.4);
    expect(commandDuration(command, 10)).toBeGreaterThan(4);
    expect(commandDuration(command, 250)).toBeGreaterThan(commandDuration(command, 10));
    expect(commandDuration(command, 1000)).toBeLessThanOrEqual(14);
  });
  it('leaves time to read dialogue and see a stationary reading pose', () => {
    expect(commandDuration({...command,action:{...command.action,action:'talk',content:'你好。'}},0)).toBe(3);
    expect(commandDuration({...command,action:{...command.action,action:'talk',content:'字'.repeat(600)}},0)).toBe(6);
    expect(commandDuration({...command,action:{...command.action,action:'read'}},0)).toBeGreaterThan(3);
  });
  it('turns across the angle seam by the short route, with no spin or overshoot', () => {
    const current = Math.PI - .1, target = -Math.PI + .1;
    const next = turnToward(current,target,1/60);
    expect(next).toBeGreaterThan(current);
    expect(next).toBeLessThan(Math.PI+.1);
    expect(turnToward(0,1,0)).toBe(0);
    expect(turnToward(0,1,10)).toBeLessThan(1);
  });
});

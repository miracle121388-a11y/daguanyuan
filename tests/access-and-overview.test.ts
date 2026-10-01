import {afterEach, expect, it, vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {PerspectiveCamera, Vector3} from 'three';
import {ACCESS_KEY, savedAccess, rememberAccess, verifyAccess} from '../src/simulation/access';
import {overviewFrame} from '../src/scene/overviewFraming';
import type {Manifest} from '../src/data/types';
afterEach(()=>vi.unstubAllGlobals());
it('remembers only the site pass separately from story saves and can forget it',()=>{
  const values=new Map([['daguanyuan.simulation.after80.v1','existing-story']]);
  vi.stubGlobal('localStorage',{getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>values.set(k,v),removeItem:(k:string)=>values.delete(k)});
  expect(savedAccess()).toBe('');expect(rememberAccess('site-pass')).toBe(true);expect(savedAccess()).toBe('site-pass');
  expect(values.get(ACCESS_KEY)).toBe('site-pass');expect(rememberAccess('')).toBe(true);expect(savedAccess()).toBe('');expect(values.get('daguanyuan.simulation.after80.v1')).toBe('existing-story');
});
it('handles unavailable browser storage and refuses invalid access responses',async()=>{
  vi.stubGlobal('localStorage',{getItem:()=>{throw new Error('denied');},setItem:()=>{throw new Error('denied');}});
  expect(savedAccess()).toBe('');expect(rememberAccess('pass')).toBe(false);
  vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({error:'口令不正确'}),{status:401})));
  await expect(verifyAccess('wrong')).rejects.toThrow('口令不正确');
});
it.each([[1440,770],[900,600],[390,560],[320,390]])('frames all garden walls and roof heights in %sx%s without distant-city bounds', (width,height)=>{
  const manifest=JSON.parse(readFileSync('public/scene-manifest.json','utf8')) as Manifest;
  for(const plan of [false,true]) {
    const fov=width<601?58:48, frame=overviewFrame(manifest,width,height,fov,plan);
    const camera=new PerspectiveCamera(fov,width/height,.65,1600);camera.position.fromArray(frame.position);camera.lookAt(...frame.target);camera.updateMatrixWorld();
    let maxX=0,maxY=0;
    for(const [x,z] of manifest.boundary!)for(const y of [0,Math.max(...manifest.places.map(p=>p.boundingBox.max[1]))]) {
      const point=new Vector3(x,y,z).project(camera);maxX=Math.max(maxX,Math.abs(point.x));maxY=Math.max(maxY,Math.abs(point.y));expect(point.z).toBeLessThan(1);
    }
    expect(maxX).toBeLessThan(.91);expect(maxY).toBeLessThan(.85);expect(Math.max(maxX/.9,maxY/.84)).toBeGreaterThan(.95);
    expect(frame.distance).toBeLessThan(1200);
  }
});

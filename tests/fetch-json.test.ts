import {afterEach,describe,expect,it,vi} from 'vitest';
import {fetchJson} from '../src/providers/fetchJson';
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers()});
describe('safe read recovery',()=>{
 it('recovers from a transient server failure',async()=>{
  vi.useFakeTimers();const fetch=vi.fn().mockResolvedValueOnce(new Response('',{status:503})).mockResolvedValueOnce(Response.json({ok:true}));vi.stubGlobal('fetch',fetch);
  const result=fetchJson('/data/places.json');await vi.runAllTimersAsync();expect(await result).toEqual({ok:true});expect(fetch).toHaveBeenCalledTimes(2);
 });
 it('does not retry a missing resource',async()=>{
  const fetch=vi.fn().mockResolvedValue(new Response('',{status:404}));vi.stubGlobal('fetch',fetch);
  await expect(fetchJson('/missing.json')).rejects.toThrow('轻量阅读');expect(fetch).toHaveBeenCalledTimes(1);
 });
 it('bounds a stalled response body and stops after three attempts',async()=>{
  vi.useFakeTimers();const fetch=vi.fn((_url,{signal})=>Promise.resolve({ok:true,json:()=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('aborted'))))}));vi.stubGlobal('fetch',fetch);
  const result=expect(fetchJson('/stalled.json',undefined,20)).rejects.toThrow('轻量阅读');await vi.runAllTimersAsync();await result;expect(fetch).toHaveBeenCalledTimes(3);
 });
 it('cancels retries when leaving the page',async()=>{
  vi.useFakeTimers();const controller=new AbortController();const fetch=vi.fn().mockRejectedValue(Error('network'));vi.stubGlobal('fetch',fetch);
  const pending=fetchJson('/data.json',controller.signal);const result=expect(pending).rejects.toBe('left');await vi.advanceTimersByTimeAsync(1);controller.abort('left');await result;await vi.runAllTimersAsync();expect(fetch).toHaveBeenCalledTimes(1);
 });
});

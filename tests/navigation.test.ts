import {describe,it,expect} from 'vitest';
import {GuidedTourController,shortestPath} from '../src/navigation/GuidedTourController';
import {LocalCanonProvider} from '../src/providers/LocalCanonProvider';
import events from '../data/canon/events.json';
import type {Manifest,CanonEvent} from '../src/data/types';
const m={pathNodes:[{id:'a',position:[0,0,0]},{id:'b',position:[10,0,0]},{id:'c',position:[10,0,10]}],pathEdges:[{from:'a',to:'b'},{from:'b',to:'c'}]} as Manifest;
describe('reachable navigation',()=>{it('turns through the path node, never cuts diagonally',()=>{expect(shortestPath(m,'a','c')).toEqual(['a','b','c']);const c=new GuidedTourController(m,'a','c');expect(c.at(12)).toEqual([10,0,2]);expect(c.at(99)).toEqual([10,0,10])});it('rejects disconnected destinations',()=>{expect(()=>shortestPath(m,'a','z')).toThrow()});it('is bidirectional',()=>expect(shortestPath(m,'c','a')).toEqual(['c','b','a']))});
describe('literary evidence',()=>{it('filters all events beyond reading progress',()=>{const result=LocalCanonProvider.visibleEvents(events as CanonEvent[],40);expect(result.length).toBeGreaterThan(5);expect(result.every(e=>e.chapter<=40)).toBe(true);expect(result.some(e=>e.id==='moon-poem')).toBe(false)});it('does not claim Xixiang reading took place in Xiaoxiang',()=>{const event=events.find(e=>e.id==='read-west')!;expect(event.canonicalPlaceId).toBeNull();expect(event.locationCertainty).toBe('display_only')});it('never treats a shared event as a residency',()=>{expect(events.find(e=>e.id==='granny-sleep')!.characterIds).not.toContain('baoyu')})});

import {readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';
import type {CanonData} from '../src/data/types';
import {editionCatalogSchema} from '../src/data/editions';
import {createJournal, currentWorld, restoreTick} from '../src/simulation/world';
import {forkStory} from '../src/simulation/story';
import {chooseEncounter, encounterFor, conversationContext, localConversation, recordConversation} from '../src/simulation/participation';
import {captureMoment} from '../src/dreams/moments';

const read=(file:string)=>JSON.parse(readFileSync(file,'utf8'));
const data={...Object.fromEntries(['places','characters','events','sources','relations','routes'].map(n=>[n,read(`data/canon/${n}.json`)])),manifest:read('public/scene-manifest.json'),editionCatalog:editionCatalogSchema.parse(read('data/canon/editionCatalog.json'))} as unknown as CanonData;
describe('art follows the player’s actual world',()=>{
  it('uses the resolved choice, distinct snapshot and selected edition while preserving the earlier moment',()=>{
    const prior=forkStory(createJournal(data,'guiyou108'),data,'hope-90'),before=captureMoment(prior,data,'choice','daiyu');
    const encounter=encounterFor(currentWorld(prior),'daiyu',data)!;
    const next=chooseEncounter(prior,data,'daiyu',encounter.id,encounter.choices[0].id),after=captureMoment(next,data,'choice','daiyu');
    expect(after.editionId).toBe('guiyou108');expect(after.chapter).toBe(90);expect(after.branch).toBe('if');
    expect(after.snapshotId).not.toBe(before.snapshotId);expect(after.text).toContain(currentWorld(next).resolvedEncounters!.at(-1)!.outcome);
    expect(captureMoment(prior,data,'choice','daiyu')).toEqual(before);
    expect(captureMoment(restoreTick(next,0),data,'choice','daiyu')).toEqual(before);
  });
  it('includes this person’s dialogue and excludes another person’s private conversation',()=>{
    let journal=createJournal(data);
    for(const [id,message] of [['baoyu','只有宝玉听见的暗号'],['daiyu','愿你今晚安心入梦']] as const){const ctx=conversationContext(currentWorld(journal),id,message,'chat',data);journal=recordConversation(journal,ctx,localConversation(ctx),'本地规则');}
    const art=captureMoment(journal,data,'conversation','daiyu');expect(art.text).toContain('愿你今晚安心入梦');expect(art.text).not.toContain('只有宝玉听见的暗号');
    currentWorld(journal).tick++;expect(captureMoment(journal,data,'manual','daiyu').text).not.toContain('玩家说：');
  });
  it('does not add departed characters to later-edition art',()=>{
    const journal=forkStory(createJournal(data,'cheng120'),data,'raid-105');
    const art=captureMoment(journal,data,'manual','wangxifeng');expect(art.cast).not.toContain('daiyu');expect(art.editionId).toBe('cheng120');expect(art.chapter).toBe(105);
  });
});

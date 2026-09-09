import type {Manifest,Vec3} from '../data/types';
export function shortestPath(manifest:Manifest,from:string,to:string):string[]{
 const queue=[[from]],seen=new Set([from]);
 for(const p of queue){if(p.at(-1)===to)return p;for(const e of manifest.pathEdges){const next=e.from===p.at(-1)?e.to:e.to===p.at(-1)?e.from:null;if(next&&!seen.has(next)){seen.add(next);queue.push([...p,next])}}}
 throw new Error(`无法连通 ${from} 与 ${to}`);
}
export class GuidedTourController {
 points:Vec3[]=[];distance=0;total=0;lengths:number[]=[];
 constructor(manifest:Manifest,from:string,to:string){this.points=shortestPath(manifest,from,to).map(id=>manifest.pathNodes.find(n=>n.id===id)!.position);for(let i=1;i<this.points.length;i++){const d=Math.hypot(...this.points[i].map((v,j)=>v-this.points[i-1][j]));this.lengths.push(d);this.total+=d}}
 at(distance:number):Vec3 {let d=distance;for(let i=0;i<this.lengths.length;i++){if(d<=this.lengths[i]){const t=d/this.lengths[i];return this.points[i].map((v,j)=>v+(this.points[i+1][j]-v)*t) as Vec3}d-=this.lengths[i]}return this.points.at(-1)!}
 tick(dt:number){this.distance=Math.min(this.total,this.distance+dt*18);return {position:this.at(this.distance),lookAhead:this.at(Math.min(this.total,this.distance+4)),done:this.distance>=this.total}}
}

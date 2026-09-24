import type {Manifest} from './types';
/** The map needs shoreline coordinates, not the WebGL engine. */
export function waterMapPath(lake:Manifest['lake']){
 const paths=[lake.outline??[],...(lake.holes??[])];
 return paths.filter(p=>p.length>2).map(p=>'M'+p.map(([x,y])=>`${x},${-y}`).join('L')+'Z').join('');
}

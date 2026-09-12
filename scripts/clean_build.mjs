import {existsSync,realpathSync,rmSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),target=path.resolve(root,'dist');
if(target!==path.join(root,'dist')||path.dirname(target)!==root)throw Error('Unexpected build directory');
if(existsSync(target)){if(realpathSync(target)!==target)throw Error('Refusing to clean a redirected build directory');rmSync(target,{recursive:true,force:true})}

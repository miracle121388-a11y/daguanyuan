import {renameSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
// The Windows workspace filesystem can reject Node's replace flags for a large
// mapped file. os.replace uses the host's atomic replacement operation.
export function replaceFile(source,target){
 try{renameSync(source,target)}catch(error){
  if(process.platform!=='win32'||!['EPERM','EACCES','UNKNOWN'].includes(error.code))throw error;
  execFileSync('python',['-c','import os,sys; os.replace(sys.argv[1],sys.argv[2])',source,target],{stdio:'pipe'});
 }
}

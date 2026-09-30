import {build} from 'esbuild';
import {mkdirSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
mkdirSync('.local/continuation-live',{recursive:true});
await build({entryPoints:['scripts/continuation_live.ts'],bundle:true,platform:'node',format:'esm',packages:'external',outfile:'.local/continuation-live/runner.mjs'});
await import(pathToFileURL(process.cwd()+'/.local/continuation-live/runner.mjs').href);

import {build} from 'esbuild';
import {mkdirSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
mkdirSync('.local/openstory-live',{recursive:true});
await build({entryPoints:['scripts/openstory_live.ts'],bundle:true,platform:'node',format:'esm',packages:'external',outfile:'.local/openstory-live/runner.mjs'});
await import(pathToFileURL(process.cwd()+'/.local/openstory-live/runner.mjs').href);

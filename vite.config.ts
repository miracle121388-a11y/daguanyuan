import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import {createSimulationApi} from './server/simulation-api.mjs';
import {createDreamApi} from './server/dream-api.mjs';
export default defineConfig(({mode}) => {
 const env=loadEnv(mode,process.cwd(),'');
 const attach=(server:import('vite').ViteDevServer|import('vite').PreviewServer)=>{
  const handler=createSimulationApi(env),dreams=createDreamApi(env);
  server.middlewares.use((req,res,next)=>{void dreams(req,res).then(handled=>handled||handler(req,res)).then(handled=>{if(!handled)next()}).catch(next)});
  server.httpServer?.once('close',()=>dreams.close());
 };
 return {base:'./',plugins:[react(),{name:'garden-simulation-api',configureServer:attach,configurePreviewServer:attach}],build:{manifest:true,chunkSizeWarningLimit:1200},server:{host:'127.0.0.1'}};
});

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import {createSimulationApi} from './server/simulation-api.mjs';
export default defineConfig(({mode}) => {
 const handler=createSimulationApi(loadEnv(mode,process.cwd(),''));
 const middleware=(req:import('node:http').IncomingMessage,res:import('node:http').ServerResponse,next:()=>void)=>{void handler(req,res).then(handled=>{if(!handled)next()})};
 return {base:'./',plugins:[react(),{name:'garden-simulation-api',configureServer(server){server.middlewares.use(middleware)},configurePreviewServer(server){server.middlewares.use(middleware)}}],build:{manifest:true,chunkSizeWarningLimit:1200},server:{host:'127.0.0.1'}};
});

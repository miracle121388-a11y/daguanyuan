import {chromium} from 'playwright';
import {writeFileSync} from 'node:fs';
import {replaceFile} from './atomic_replace.mjs';
const host='daguanyuan-rumeng.zeabur.app',ip=process.env.APP_RESOLVE_IP;
if(!ip)throw Error('Supply the public DNS address observed for this run');
const rows=[];
for(const [condition,args] of [['default',[]],['quic_disabled',['--disable-quic']],['public_dns',[`--host-resolver-rules=MAP ${host} ${ip}`]],['public_dns_and_quic_disabled',[`--host-resolver-rules=MAP ${host} ${ip}`,'--disable-quic']]]){
 const browser=await chromium.launch({channel:'msedge',headless:true,args}),page=await browser.newPage();const started=Date.now();
 try{const response=await page.goto('https://'+host+'/healthz',{timeout:20000});const health=await response.json();rows.push({condition,ok:response.ok(),status:response.status(),health,elapsedMs:Date.now()-started})}
 catch(error){rows.push({condition,ok:false,error:String(error).split('\n').slice(0,2).join(' '),elapsedMs:Date.now()-started})}
 finally{await browser.close()}
}
const target='reports/acceptance/public-transport-probe.json';
writeFileSync(target+'.next',JSON.stringify({at:new Date().toISOString(),url:'https://'+host+'/healthz',observedPublicAddress:ip,tlsVerificationEnabled:true,osSettingsChanged:false,scope:'Health request only. This does not test 3D loading or all visitors.',rows},null,2));replaceFile(target+'.next',target);
console.log(rows.map(r=>({condition:r.condition,ok:r.ok,elapsedMs:r.elapsedMs,error:r.error,revision:r.health?.revision})));

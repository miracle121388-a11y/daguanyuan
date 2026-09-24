import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
// Run only after data:build has validated and published the reviewed canon.
const names=['places','characters','events','sources'];
const inputs=Object.fromEntries(names.map(n=>[n,readFileSync(`public/data/${n}.json`)]));
const data=Object.fromEntries(names.map(n=>[n,JSON.parse(inputs[n])]));
for(const rows of [data.events,data.sources])if(rows.some(row=>row.reviewStatus!=='source_checked'))throw Error('Reading page requires reviewed canon');
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sources=ids=>(ids??[]).map(id=>{
 const source=data.sources.find(s=>s.id===id);if(!source)throw Error(`Unknown source ${id}`);
 const url=new URL(source.url);if(url.protocol!=='https:')throw Error('Source must use HTTPS');
 if(source.revisionId)url.searchParams.set('oldid',source.revisionId);
 return `<details><summary>${escape(source.title)} · 原文依据</summary><blockquote>${escape(source.evidenceExcerpt)}</blockquote><p>${escape(source.paragraphLocator)}</p><a href="${escape(url.href)}" rel="noreferrer">查看来源原文</a></details>`;
}).join('');
const section=(id,title,rows,body)=>`<section id="${id}"><h2>${title}</h2>${rows.map(row=>`<article id="${escape(row.id)}"><h3>${escape(row.name??row.title)}</h3>${body(row)}${sources(row.sourceRefs)}</article>`).join('')}</section>`;
const html=`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#182B33"><meta name="description" content="无需三维和脚本，阅读大观园的地点、人物与原文依据。"><title>大观园 · 轻量阅读</title><style>
*{box-sizing:border-box}html{background:#182B33;color:#F2E9D8;scroll-padding-top:20px}body{max-width:780px;margin:auto;padding:28px 22px 64px;font:17px/1.9 STSong,"Songti SC",SimSun,serif}h1,h2,h3{font-weight:400;line-height:1.4}h1{font-size:30px}h2{font-size:26px;margin-top:56px}h3{font-size:22px}p,blockquote{overflow-wrap:anywhere}a{color:#F2E9D8;text-underline-offset:5px}a:focus-visible,summary:focus-visible{outline:2px solid #F2E9D8;outline-offset:4px}nav{display:flex;gap:10px 24px;flex-wrap:wrap}nav a,summary{min-height:44px;padding:8px 0}article{padding:16px 0 28px;border-bottom:1px solid #60736F}details{margin:12px 0;background:#243C43;padding:0 14px;border-radius:4px}summary{cursor:pointer}blockquote{margin:12px 0;padding:0 8px}header p,article>small,details p{color:#C8C2B5}.places{margin-top:20px}footer{margin-top:40px;font-size:15px}::selection{background:#355158;color:#F2E9D8}@media(max-width:400px){body{padding:20px 16px;font-size:16px}}
</style></head><body><header><a href="./">返回三维游园</a><h1>大观园 · 轻量阅读</h1><p>这里无需加载三维园景，关闭脚本也能阅读。地点与人物为资料整理，空间布局为设计解释，原文依据单独列出。</p><p>情节可能涉及后续回目；故事列表默认收起。</p><nav aria-label="阅读目录"><a href="#places">园中景致</a><a href="#characters">园中人物</a><a href="#stories">回目与故事</a></nav><nav class="places" aria-label="地点目录">${data.places.map(p=>`<a href="#${escape(p.id)}">${escape(p.name)}</a>`).join('')}</nav></header><main>
${section('places','园中景致',data.places,p=>`<small>${escape(p.theme)} · 空间呈现属于设计解释</small><p>${escape(p.description)}</p>`)}
${section('characters','园中人物',data.characters,p=>`<p>${escape(p.shortBio)}</p>`)}
<section id="stories"><h2>回目与故事</h2>${data.events.map(e=>`<details><summary>第${escape(e.chapter)}回 · ${escape(e.title)}</summary><p>${escape(e.summary)}</p><p>原著情节摘要；展示位置不等同于原著明确地点。</p>${sources(e.sourceRefs)}</details>`).join('')}</section></main><footer>文学空间再现 · 非唯一考据复原。以上为已核查资料的轻量呈现，人物推演与作画请返回三维游园。<p><a href="#">回到页首</a> · <a href="./">进入三维游园</a></p></footer></body></html>`;
writeFileSync('dist/reading.html',html);
writeFileSync('reports/acceptance/reading-build.json',JSON.stringify({at:new Date().toISOString(),bytes:Buffer.byteLength(html),sha256:createHash('sha256').update(html).digest('hex'),sources:names.map(name=>({path:`public/data/${name}.json`,sha256:createHash('sha256').update(inputs[name]).digest('hex')})),counts:Object.fromEntries(names.map(n=>[n,data[n].length])),javascriptRequired:false,externalRuntimeRequests:0},null,2));
console.log(`Reading page: ${Buffer.byteLength(html)} bytes, no JavaScript or model requests`);

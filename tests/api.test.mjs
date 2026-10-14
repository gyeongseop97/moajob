import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {createAppServer} from '../server.mjs';
import {jobkoreaHtml,saraminHtml,incruitData,detailHtml} from './fixtures.mjs';

let server,origin,blockDetails=false;
const calls=[];
const fetcher=async value=>{
  const url=new URL(value);calls.push(url);
  if(url.hostname==='www.jobkorea.co.kr'&&url.pathname.startsWith('/Recruit/GI_Read/'))return blockDetails?new Response('Blocked',{status:403}):new Response(detailHtml(url.pathname.split('/').at(-1)));
  if(url.hostname==='www.jobkorea.co.kr'&&url.pathname.startsWith('/Search'))return new Response(jobkoreaHtml);
  if(url.hostname==='www.saramin.co.kr'&&url.pathname==='/zf_user/search')return new Response(saraminHtml);
  if(url.hostname==='jlab.incruit.com'&&url.pathname==='/lab/api/mobile/search')return Response.json(incruitData);
  throw new Error('Unexpected fixture destination');
};
before(async()=>{
  server=createAppServer({fetcher});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  origin='http://127.0.0.1:'+server.address().port;
});
after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));});

test('root, HTML, assets, HEAD and health work without the original hosting runtime',async()=>{
  const root=await fetch(origin+'/',{redirect:'manual'});assert.equal(root.status,302);assert.equal(root.headers.get('location'),'/explore');
  for(const name of ['/explore','/explore.html','/app.js','/core.js','/domain.js','/style.css']){
    const response=await fetch(origin+name);assert.equal(response.status,200);assert.ok((await response.text()).length>100);assert.equal(response.headers.get('x-content-type-options'),'nosniff');
  }
  const head=await fetch(origin+'/explore',{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');
  assert.equal((await (await fetch(origin+'/health')).json()).status,'ok');
});

test('private files and source folders are not served as static assets',async()=>{
  for(const route of ['/.env','/server.mjs','/package.json','/.git/config','/lib/job-search.mjs','/%2e%2e%2fserver.mjs'])assert.equal((await fetch(origin+route)).status,404);
});

test('invalid queries, sources and pages are rejected before any provider call',async()=>{
  const previous=calls.length;
  for(const query of ['', '?q=', '?q=x&sources=unknown', '?q=x&sources=jobkorea&pages=nope', '?q=x&sources=jobkorea&pages=%7B%22jobkorea%22%3A0%7D'])assert.equal((await fetch(origin+'/api/search'+query)).status,400);
  assert.equal(calls.length,previous);
});

test('three providers return the same search contract used by the existing UI',async()=>{
  const response=await fetch(origin+'/api/search?q=offline-test&sources=saramin,jobkorea,incruit&fresh=1');assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'private, no-store');
  const data=await response.json();assert.equal(data.jobs.length,3);assert.ok(data.sources.every(row=>row.status==='ok'));assert.ok(data.sources.every(row=>row.nextPage===2));assert.equal(new Set(data.jobs.map(job=>job.id)).size,3);
});

test('page parameters and fresh searches reach the intended public search path',async()=>{
  const pages=encodeURIComponent(JSON.stringify({jobkorea:2}));const response=await fetch(origin+'/api/search?q=page-test&sources=jobkorea&pages='+pages+'&fresh=1');assert.equal(response.status,200);
  const data=await response.json();assert.equal(data.sources[0].page,2);assert.equal(calls.at(-1).searchParams.get('Page_No'),'2');assert.equal(calls.at(-1).origin,'https://www.jobkorea.co.kr');
});

test('unconnected sources are reported without a fake empty success',async()=>{
  const previous=calls.length,data=await (await fetch(origin+'/api/search?q=x&sources=wanted')).json();assert.equal(data.sources[0].status,'not_connected');assert.equal(data.jobs.length,0);assert.equal(calls.length,previous);
});

test('detail refresh returns verified fields and preserves a source failure as a failure',async()=>{
  const options={method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids:['live-jobkorea-901'],fresh:true})};
  const response=await fetch(origin+'/api/jobs/refresh',options);assert.equal(response.status,200);const data=await response.json();assert.equal(data.results[0].status,'ok');assert.equal(data.results[0].patch.employment,'정규직');assert.equal(data.results[0].patch.salary,'연봉 4,000~5,000만원');
  blockDetails=true;try{const failed=await (await fetch(origin+'/api/jobs/refresh',options)).json();assert.equal(failed.results[0].status,'blocked');assert.equal(failed.results[0].patch,undefined);}finally{blockDetails=false;}
});

test('method and refresh body validation reject unsupported requests',async()=>{
  assert.equal((await fetch(origin+'/api/search?q=x',{method:'POST'})).status,405);
  assert.equal((await fetch(origin+'/api/jobs/refresh')).status,405);
  for(const body of ['{',JSON.stringify({ids:['https://localhost/']}),JSON.stringify({ids:[]})])assert.equal((await fetch(origin+'/api/jobs/refresh',{method:'POST',body})).status,400);
  assert.equal((await fetch(origin+'/api/jobs/refresh',{method:'POST',body:'x'.repeat(5000)})).status,413);
});

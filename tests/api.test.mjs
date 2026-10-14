import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {createAppServer} from '../server.mjs';
import {jobkoreaHtml,saraminHtml,incruitData,detailHtml,wantedData,wantedDetailHtml} from './fixtures.mjs';

let server,origin,blockDetails=false;
const calls=[];
const fetcher=async value=>{
  const url=new URL(value);calls.push(url);
  if(url.hostname==='www.jobkorea.co.kr'&&url.pathname.startsWith('/Recruit/GI_Read/'))return blockDetails?new Response('Blocked',{status:403}):new Response(detailHtml(url.pathname.split('/').at(-1)));
  if(url.hostname==='www.jobkorea.co.kr'&&url.pathname.startsWith('/Search'))return new Response(jobkoreaHtml);
  if(url.hostname==='www.saramin.co.kr'&&url.pathname==='/zf_user/search')return new Response(saraminHtml);
  if(url.hostname==='jlab.incruit.com'&&url.pathname==='/lab/api/mobile/search')return Response.json(incruitData);
  if(url.hostname==='www.wanted.co.kr'&&url.pathname==='/api/v4/jobs')return Response.json(wantedData(url.searchParams.get('query'),Number(url.searchParams.get('offset'))));
  if(url.hostname==='www.wanted.co.kr'&&url.pathname.startsWith('/wd/'))return new Response(wantedDetailHtml(url.pathname.split('/').at(-1)));
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
  for(const name of ['/explore','/explore.html','/app.js','/core.js','/domain.js','/style.css','/config.js','/backend.js']){
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
  const previous=calls.length,data=await (await fetch(origin+'/api/search?q=x&sources=remember')).json();assert.equal(data.sources[0].status,'not_connected');assert.equal(data.jobs.length,0);assert.equal(calls.length,previous);
});

test('Wanted supports keyword searches, offset pagination and detail refresh',async()=>{
 const q='뷰티 디자이너',pages=encodeURIComponent(JSON.stringify({wanted:2}));
 const data=await (await fetch(origin+'/api/search?q='+encodeURIComponent(q)+'&sources=wanted&pages='+pages+'&fresh=1')).json();
 assert.equal(data.sources[0].status,'ok');assert.equal(data.sources[0].nextPage,3);assert.equal(data.jobs[0].id,'live-wanted-905');
 assert.equal(calls.at(-1).searchParams.get('query'),q);assert.equal(calls.at(-1).searchParams.get('offset'),'20');assert.equal(calls.at(-1).searchParams.get('limit'),'20');
 const detail=await (await fetch(origin+'/api/jobs/refresh',{method:'POST',body:JSON.stringify({ids:['live-wanted-905'],fresh:true})})).json();
 assert.equal(detail.results[0].status,'ok');assert.equal(detail.results[0].patch.employment,'정규직');assert.equal(detail.results[0].patch.salary,undefined);
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

test('GitHub Pages can verify the server and read search responses',async()=>{
  const headers={Origin:'https://gyeongseop97.github.io'};
  const health=await fetch(origin+'/health',{headers});
  assert.equal(health.headers.get('access-control-allow-origin'),headers.Origin);
  assert.equal((await health.json()).service,'moajob');
  const response=await fetch(origin+'/api/search?q=pages-test&sources=jobkorea',{headers});
  assert.equal(response.status,200);
  assert.equal(response.headers.get('access-control-allow-origin'),headers.Origin);
  assert.equal(response.headers.get('vary'),'Origin');
  assert.equal((await response.json()).jobs.length,1);
});

test('cross-origin detail refresh supports the JSON preflight and POST',async()=>{
  const source='https://gyeongseop97.github.io';
  const preflight=await fetch(origin+'/api/jobs/refresh',{method:'OPTIONS',headers:{Origin:source,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type'}});
  assert.equal(preflight.status,204);
  assert.equal(preflight.headers.get('access-control-allow-origin'),source);
  assert.equal(preflight.headers.get('access-control-allow-methods'),'POST');
  const response=await fetch(origin+'/api/jobs/refresh',{method:'POST',headers:{Origin:source,'Content-Type':'application/json'},body:JSON.stringify({ids:['live-jobkorea-901'],fresh:true})});
  assert.equal(response.status,200);
  assert.equal(response.headers.get('access-control-allow-origin'),source);
  assert.equal((await response.json()).results[0].status,'ok');
});

test('unapproved origins and preflight requests never call a provider',async()=>{
  const count=calls.length;
  const blocked=await fetch(origin+'/api/search?q=blocked',{headers:{Origin:'https://unapproved.example'}});
  assert.equal(blocked.status,403);assert.equal(blocked.headers.get('access-control-allow-origin'),null);
  for(const headers of [
    {Origin:'https://unapproved.example','Access-Control-Request-Method':'POST'},
    {Origin:'https://gyeongseop97.github.io','Access-Control-Request-Method':'DELETE'},
    {Origin:'https://gyeongseop97.github.io','Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization'},
  ])assert.equal((await fetch(origin+'/api/jobs/refresh',{method:'OPTIONS',headers})).status,403);
  assert.equal(calls.length,count);
  const badQuery=await fetch(origin+'/api/search?q=',{headers:{Origin:'https://gyeongseop97.github.io'}});
  assert.equal(badQuery.status,400);assert.equal(badQuery.headers.get('access-control-allow-origin'),'https://gyeongseop97.github.io');
});

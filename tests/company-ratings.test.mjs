import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCompanyRatings,getCompanyRating} from '../lib/company-ratings.mjs';
import {createAppServer} from '../server.mjs';

const row=(name='(주)테스트기업',company_id=1001,rate_total_avg=3.7)=>({name,company_id,rate_total_avg});
const state=(items,extra={})=>({queries:[{queryKey:['search','companyList',{query:'테스트기업'}],state:{data:{pages:[{items,total_page:1,...extra}]}}},{queryKey:['search','recommend'],state:{data:{items:[row('다른기업',999,4.9)]}}}]});
const html=data=>'<script>window["__RQ_R_test"] = [];window["__RQ_R_test"].push('+JSON.stringify(data)+');</script>';

test('public search ratings require exact company identity and ignore recommendations',()=>{
 const result=parseCompanyRatings(html(state([row(),row('테스트기업판매',1002,4.9)])),'테스트기업');
 assert.equal(result.rating,3.7);assert.equal(result.reviewUrl,'https://www.jobplanet.co.kr/companies/1001/reviews');
 assert.equal(parseCompanyRatings(html(state([row('테스트기업판매')])),'테스트기업').status,'not_found');
 for(const rating of [null,0,'3.7',6])assert.equal(parseCompanyRatings(html(state([row(undefined,1001,rating)])),'테스트기업').status,'unrated');
 assert.throws(()=>parseCompanyRatings('<h1>Access denied</h1>','테스트기업'));
});

test('namesakes and incomplete search pages never get an arbitrary rating',()=>{
 assert.equal(parseCompanyRatings(html(state([row(),row('테스트기업(주)',1002,1.5)])),'테스트기업').status,'ambiguous');
 assert.equal(parseCompanyRatings(html(state([row()],{total_page:2})),'테스트기업').status,'ambiguous');
});

test('React streamed hydration is parsed as JSON without executing scripts',()=>{
 const stream='<script>self.__next_f.push('+JSON.stringify([1,'d:'+JSON.stringify({hydrationState:state([row()])})+'\n'])+')</script>';
 assert.equal(parseCompanyRatings(stream,'테스트기업').rating,3.7);
});

test('lookups coalesce repeated companies and retain blocked or malformed responses as failures',async()=>{
 let count=0;const fetcher=async url=>{count++;assert.equal(url.origin,'https://www.jobplanet.co.kr');return new Response(html(state([row()])));};
 const results=await Promise.all([getCompanyRating('테스트기업',fetcher),getCompanyRating('㈜테스트기업',fetcher)]);
 assert.equal(count,1);assert.ok(results.every(r=>r.rating===3.7&&r.checkedAt));
 assert.equal((await getCompanyRating('테스트기업',async()=>new Response('blocked',{status:403}))).status,'blocked');
 assert.equal((await getCompanyRating('테스트기업',async()=>new Response('changed format'))).status,'error');
});

test('rating endpoint validates queries, supports GitHub Pages CORS and returns verified scores',async()=>{
 let count=0;const server=createAppServer({fetcher:async()=>{count++;return new Response(html(state([row()])));}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 try{
  const response=await fetch(origin+'/api/companies/rating?company='+encodeURIComponent('테스트기업'),{headers:{Origin:'https://gyeongseop97.github.io'}});
  assert.equal(response.status,200);assert.equal(response.headers.get('access-control-allow-origin'),'https://gyeongseop97.github.io');assert.equal((await response.json()).rating,3.7);
  assert.equal((await fetch(origin+'/api/companies/rating')).status,400);
  assert.equal((await fetch(origin+'/api/companies/rating?company=x',{method:'POST'})).status,405);
  assert.equal((await fetch(origin+'/api/companies/rating?company=x',{headers:{Origin:'https://unapproved.example'}})).status,403);
  assert.equal(count,1);
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});

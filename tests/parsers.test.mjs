import test from 'node:test';
import assert from 'node:assert/strict';
import {parseJobkorea,parseSaramin,parseIncruitData,parseWantedData,experience,plainText,searchJobs} from '../lib/job-search.mjs';
import {canonicalJob,parseJobDetail,checkJobs} from '../lib/job-details.mjs';
import {jobkoreaHtml,saraminHtml,incruitData,detailHtml,wantedData,wantedDetailHtml} from './fixtures.mjs';

test('public search parsers retain canonical links, raw conditions and unknown fields',()=>{
  const jk=parseJobkorea(jobkoreaHtml),sa=parseSaramin(saraminHtml),ic=parseIncruitData(incruitData);
  assert.equal(jk[0].url,'https://www.jobkorea.co.kr/Recruit/GI_Read/901');assert.equal(jk[0].min,3);assert.equal(jk[0].employment,'고용형태 미기재');
  assert.equal(sa[0].url,'https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=902');assert.equal(sa[0].employment,'정규직');assert.equal(sa[0].education,'대졸 이상');
  assert.equal(ic[0].url,'https://jlab.incruit.com/jobs/903');assert.equal(ic[0].min,2);assert.equal(ic[0].max,5);assert.ok(ic[0].deadline);
  assert.equal(experience('신입/경력(2년↓)').max,2);assert.equal(plainText('A&amp;B <b>기획</b>'),'A&B 기획');
});

test('detail parsing accepts only the requested posting identity',()=>{
  const result=parseJobDetail(detailHtml('901'),canonicalJob('live-jobkorea-901'));assert.equal(result.checkStatus,'ok');assert.equal(result.employment,'정규직');
  assert.throws(()=>canonicalJob('https://localhost/'));assert.throws(()=>parseJobDetail(detailHtml('901'),canonicalJob('live-jobkorea-999')));
});

test('an external redirect is not followed by the detail connector',async()=>{
  let requests=0;const result=await checkJobs(['live-jobkorea-904'],async()=>{requests++;return new Response(null,{status:302,headers:{location:'http://127.0.0.1/private'}});},{fresh:true});
  assert.equal(requests,1);assert.equal(result.results[0].status,'error');
});

test('a blocked provider retains the same page for a later retry',async()=>{
  const result=await searchJobs('blocked-test',['jobkorea'],async()=>new Response('Blocked',{status:403}),{jobkorea:3},{fresh:true});assert.equal(result.sources[0].status,'blocked');assert.equal(result.sources[0].nextPage,3);assert.equal(result.sources[0].hasMore,true);
});

test('Wanted retains unknown fields, ignores hidden postings and rejects a changed schema',()=>{
 const data=wantedData();data.data.push({...data.data[0],id:906,hidden:true},{...data.data[0],id:907,status:'inactive'},data.data[0]);
 const [job]=parseWantedData(data);assert.equal(parseWantedData(data).length,1);assert.equal(job.min,0);assert.equal(job.max,3);assert.equal(job.salary,'급여 미기재');assert.equal(job.employment,'고용형태 미기재');assert.equal(job.published,null);assert.equal(job.deadlineLabel,'상시채용');
 assert.throws(()=>parseWantedData({data:[],links:{}}));assert.throws(()=>parseWantedData({data:{},links:{next:null}}));
 assert.equal(parseWantedData({data:[],links:{next:null}}).length,0);
 assert.equal(canonicalJob(job.id).url,job.url);assert.equal(parseJobDetail(wantedDetailHtml(),canonicalJob(job.id)).employment,'정규직');
 const addressRecord={'@type':'JobPosting',url:job.url,jobLocation:{address:{addressRegion:'서울',addressLocality:'강남구',streetAddress:'서울 영등포구 선유로13길 25'}}};
 assert.equal(parseJobDetail('<script type="application/ld+json">'+JSON.stringify(addressRecord)+'</script>',canonicalJob(job.id)).location,'서울 영등포구 선유로13길 25');
 assert.throws(()=>parseJobDetail(wantedDetailHtml('1905'),canonicalJob(job.id)));
});

test('Wanted preserves failed pages and never follows a foreign pagination URL',async()=>{
 const blocked=await searchJobs('wanted-block-test',['wanted'],async()=>new Response('',{status:403}),{wanted:3},{fresh:true});assert.equal(blocked.sources[0].status,'blocked');assert.equal(blocked.sources[0].nextPage,3);
 const data=wantedData('foreign-next');data.links.next='https://outside.example/api/v4/jobs?query=foreign-next&offset=20';let calls=0;
 const result=await searchJobs('foreign-next',['wanted'],async()=>{calls++;return Response.json(data);},{},{fresh:true});assert.equal(result.sources[0].status,'error');assert.equal(calls,1);assert.equal(result.jobs.length,0);
});

test('Jobkorea placeholder dates are ongoing and detail metadata overrides a synthetic validThrough',()=>{
 const record={id:'901',title:'서비스 기획 담당자',companyName:'테스트기업',applicationPeriod:{end:'2070-01-01T00:00:00+09:00'},createdAt:'2026-10-12T10:00:00+09:00'};
 const html=jobkoreaHtml+'<script>self.__next_f.push('+JSON.stringify([1,'a:'+JSON.stringify(record)+'\n'])+')</script>';
 const job=parseJobkorea(html)[0];assert.equal(job.deadline,null);assert.equal(job.deadlineLabel,'상시 / 채용 시');assert.equal(job.published,'2026-10-12');
 const detail=parseJobDetail('<meta name="description" content="경력: 경력 3년, 마감일 : 상시채용">'+detailHtml(),canonicalJob('live-jobkorea-901'));
 assert.equal(detail.deadline,null);assert.equal(detail.deadlineLabel,'상시채용');assert.equal(detail.availability,'unknown');
 record.applicationPeriod.end='2027-01-01T23:00:00+09:00';
 const normal=parseJobkorea(jobkoreaHtml+'<script>self.__next_f.push('+JSON.stringify([1,'a:'+JSON.stringify(record)+'\n'])+')</script>')[0];assert.equal(normal.deadline,'2027-01-01');
});

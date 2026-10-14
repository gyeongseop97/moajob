import test from 'node:test';
import assert from 'node:assert/strict';
import {parseJobkorea,parseSaramin,parseIncruitData,experience,plainText,searchJobs} from '../lib/job-search.mjs';
import {canonicalJob,parseJobDetail,checkJobs} from '../lib/job-details.mjs';
import {jobkoreaHtml,saraminHtml,incruitData,detailHtml} from './fixtures.mjs';

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

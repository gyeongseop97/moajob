import {enrichJobkoreaListing} from './listing-metadata.mjs';
import {cachedDetail} from './detail-cache.mjs';
const ORIGIN='https://www.jobkorea.co.kr',cache=new Map();
export function plainText(value){return String(value||'').replace(/<!--[\s\S]*?-->/g,' ').replace(/<[^>]*>/g,'').replace(/&(amp|quot|apos|lt|gt|nbsp);/g,(_,n)=>({amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',nbsp:' '})[n]).replace(/&#(x[0-9a-f]+|\d+);/gi,(_,n)=>{const cp=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):parseInt(n,10);return cp>0&&cp<=0x10ffff?String.fromCodePoint(cp):'';}).replace(/\s+/g,' ').trim();}
export function experience(raw){
 const value=plainText(raw),both=/신입.*경력/.test(value),range=value.match(/(\d+)\s*[~–-]\s*(\d+)\s*년/),limit=value.match(/(\d+)\s*년\s*(?:↓|이하)/);
 if(/경력\s*무관/.test(value))return{min:0,max:null,experienceText:value};
 if(range)return{min:both?0:Number(range[1]),max:Number(range[2]),experienceText:value};
 if(limit)return{min:0,max:Number(limit[1]),experienceText:value};
 if(both)return{min:0,max:null,experienceText:value};if(value==='신입')return{min:0,max:0,experienceText:value};
 const minimum=value.match(/경력\s*(\d+)\s*년/);if(minimum)return{min:Number(minimum[1]),max:null,experienceText:value};
 return{min:null,max:null,experienceText:value||'경력 미기재'};
}
const regions=['서울','경기','인천','부산','대구','광주','대전','울산','세종','강원','충북','충남','전북','전남','경북','경남','제주'];
function regionOf(location){return /원격|재택/.test(location)?'원격':regions.find(r=>location.startsWith(r))||(/해외/.test(location)?'해외':'기타');}
function dateOnly(raw){const v=String(raw||'').replace(/[^0-9]/g,'').slice(0,8);if(v.length!==8)return null;const iso=v.slice(0,4)+'-'+v.slice(4,6)+'-'+v.slice(6);return Number.isFinite(Date.parse(iso))&&new Date(iso).toISOString().slice(0,10)===iso?iso:null;}
function deadlineDate(label,fetchedAt){
 const today=new Date(new Date(fetchedAt).getTime()+9*3600000).toISOString().slice(0,10),days=/오늘\s*마감/.test(label)?0:label.match(/^D\s*-\s*(\d+)$/i)?.[1];
 if(days!==undefined)return new Date(Date.parse(today)+Number(days)*86400000).toISOString().slice(0,10);
 const md=label.match(/~?\s*(\d{1,2})\/(\d{1,2})/);if(!md)return null;
 let year=Number(today.slice(0,4)),candidate=year+'-'+md[1].padStart(2,'0')+'-'+md[2].padStart(2,'0');if(Date.parse(candidate)<Date.parse(today)-180*86400000)candidate=++year+candidate.slice(4);return dateOnly(candidate);
}
function base(source,id,company,title,location,fetchedAt){return{id:'live-'+source+'-'+id,source,kind:'live',company:plainText(company).slice(0,100),title:plainText(title).slice(0,180),region:regionOf(location),location:location.slice(0,150),tags:[],tasks:[],category:'실제 검색 결과',published:null,deadline:null,education:'학력 미기재',fetchedAt};}
export function parseJobkorea(html,{fetchedAt=new Date().toISOString()}={}){
 const jobs=[],seen=new Set();
 for(const segment of html.split('data-sentry-component="CardJob"').slice(1)){
  const a=segment.match(/<a\b(?=[^>]*data-sentry-component="Title")(?=[^>]*href="([^"]+)")[^>]*>([\s\S]*?)<\/a>/i);if(!a)continue;
  let url;try{url=new URL(plainText(a[1]),ORIGIN);}catch{continue;}
  const id=url.pathname.match(/^\/Recruit\/GI_Read\/(\d+)$/i)?.[1];if(url.origin!==ORIGIN||!id||seen.has(id))continue;
  const title=plainText(a[2]),company=plainText(segment.match(/<span\b[^>]*class="[^"]*text-typo-b2-16[^"]*"[^>]*>([\s\S]*?)<\/span>/i)?.[1]);if(!title||!company)continue;
  const location=plainText(segment.match(/<span\b[^>]*class="[^"]*text-typo-b4-14[^"]*"[^>]*>([\s\S]*?)<\/span>/i)?.[1])||'지역 미기재',text=plainText(segment.split('<script')[0].slice(0,16000)),rawExperience=segment.match(/<span\b[^>]*class="[^"]*text-gray700[^"]*text-typo-c1-13[^"]*"[^>]*>([\s\S]*?)<\/span>/i)?.[1];
  const salary=text.match(/(?:연봉|월급|시급)\s*[\d,]+(?:만원|원)(?:\s*[~–-]\s*[\d,]+(?:만원|원))?\s*[~↑]?/)?.[0]||'급여 미기재';
  jobs.push({...base('jobkorea',id,company,title,location,fetchedAt),...experience(rawExperience),employment:'고용형태 미기재',salary,url:ORIGIN+'/Recruit/GI_Read/'+id});seen.add(id);if(jobs.length>=80)break;
 }return enrichJobkoreaListing(jobs,html,fetchedAt,plainText);
}
export function parseIncruit(html,{fetchedAt=new Date().toISOString()}={}){
 const jobs=[],seen=new Set();
 for(const [,id,card] of html.matchAll(/<a\b[^>]*href="(?:https:\/\/jlab\.incruit\.com)?\/jobs\/(\d+)"[^>]*>([\s\S]*?)<\/a>/g)){
  if(seen.has(id))continue;const company=plainText(card.match(/class="nms-job-card__company"[^>]*>([\s\S]*?)<\/span>/)?.[1]),title=plainText(card.match(/class="nms-job-card__title"[^>]*>([\s\S]*?)<span\b[^>]*class="nms-job-card__meta"/)?.[1]),meta=plainText(card.match(/class="nms-job-card__meta"[^>]*>([\s\S]*?)<span\b[^>]*class="nms-job-card__dday"/)?.[1]).split('·').map(x=>x.trim());if(!company||!title||meta.length<3)continue;
  const deadlineLabel=plainText(card.match(/class="nms-job-card__dday"[^>]*>([\s\S]*?)<\/span>/)?.[1]);
  jobs.push({...base('incruit',id,company,title,meta[0],fetchedAt),...experience(meta[1]),employment:meta[2]||'고용형태 미기재',salary:meta[3]||'급여 미기재',deadlineLabel,deadline:deadlineDate(deadlineLabel,fetchedAt),url:'https://jlab.incruit.com/jobs/'+id});seen.add(id);if(jobs.length>=80)break;
 }return jobs;
}
export function parseIncruitData(data,{fetchedAt=new Date().toISOString()}={}){
 if(data?.success!==true||!Array.isArray(data.docs)||!Number.isInteger(data.numFound))throw new Error('Changed search response');
 const seen=new Set();return data.docs.slice(0,80).flatMap(doc=>{
  const id=String(doc.jobId||'');if(!/^\d+$/.test(id)||seen.has(id)||!doc.companyNm||!doc.title)return[];seen.add(id);const label=plainText(doc.dDay),location=plainText(doc.regionNm)||'지역 미기재';
  return[{...base('incruit',id,doc.companyNm,doc.title,location,fetchedAt),...experience(doc.careerNm),employment:plainText(doc.employTyNm)||'고용형태 미기재',salary:plainText(doc.salaryNm)||'급여 미기재',education:plainText(doc.scholNm)||'학력 미기재',category:plainText(doc.pstnNm).slice(0,160)||'실제 검색 결과',tags:plainText(doc.occuNm).split(',').filter(Boolean).slice(0,12).map(t=>t.split('>').at(-1)),published:dateOnly(doc.regDate),deadlineLabel:label,deadline:deadlineDate(label,fetchedAt),url:'https://jlab.incruit.com/jobs/'+id}];
 });
}
export function parseSaramin(html,{fetchedAt=new Date().toISOString()}={}){
 const section=html.split('id="recruit_info_list"')[1]?.split('id="company_info"')[0]||'',jobs=[],seen=new Set();
 for(const card of section.split(/<div\b[^>]*class="item_recruit"/).slice(1)){
  const heading=card.match(/<h2\b[^>]*class="job_tit"[^>]*>([\s\S]*?)<\/h2>/)?.[1]||'',link=heading.match(/href="([^"]+)"/)?.[1];if(!link)continue;let url;try{url=new URL(plainText(link),'https://www.saramin.co.kr');}catch{continue;}
  const id=url.searchParams.get('rec_idx');if(url.origin!=='https://www.saramin.co.kr'||!/^\d+$/.test(id||'')||seen.has(id))continue;
  const title=plainText(heading),company=plainText(card.match(/<strong\b[^>]*class="corp_name"[^>]*>([\s\S]*?)<\/strong>/)?.[1]);if(!title||!company)continue;
  const conditions=card.match(/<div\b[^>]*class="job_condition"[^>]*>([\s\S]*?)<\/div>/)?.[1]||'',fields=[...conditions.matchAll(/<span\b[^>]*>([\s\S]*?)<\/span>/g)].map(m=>plainText(m[1])),location=fields[0]||'지역 미기재',deadlineLabel=plainText(card.match(/<span\b[^>]*class="date"[^>]*>([\s\S]*?)<\/span>/)?.[1]);
  const sector=card.match(/<div\b[^>]*class="job_sector"[^>]*>([\s\S]*?)<\/div>/)?.[1]||'',tags=[...sector.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/g)].map(m=>plainText(m[1])).filter(Boolean),registered=plainText(sector.match(/class="job_day"[^>]*>([\s\S]*?)<\/span>/)?.[1]).match(/등록일\s*(\d{2})\/(\d{2})\/(\d{2})/);
  jobs.push({...base('saramin',id,company,title,location,fetchedAt),...experience(fields[1]),education:fields[2]||'학력 미기재',employment:fields[3]||'고용형태 미기재',salary:fields.slice(4).join(' ')||'급여 미기재',tags,category:tags.slice(0,2).join(' · ')||'실제 검색 결과',published:registered?dateOnly('20'+registered.slice(1).join('')):null,deadlineLabel,deadline:deadlineDate(deadlineLabel,fetchedAt),url:'https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx='+id});seen.add(id);if(jobs.length>=80)break;
 }return jobs;
}
const notConnected={wanted:'현재 검색 결과 수집은 연결 전입니다. 시험 접속에서 접근 제한 응답이 확인되었습니다.',remember:'현재 검색 결과 수집은 연결 전입니다. 시험 접속에서 접근 제한 응답이 확인되었습니다.'};
const connectors={jobkorea:{origin:ORIGIN,path:'/Search/',parameter:'stext',pageParameter:'Page_No',name:'잡코리아',marker:'CardJob',parse:parseJobkorea},saramin:{origin:'https://www.saramin.co.kr',path:'/zf_user/search',parameter:'searchword',pageParameter:'recruitPage',name:'사람인',marker:'recruit_info_list',parse:parseSaramin},incruit:{origin:'https://jlab.incruit.com',path:'/lab/api/mobile/search',parameter:'q',pageParameter:'page',name:'인크루트',json:true,parse:parseIncruitData}};
async function fetchSource(source,q,page,fetcher,fresh=false){
 const c=connectors[source];if(!c)return{source,status:'not_connected',count:0,jobs:[],page,hasMore:false,nextPage:null,message:notConnected[source]};
 const key=source+':'+q.toLocaleLowerCase()+':'+page,stored=cache.get(key);if(!fresh&&stored&&Date.now()-stored.cachedAt<300000)return{...stored.data,jobs:stored.data.jobs.map(j=>({...j,...cachedDetail(j.id)})),cached:true};
 const url=new URL(c.path,c.origin);url.searchParams.set(c.parameter,q);url.searchParams.set(c.pageParameter,String(page));if(source==='incruit'){url.searchParams.set('rows','20');url.searchParams.set('hl','true');}
 const failure=(status,message)=>({source,status,count:0,jobs:[],page,hasMore:true,nextPage:page,message});
 try{
  const response=await fetcher(url,{headers:{Accept:c.json?'application/json':'text/html,application/xhtml+xml'},redirect:'manual',signal:AbortSignal.timeout(15000)});
  if(!response.ok){const blocked=[401,403,429].includes(response.status);return failure(blocked?'blocked':'error',c.name+(blocked?'가 현재 서버의 검색 요청을 제한했습니다. 원본 검색에서 확인해 주세요.':' 검색 응답을 받지 못했습니다. 더보기로 다시 시도할 수 있습니다.'));}
  if(new URL(response.url||url).origin!==c.origin)throw new Error('Unexpected destination');const body=await response.text();if(body.length>3500000)throw new Error('Response too large');
  const fetchedAt=new Date().toISOString(),raw=c.json?JSON.parse(body):body,jobs=c.parse(raw,{fetchedAt}).map(j=>({...j,...cachedDetail(j.id)}));
  if(!c.json&&!jobs.length&&!(body.includes(c.marker)||/검색\s*결과가\s*없|조건에\s*맞는\s*채용정보가\s*없/.test(plainText(body))))return failure('changed','검색 화면 구조가 달라져 공고를 읽지 못했습니다. 원문에서 확인해 주세요.');
  const hasMore=source==='incruit'?page*20<raw.numFound:source==='jobkorea'?[...body.matchAll(/Page_No=(\d+)/g)].some(m=>Number(m[1])>page):[...body.matchAll(/\bpage="(\d+)"/g)].some(m=>Number(m[1])>page);
  const data={source,status:'ok',count:jobs.length,jobs,page,limitReached:hasMore&&page===100,hasMore:hasMore&&page<100,nextPage:hasMore&&page<100?page+1:null,fetchedAt,cached:false,message:'공개 검색 '+page+'페이지에서 확인한 공고입니다. 광고가 포함될 수 있습니다.'};if(cache.size>=150)cache.delete(cache.keys().next().value);cache.set(key,{cachedAt:Date.now(),data});return data;
 }catch(error){return failure('error',c.name+(error?.name==='TimeoutError'||error?.name==='AbortError'?' 응답 시간이 초과되었습니다. 더보기로 다시 시도해 주세요.':' 검색 연결에 실패했습니다. 원본 검색에서 확인해 주세요.'));}
}
export async function searchJobs(query,selected=['saramin','jobkorea','incruit'],fetcher=fetch,pages={},options={}){
 const q=typeof query==='string'?query.trim():'';if(!q||q.length>100)throw new Error('검색어는 1~100자로 입력해 주세요.');const sources=Array.isArray(selected)&&selected.length?[...new Set(selected)]:['saramin','jobkorea','incruit'];if(sources.some(s=>!['saramin','jobkorea','wanted','remember','incruit'].includes(s)))throw new Error('지원하지 않는 검색 사이트입니다.');
 if(!pages||typeof pages!=='object'||Array.isArray(pages)||Object.keys(pages).some(s=>!sources.includes(s))||Object.values(pages).some(p=>!Number.isInteger(p)||p<1||p>100))throw new Error('페이지는 1~100 사이여야 합니다.');
 const results=await Promise.all(sources.map(source=>fetchSource(source,q,pages[source]||1,fetcher,options.fresh===true))),dates=results.map(r=>r.fetchedAt).filter(Boolean).sort(),jobs=[];
 for(let i=0;i<Math.max(0,...results.map(r=>r.jobs.length));i++)for(const result of results)if(result.jobs[i])jobs.push(result.jobs[i]);return{query:q,jobs,sources:results.map(({jobs,...state})=>state),fetchedAt:dates.at(-1)||null,partial:results.some(r=>r.status!=='ok'),cached:results.filter(r=>r.status==='ok').every(r=>r.cached)};
}

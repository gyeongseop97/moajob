import {plainText,experience} from './job-search.mjs';
import {detailCache,cachedDetail} from './detail-cache.mjs';
export function canonicalJob(id){const m=typeof id==='string'?id.match(/^live-(saramin|jobkorea|incruit|wanted)-(\d{1,20})$/):null;if(!m)throw new Error('공고 식별자를 확인해 주세요.');return{source:m[1],number:m[2],url:m[1]==='wanted'?'https://www.wanted.co.kr/wd/'+m[2]:m[1]==='saramin'?'https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx='+m[2]:m[1]==='jobkorea'?'https://www.jobkorea.co.kr/Recruit/GI_Read/'+m[2]:'https://jlab.incruit.com/jobs/'+m[2]};}
const isoDate=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}/.test(v)&&Number.isFinite(Date.parse(v.slice(0,10)))?v.slice(0,10):null;
const employmentMap={FULL_TIME:'정규직',PART_TIME:'아르바이트',CONTRACTOR:'계약직',TEMPORARY:'계약직',INTERN:'인턴',VOLUNTEER:'자원봉사',PER_DIEM:'일용직',OTHER:'기타'};
export function parseJobDetail(html,identity,{checkedAt=new Date().toISOString()}={}){
 let record;const find=value=>{if(!value||typeof value!=='object'||record)return;if((Array.isArray(value['@type'])?value['@type']:[value['@type']]).includes('JobPosting')){const identifier=String(value.identifier?.value||''),url=String(value.url||'');if(identifier===identity.number||url===identity.url)record=value;}if(Array.isArray(value))value.forEach(find);else if(value['@graph'])find(value['@graph']);};
 for(const [,body]of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi))try{find(JSON.parse(body));}catch{}
 const patch={checkedAt,checkStatus:'ok'},visible=plainText(html.replace(/<script\b[\s\S]*?<\/script>/gi,'').replace(/<style\b[\s\S]*?<\/style>/gi,''));
 const explicitlyClosed=/마감된\s*(?:채용\s*)?(?:공고|채용정보)입니다|채용이\s*마감되었습니다|모집이\s*종료되었습니다/.test(visible);
 if(record){
  if(record.title)patch.title=plainText(record.title).slice(0,180);if(record.hiringOrganization?.name)patch.company=plainText(record.hiringOrganization.name).slice(0,100);
  const rawKinds=Array.isArray(record.employmentType)?record.employmentType:[record.employmentType],kinds=rawKinds.map(t=>employmentMap[t]||(/정규직|계약직|인턴|프리랜서|파견|위촉/.test(t||'')?plainText(t):'')).filter(Boolean);if(kinds.length){patch.employment=[...new Set(kinds)].join(' · ');patch.employmentIncomplete=kinds.length<rawKinds.length;}
  const education=record.educationRequirements;if(typeof education==='string')patch.education=plainText(education).slice(0,60);else if(education?.credentialCategory)patch.education=plainText(education.credentialCategory).slice(0,60);
  if(typeof record.experienceRequirements==='string')Object.assign(patch,experience(record.experienceRequirements));
  const salary=record.baseSalary,value=salary?.value;if(salary?.currency==='KRW'&&value&&String(value.unitText).toUpperCase()==='YEAR'){const minimum=Number(value.minValue??value.value),maximum=Number(value.maxValue);if(Number.isFinite(minimum)&&minimum>0)patch.salary='연봉 '+(minimum/10000).toLocaleString('ko-KR')+(Number.isFinite(maximum)&&maximum>minimum?'~'+(maximum/10000).toLocaleString('ko-KR'):'')+'만원';}
  const addresses=(Array.isArray(record.jobLocation)?record.jobLocation:[record.jobLocation]).map(p=>p?.address).filter(Boolean),locations=addresses.map(a=>typeof a.streetAddress==='string'&&a.addressRegion&&a.streetAddress.startsWith(a.addressRegion)?a.streetAddress:[a.addressRegion,a.addressLocality,a.streetAddress].filter(Boolean).join(' '));if(locations.length)patch.location=locations.join(', ').slice(0,150);
  patch.published=isoDate(record.datePosted);const deadline=isoDate(record.validThrough);if(deadline&&Number(deadline.slice(0,4))<2100){patch.deadline=deadline;patch.deadlineLabel='~ '+deadline.slice(5).replace('-','/');}
 }else if(identity.source==='saramin'){
  const tag=[...html.matchAll(/<meta\b[^>]*>/gi)].map(m=>m[0]).find(t=>/name\s*=\s*(["'])description\1/i.test(t)),meta=tag?.match(/content\s*=\s*(["'])([\s\S]*?)\1/i)?.[2],description=plainText(meta||'');
  if(!description.includes('경력:')&&!explicitlyClosed)throw new Error('원문 정보 구조를 확인할 수 없습니다.');
  const education=description.match(/학력:\s*([^,]+)/)?.[1],career=description.match(/경력:\s*([^,]+)/)?.[1],deadline=description.match(/마감일:\s*(\d{4}-\d{2}-\d{2})/)?.[1];if(education)patch.education=education.slice(0,60);if(career)Object.assign(patch,experience(career));if(deadline){patch.deadline=isoDate(deadline);patch.deadlineLabel='~ '+deadline.slice(5).replace('-','/');}
 }else if(!explicitlyClosed)throw new Error('원문 정보 구조를 확인할 수 없습니다.');
 const descriptionTag=[...html.matchAll(/<meta\b[^>]*>/gi)].map(m=>m[0]).find(t=>/name\s*=\s*(["'])description\1/i.test(t));
 const description=plainText(descriptionTag?.match(/content\s*=\s*(["'])([\s\S]*?)\1/i)?.[2]||'');
 const ongoing=description.match(/마감일\s*:\s*(상시\s*채용|채용\s*시\s*마감)/)?.[1]||identity.source==='jobkorea'&&isoDate(record?.validThrough)==='2070-01-01'&&'상시 / 채용 시';
 if(ongoing){patch.deadline=null;patch.deadlineLabel=ongoing;}
 else if(isoDate(record?.validThrough)&&Number(record.validThrough.slice(0,4))>=2070){patch.deadline=null;patch.deadlineLabel='마감일 확인 필요';}
 const today=new Date(Date.parse(checkedAt)+9*3600000).toISOString().slice(0,10);patch.availability=explicitlyClosed||patch.deadline&&patch.deadline<today?'closed':patch.deadline?'before_deadline':'unknown';return patch;
}
async function checkJob(id,fetcher,fresh){const identity=canonicalJob(id),known=cachedDetail(id);if(known&&!fresh)return{id,status:'ok',patch:known,cached:true};
 try{let url=new URL(identity.url),response;for(let redirect=0;redirect<4;redirect++){
   response=await fetcher(url,{headers:{Accept:'text/html,application/xhtml+xml'},redirect:'manual',signal:AbortSignal.timeout(12000)});
   if([301,302,303,307,308].includes(response.status)){const location=response.headers.get('location');if(!location)throw new Error('이동 주소 없음');const next=new URL(location,url);if(next.origin!==new URL(identity.url).origin||/login|signin/i.test(next.pathname))throw new Error('원문 접근 제한');url=next;continue;}break;
  }
  if(!response?.ok)return{id,status:[401,403,429].includes(response?.status)?'blocked':'error',message:'원문을 확인하지 못했습니다. 기존 정보를 유지했습니다.'};
  if(new URL(response.url||url).origin!==new URL(identity.url).origin)throw new Error('원문 주소 변경');const html=await response.text();if(html.length>6000000)throw new Error('원문 크기 초과');const patch=parseJobDetail(html,identity);if(detailCache.size>=200)detailCache.delete(detailCache.keys().next().value);detailCache.set(id,{at:Date.now(),patch});return{id,status:'ok',patch,cached:false};
 }catch{return{id,status:'error',message:'원문 정보를 확인하지 못했습니다. 기존 정보와 메모를 유지했습니다.'};}
}
export async function checkJobs(ids,fetcher=fetch,{fresh=false}={}){if(!Array.isArray(ids)||!ids.length||ids.length>5)throw new Error('한 번에 1~5개 공고를 확인할 수 있습니다.');const unique=[...new Set(ids)];unique.forEach(canonicalJob);const results=[];for(let i=0;i<unique.length;i+=3)results.push(...await Promise.all(unique.slice(i,i+3).map(id=>checkJob(id,fetcher,fresh))));return{results,checkedAt:new Date().toISOString()};}

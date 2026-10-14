(function(root){
 'use strict';
 const provinceAliases={서울:['서울특별시','서울'],경기:['경기도','경기'],인천:['인천광역시','인천'],부산:['부산광역시','부산'],대구:['대구광역시','대구'],광주:['광주광역시','광주'],대전:['대전광역시','대전'],울산:['울산광역시','울산'],세종:['세종특별자치시','세종'],강원:['강원특별자치도','강원도','강원'],충북:['충청북도','충북'],충남:['충청남도','충남'],전북:['전북특별자치도','전라북도','전북'],전남:['전라남도','전남'],경북:['경상북도','경북'],경남:['경상남도','경남'],제주:['제주특별자치도','제주도','제주']};
 const tokens=s=>String(s||'').toLocaleLowerCase().split(/[\s,]+/).filter(Boolean);
 function regionCodes(location,fallback=''){
  const parts=String(location||'').split(/[,|;/·]+/).map(s=>s.trim()),found=new Set();
  for(const part of parts)for(const [code,aliases]of Object.entries(provinceAliases))if(aliases.some(a=>part.startsWith(a))){found.add(code);break;}
  if(/재택|원격/.test(location))found.add('원격');if(/해외/.test(location))found.add('해외');if(!found.size&&fallback)found.add(fallback);return [...found];
 }
 function educationCodes(value){const s=String(value||''),out=[],college=/초대졸|전문대|(?:대학|대졸)\s*\(?\s*[23](?:\s*[,·/]\s*[23])?\s*년/g;if(/학력\s*무관/.test(s))out.push('학력무관');if(/고졸|고등학교/.test(s))out.push('고졸');if(college.test(s))out.push('초대졸');if(/대졸|대학교|대학\s*\(?4년/.test(s.replace(college,'')))out.push('대졸');if(/석사|석[·/]박사/.test(s))out.push('석사');if(/박사/.test(s))out.push('박사');return out;}
 function employmentCodes(value){const s=String(value||'').replace(/정규직\s*전환(?:형|가능)?/g,'').replace(/비정규직/g,''),out=[];for(const type of ['정규직','계약직','인턴','프리랜서','아르바이트','파견직','위촉직'])if(s.includes(type)||type==='파견직'&&/파견/.test(s)||type==='위촉직'&&/위촉/.test(s))out.push(type);return out;}
 function annualSalary(raw){const s=String(raw||'');if(/월급|월봉|시급|일급/.test(s)||!s.includes('연봉'))return null;const m=s.match(/연봉\s*([\d,]+)(?:\s*[~–-]\s*[\d,]+)?\s*(만원|원)/);return m?Number(m[1].replaceAll(',',''))/(m[2]==='원'?10000:1):null;}
 function today(){return new Date(Date.now()+9*3600000).toISOString().slice(0,10);}
 function calendarDate(raw){if(typeof raw!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(raw))return null;const time=Date.parse(raw+'T00:00:00Z');return Number.isFinite(time)&&new Date(time).toISOString().slice(0,10)===raw?raw:null;}
 function normalizeDeadline(j){
  const date=calendarDate(j.deadline),placeholder=j.source==='jobkorea'&&date==='2070-01-01';
  const ongoing=/상시|채용\s*시/.test(j.deadlineLabel||'')||placeholder||j.kind==='demo'&&!j.deadline;
  if(ongoing)return{deadline:null,deadlineLabel:placeholder?'상시 / 채용 시':j.deadlineLabel||'상시 / 채용 시'};
  if(j.deadline&&(!date||Number(date.slice(0,4))>=2070))return{deadline:null,deadlineLabel:'마감일 확인 필요'};
  return{deadline:date,deadlineLabel:j.deadlineLabel||''};
 }
 function deadlineState(j){const normalized=normalizeDeadline(j),days=normalized.deadline?(Date.parse(normalized.deadline)-Date.parse(today()))/86400000:null;return{days,ongoing:/상시|채용\s*시/.test(normalized.deadlineLabel),closed:j.availability==='closed'||days!==null&&days<0||/^마감$|마감완료|채용마감|종료|D\s*\+\s*\d+/.test(j.deadlineLabel||'')};}
 function classifyJob(j,f={}){
  const missing=[],hay=[j.title,j.company,j.location,j.category,...(j.tags||[])].join(' ').toLocaleLowerCase(),excluded=()=>({status:'exclude',missing:[]});
  if(!tokens(f.query).every(w=>hay.includes(w))||f.sources?.length&&!f.sources.includes(j.source))return excluded();
  if(f.region&&!regionCodes(j.location,j.region).includes(f.region)||f.location&&!tokens(f.location).every(w=>String(j.location).toLocaleLowerCase().includes(w))||f.company&&!j.company.toLocaleLowerCase().includes(f.company.toLocaleLowerCase()))return excluded();
  if(!tokens(f.include).every(w=>hay.includes(w))||tokens(f.exclude).some(w=>hay.includes(w)))return excluded();
  for(const [field,label,normalize]of[['employment','고용 형태',employmentCodes],['education','학력',educationCodes]])if(f[field]){const codes=normalize(j[field]);if(!codes.length||field==='employment'&&j.employmentIncomplete&&!codes.includes(f[field]))missing.push(label);else if(!codes.includes(f[field]))return excluded();}
  const hasYears=f.years!==''&&f.years!==undefined&&f.years!==null;
  if(f.experience||hasYears){
   if(j.min===null&&j.max===null)missing.push('경력');else{
    const ranges=Array.isArray(j.experienceRanges)&&j.experienceRanges.length?j.experienceRanges:[{min:j.min,max:j.max}],overlap=(a,b)=>ranges.some(r=>(r.min??0)<=b&&(r.max??Infinity)>=a);
    if(f.experience==='entry'&&!ranges.some(r=>r.min===0)||f.experience==='1-3'&&!overlap(1,3)||f.experience==='4-7'&&!overlap(4,7)||f.experience==='8+'&&!overlap(8,Infinity)||hasYears&&!overlap(Number(f.years),Number(f.years)))return excluded();
    if(hasYears&&ranges.every(r=>r.min===null))missing.push('최소 경력');
   }
  }
  if(f.salaryMin!==''&&f.salaryMin!==undefined&&f.salaryMin!==null){const n=annualSalary(j.salary);if(n===null)missing.push('연봉');else if(n<Number(f.salaryMin))return excluded();}
  const deadline=deadlineState(j);if(f.hideClosed&&deadline.closed)return excluded();
  if(f.deadline==='ongoing'){if(!deadline.ongoing){if(j.deadline||deadline.closed)return excluded();missing.push('마감 방식');}}
  else if(f.deadline){if(deadline.ongoing||deadline.closed)return excluded();if(deadline.days===null)missing.push('마감일');else if(deadline.days<0||deadline.days>Number(f.deadline))return excluded();}
  if(f.published){const days=j.published?(Date.parse(today())-Date.parse(j.published))/86400000:null;if(days===null||!Number.isFinite(days))missing.push('등록일');else if(days<0||days>=Number(f.published))return excluded();}
  return{status:missing.length?'unknown':'match',missing:[...new Set(missing)]};
 }
 function classifyJobs(jobs,f){const match=[],unknown=[];for(const j of jobs){const result=classifyJob(j,f);if(result.status==='match')match.push(j);else if(result.status==='unknown')unknown.push({...j,missingFields:result.missing});}return{match,unknown};}
 function normalizeCompany(s){return String(s||'').toLocaleLowerCase().replace(/주식회사|㈜|\(주\)/g,'').replace(/[\s.,]/g,'');}
 function fingerprint(j){const company=normalizeCompany(j.company),title=String(j.title||'').toLocaleLowerCase().replace(/[\s()[\]{}·.,_:–-]/g,''),location=String(j.location||'').toLocaleLowerCase().replace(/특별자치도|특별시|광역시/g,'').replace(/경기도/g,'경기').replace(/[\s>|]/g,'');return company.length>=2&&title.length>=6&&location&&!/미기재|미정/.test(location)?company+'|'+title+'|'+location:null;}
 function compatible(a,b){if(a.published&&b.published&&Math.abs(Date.parse(a.published)-Date.parse(b.published))>14*86400000)return false;if(a.deadline&&b.deadline&&Math.abs(Date.parse(a.deadline)-Date.parse(b.deadline))>3*86400000)return false;const left=employmentCodes(a.employment),right=employmentCodes(b.employment);return !left.length||!right.length||left.some(x=>right.includes(x));}
 function groupJobs(jobs,enabled=true){
  const groups=[],candidates=new Map();for(const job of jobs){let group;const fp=enabled&&job.kind==='live'?fingerprint(job):null;
   if(enabled&&job.kind==='demo')group=groups.find(g=>g.key===job.groupKey);
   else if(fp)group=(candidates.get(fp)||[]).find(g=>!g.sources.includes(job.source)&&g.members.every(j=>compatible(j,job)));
   if(!group){group={...job,key:enabled&&job.kind==='demo'?job.groupKey:job.id,members:[],sources:[],duplicateCandidate:false};groups.push(group);if(fp){if(!candidates.has(fp))candidates.set(fp,[]);candidates.get(fp).push(group);}}
   group.members.push(job);if(!group.sources.includes(job.source))group.sources.push(job.source);group.duplicateCandidate=job.kind==='live'&&group.members.length>1;
  }return groups;
 }
 function deadlineText(j){const s=deadlineState(j),normalized=normalizeDeadline(j);if(s.closed)return'마감';if(s.ongoing)return'상시 / 채용 시';if(s.days!==null)return s.days===0?'오늘 마감':'D-'+s.days+' · '+normalized.deadline.slice(5).replace('-','.');return normalized.deadlineLabel||'마감일 미기재';}
 function publishedDate(j){const dates=(j.members||[j]).map(m=>calendarDate(m.published)).filter(d=>d&&d<=today());return dates.sort().at(-1)||null;}
 function sortJobs(jobs,sort='recent'){
  const recent=(a,b)=>String(publishedDate(b)||'').localeCompare(String(publishedDate(a)||''));
  const rank=j=>{const s=deadlineState(j);return[s.closed?3:s.days!==null?0:s.ongoing?1:2,s.days!==null&&!s.closed?s.days:Infinity];};
  return [...jobs].sort((a,b)=>{if(sort==='company')return a.company.localeCompare(b.company,'ko')||recent(a,b);if(sort==='deadline'){const x=rank(a),y=rank(b);return x[0]-y[0]||(x[1]===y[1]?0:x[1]-y[1])||recent(a,b);}return recent(a,b);});
 }
 function jobplanetUrl(company){const name=String(company||'').replace(/주식회사|㈜|\(주\)/g,'').trim();return'https://www.jobplanet.co.kr/search/companies?query='+encodeURIComponent(name);}
 root.JobDomain={provinceAliases,regionCodes,educationCodes,employmentCodes,annualSalary,today,calendarDate,normalizeDeadline,deadlineState,classifyJob,classifyJobs,groupJobs,deadlineText,sortJobs,publishedDate,jobplanetUrl,fingerprint};
})(typeof globalThis!=='undefined'?globalThis:this);

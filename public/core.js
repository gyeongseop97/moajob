(function (root) {
  'use strict';
  const sources = {
    saramin: {name:'사람인',short:'사',color:'#3b6bdd',home:'https://www.saramin.co.kr/',guide:'https://www.saramin.co.kr/zf_user/search',connected:true,status:'공개 검색 연결',description:'사람인의 공개 검색 목록에서 실제 공고와 지역·경력·학력·고용 형태·마감 정보를 가져옵니다. 더보기를 누르면 다음 검색 페이지를 확인합니다. 사이트 구조 변경이나 접근 제한 시 연결 상태를 표시합니다.'},
    jobkorea: {name:'잡코리아',short:'잡',color:'#1387cb',home:'https://www.jobkorea.co.kr/',guide:'https://www.jobkorea.co.kr/Search/',connected:true,status:'공개 검색 연결',description:'잡코리아 공개 검색 목록을 페이지별로 가져옵니다. 광고 등 반복 노출 공고는 한 번만 표시합니다. 목록에서 확인되지 않는 고용 형태·급여 등은 미기재로 표시합니다.'},
    wanted: {name:'원티드',short:'w',color:'#2d56e8',home:'https://www.wanted.co.kr/',guide:'https://www.wanted.co.kr/',status:'연동 경로 확인 필요',description:'개인용 공고 통합 검색에 사용할 수 있는 공식 연동 경로와 이용 범위를 확인해야 합니다. 이 시제품에는 아직 연결되지 않았습니다.'},
    remember: {name:'리멤버',short:'R',color:'#28382f',home:'https://page.rememberapp.co.kr/home',guide:'https://page.rememberapp.co.kr/home',status:'연동 경로 확인 필요',description:'개인용 공고 통합 검색에 사용할 수 있는 공식 연동 경로와 이용 범위를 확인해야 합니다. 이 시제품에는 아직 연결되지 않았습니다.'},
    incruit: {name:'인크루트',short:'인',color:'#eb6c24',home:'https://jlab.incruit.com/search',guide:'https://jlab.incruit.com/search',connected:true,status:'공개 검색 연결',description:'인크루트 공개 검색에서 제공하는 공고를 순서대로 가져옵니다. 지역·경력·고용 형태·학력·급여·마감 표시로 필터링하고, 더보기로 다음 결과를 이어서 확인할 수 있습니다.'}
  };
  const companies = [
    ['온그로브','전략기획 매니저','서울','성수',3,7,'정규직','연봉 협의','경영기획',['사업 전략','데이터 분석','시장 조사'],['saramin','jobkorea'],['사업 계획 수립과 주요 지표 관리','신규 사업의 시장성 검토','유관 부서 프로젝트 운영']],
    ['노바스튜디오','서비스 기획자 (PM)','서울','강남',2,5,'정규직','5,000–7,000만원','서비스기획',['PM','서비스 기획','협업'],['wanted','remember'],['사용자 문제 정의와 제품 로드맵 수립','고객 인터뷰 및 요구사항 정리','제품 개선 지표 설계']],
    ['그린웨이브','브랜드 마케터','경기','판교',1,4,'정규직','연봉 협의','마케팅',['브랜딩','콘텐츠','캠페인'],['saramin','wanted'],['브랜드 캠페인 기획 및 실행','채널별 콘텐츠 성과 분석','브랜드 메시지와 가이드 관리']],
    ['페이지랩','데이터 분석가','서울','을지로',3,6,'정규직','6,000–8,000만원','데이터',['SQL','대시보드','분석'],['wanted'],['사업 지표 대시보드 구축','고객 행동 데이터 분석','실험 설계 및 성과 측정']],
    ['라이트하우스','사업운영 신입 매니저','서울','마포',0,1,'정규직','3,600–4,200만원','사업운영',['신입 가능','운영','문제 해결'],['saramin','jobkorea'],['파트너 운영 업무 지원','반복 업무 프로세스 개선','주간 실적 취합 및 보고']],
    ['오빗웍스','프론트엔드 개발자','원격','전국',2,6,'정규직','연봉 협의','개발',['React','TypeScript','원격근무'],['wanted'],['웹 서비스 사용자 인터페이스 개발','접근성과 성능 개선','디자인 시스템 운영']],
    ['모먼트컴퍼니','경영관리 담당자','경기','수원',4,8,'정규직','연봉 협의','경영관리',['예산 관리','관리회계','실적 분석'],['jobkorea','remember'],['부문별 예산 편성과 집행 관리','월별 손익 분석','경영 보고 자료 작성']],
    ['블루포트','해외영업 담당자','부산','해운대',2,5,'정규직','4,500–6,500만원','영업',['해외영업','영어','파트너십'],['saramin'],['해외 거래처 발굴과 관리','수출 계약 및 일정 협의','시장별 영업 전략 수립']],
    ['스프링보드','UX/UI 디자이너','서울','서초',1,5,'정규직','연봉 협의','디자인',['Figma','UX 리서치','프로토타입'],['wanted','jobkorea'],['사용자 경험 흐름 설계','제품 화면 디자인','사용성 테스트와 개선']],
    ['리프마켓','콘텐츠 마케팅 인턴','서울','합정',0,0,'인턴','급여 협의','마케팅',['인턴','콘텐츠','SNS'],['saramin'],['소셜 콘텐츠 제작 지원','캠페인 운영과 리포트 작성','소비자 트렌드 조사']],
    ['핀오크','사업개발 리드','서울','여의도',8,15,'정규직','연봉 협의','사업개발',['사업개발','파트너십','리더십'],['remember'],['신규 사업 기회 발굴','전략적 제휴 협상','사업개발 조직 운영']],
    ['코지클라우드','고객경험 운영 매니저','원격','전국',0,3,'계약직','급여 협의','고객경험',['CX','운영 개선','고객 분석'],['jobkorea'],['고객 문의와 이슈 관리','고객 경험 개선 과제 도출','운영 가이드 체계화']]
  ];
  const demo = companies.flatMap((c,i)=>c[10].map((source,n)=>({
    id:'demo-'+i+'-'+source,groupKey:'example-role-'+i,kind:'demo',source,company:c[0],title:c[1],region:c[2],location:c[2]+' '+c[3],min:c[4],max:c[5],employment:c[6],salary:c[7],category:c[8],tags:c[9],tasks:c[11],
    published:'2026-10-'+String(13-Math.min(i,9)).padStart(2,'0'),deadline:i===5||i===10?null:'2026-'+(i%4===0?'10':'11')+'-'+String(20+i%8).padStart(2,'0'),url:sources[source].home
  })));
  function cleanText(value,max=200){return typeof value==='string'?value.trim().slice(0,max):'';}
  const regions=['서울','경기','인천','부산','대구','광주','대전','울산','세종','강원','충북','충남','전북','전남','경북','경남','제주','원격','해외','기타'];
  const employments=['정규직','계약직','인턴','프리랜서','아르바이트','파견직','위촉직'];
  function normalizeFilters(raw={}){const f={query:cleanText(raw.query,100),region:regions.includes(raw.region)?raw.region:'',experience:['entry','1-3','4-7','8+'].includes(raw.experience)?raw.experience:'',employment:employments.includes(raw.employment)?raw.employment:'',sources:Array.isArray(raw.sources)?[...new Set(raw.sources.filter(s=>Object.hasOwn(sources,s)))]:[],location:cleanText(raw.location,100),company:cleanText(raw.company,100),include:cleanText(raw.include,150),exclude:cleanText(raw.exclude,150),education:['학력무관','고졸','초대졸','대졸','석사','박사'].includes(raw.education)?raw.education:'',deadline:['3','7','14','30','ongoing'].includes(raw.deadline)?raw.deadline:'',published:['1','7','14','30'].includes(raw.published)?raw.published:'',includeUnknown:raw.includeUnknown!==false,hideClosed:raw.hideClosed===true};for(const [k,max]of[['years',50],['salaryMin',100000]])f[k]=raw[k]!==''&&raw[k]!==null&&raw[k]!==undefined&&Number.isFinite(Number(raw[k]))&&Number(raw[k])>=0&&Number(raw[k])<=max?String(Number(raw[k])):'';return f;}
  function annualSalary(raw){const s=String(raw||'');if(/월급|월봉|시급|일급/.test(s)||!s.includes('연봉'))return null;const m=s.match(/연봉\s*([\d,]+)(?:\s*[~–-]\s*[\d,]+)?\s*(만원|원)/);return m?Number(m[1].replaceAll(',',''))/(m[2]==='원'?10000:1):null;}
  function sourceForUrl(value){try{const u=new URL(value);if(u.protocol!=='https:')return null;const h=u.hostname.toLowerCase();return Object.keys(sources).find(s=>{const d={saramin:'saramin.co.kr',jobkorea:'jobkorea.co.kr',wanted:'wanted.co.kr',remember:'rememberapp.co.kr',incruit:'incruit.com'}[s];return h===d||h.endsWith('.'+d);})||null;}catch{return null;}}
  function validateJob(raw){
    if(!raw||typeof raw!=='object')throw new Error('공고 형식이 올바르지 않습니다.');
    const url=cleanText(raw.url,2000),source=sourceForUrl(url),company=cleanText(raw.company,100),title=cleanText(raw.title,180);
    if(!source)throw new Error('사람인·잡코리아·원티드·리멤버·인크루트의 https 공고 링크를 입력해 주세요.');
    if(!company||!title)throw new Error('기업명과 공고 제목을 입력해 주세요.');
    const number=v=>v===null||v===undefined||v===''?null:Number(v);
    const min=number(raw.min),max=number(raw.max);
    if([min,max].some(n=>n!==null&&(!Number.isInteger(n)||n<0||n>50)))throw new Error('경력은 0~50 사이의 정수로 입력해 주세요.');
    if(min!==null&&max!==null&&min>max)throw new Error('최대 경력은 최소 경력보다 작을 수 없습니다.');
    const deadline=cleanText(raw.deadline,10)||null;
    if(deadline&&(!/^\d{4}-\d{2}-\d{2}$/.test(deadline)||Number.isNaN(Date.parse(deadline+'T00:00:00Z'))||new Date(deadline+'T00:00:00Z').toISOString().slice(0,10)!==deadline))throw new Error('마감일을 확인해 주세요.');
    return {id:cleanText(raw.id,100)||'personal-'+Date.now()+'-'+Math.random().toString(36).slice(2,8),kind:'personal',source,company,title,region:regions.includes(raw.region)?raw.region:'기타',location:cleanText(raw.location,150)||cleanText(raw.region,20)||'미기재',min,max,employment:employments.includes(raw.employment)?raw.employment:'정규직',salary:cleanText(raw.salary,100)||'미기재',education:cleanText(raw.education,60)||'학력 미기재',category:'직접 추가',tags:[],tasks:[],published:cleanText(raw.published,10)||new Date().toISOString().slice(0,10),deadline,url,note:cleanText(raw.note,2000)};
  }
  function filterJobs(jobs,f={}){const result=root.JobDomain.classifyJobs(jobs,f);return f.includeUnknown?[...result.match,...result.unknown]:result.match;}
  function groupJobs(jobs,enabled=true){return root.JobDomain.groupJobs(jobs,enabled);}
  function sortJobs(jobs,sort='recent'){return [...jobs].sort((a,b)=>sort==='deadline'?(a.deadline||'9999').localeCompare(b.deadline||'9999'):sort==='company'?a.company.localeCompare(b.company,'ko'):String(b.published||'').localeCompare(String(a.published||'')));}
  function experienceText(j){return j.experienceText|| (j.min===null&&j.max===null?'경력 미기재':j.min===0&&j.max===0?'신입':j.min===0&&j.max===null?'신입 가능':j.min===0?'신입–'+j.max+'년':j.max===null?j.min+'년 이상':j.min+'–'+j.max+'년');}
  function validateLiveJob(raw){
    const match=typeof raw?.id==='string'?raw.id.match(/^live-(saramin|jobkorea|incruit)-(\d+)$/):null;
    if(!raw||raw.kind!=='live'||!match)throw new Error('실제 공고 형식이 올바르지 않습니다.');
    const source=match[1],url=new URL(raw.url),expected=source==='jobkorea'?{host:'www.jobkorea.co.kr',path:'/Recruit/GI_Read/'+match[2]}:source==='incruit'?{host:'jlab.incruit.com',path:'/jobs/'+match[2]}:{host:'www.saramin.co.kr',path:'/zf_user/jobs/relay/view'};
    if(url.protocol!=='https:'||url.hostname!==expected.host||url.pathname!==expected.path||source==='saramin'&&(url.searchParams.get('rec_idx')!==match[2]||[...url.searchParams.keys()].some(k=>k!=='rec_idx'))||url.username||url.password||url.port)throw new Error('실제 공고 링크를 확인해 주세요.');
    const liveNumber=value=>value===null||value===undefined||value===''?null:Number(value);
    const min=liveNumber(raw.min),max=liveNumber(raw.max);
    if([min,max].some(n=>n!==null&&(!Number.isInteger(n)||n<0||n>100))||min!==null&&max!==null&&min>max)throw new Error('실제 공고의 경력 범위를 확인해 주세요.');
    const job=validateJob({...raw,id:raw.id,min:null,max:null});
    return {...job,min,max,kind:'live',source,category:cleanText(raw.category,160)||'실제 검색 결과',tags:Array.isArray(raw.tags)?raw.tags.slice(0,12).map(t=>cleanText(t,60)).filter(Boolean):[],employment:cleanText(raw.employment,60)||'고용형태 미기재',experienceText:cleanText(raw.experienceText,60),deadlineLabel:cleanText(raw.deadlineLabel,60),published:/^\d{4}-\d{2}-\d{2}$/.test(raw.published||'')?raw.published:null,fetchedAt:cleanText(raw.fetchedAt,40),checkedAt:Number.isFinite(Date.parse(raw.checkedAt))?raw.checkedAt:null,checkStatus:['ok','error','blocked'].includes(raw.checkStatus)?raw.checkStatus:null,checkMessage:cleanText(raw.checkMessage,180),employmentIncomplete:raw.employmentIncomplete===true,availability:['closed','before_deadline','unknown'].includes(raw.availability)?raw.availability:'unknown',experienceRanges:Array.isArray(raw.experienceRanges)?raw.experienceRanges.slice(0,3).filter(r=>r&&Number.isInteger(r.min)&&r.min>=0&&r.min<=50&&(r.max===null||Number.isInteger(r.max)&&r.max>=r.min&&r.max<=50)).map(r=>({min:r.min,max:r.max})):[]};
  }
  function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  const api={...root.JobDomain,sources,regions,employments,normalizeFilters,annualSalary:root.JobDomain.annualSalary,demo,sourceForUrl,validateJob,validateLiveJob,filterJobs,groupJobs,sortJobs,experienceText,escapeHtml};
  root.JobCore=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);

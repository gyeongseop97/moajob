// Read only the company-search hydration data, never individual reviews or recommendations.
const key=value=>String(value||'').toLowerCase().replace(/주식회사|㈜|\(주\)/g,'').replace(/[\s.,]/g,'');
const stores=new WeakMap();

function jsonObject(text,start){
 let depth=0,quoted=false,escaped=false;
 for(let i=start;i<text.length;i++){
  const c=text[i];
  if(quoted){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;continue;}
  if(c==='"')quoted=true;else if(c==='{')depth++;else if(c==='}'&&!--depth)return JSON.parse(text.slice(start,i+1));
 }
 throw new Error('Incomplete search data');
}

export function parseCompanyRatings(html,company){
 const states=[];
 for(const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)){
  const script=match[1].trim();
  try{
   if(script.startsWith('window[')&&script.includes('.push({'))states.push(jsonObject(script,script.indexOf('.push({')+6));
   else if(script.startsWith('self.__next_f.push(')){
    const frame=JSON.parse(script.slice('self.__next_f.push('.length).replace(/\);?$/,''));
    const data=frame[1];if(typeof data!=='string')continue;
    const marker='"hydrationState":',at=data.indexOf(marker);
    if(at>=0)states.push(jsonObject(data,data.indexOf('{',at+marker.length)));
   }
  }catch{/* A script unrelated to company search is not a rating source. */}
 }
 const query=states.flatMap(s=>s.queries||[]).find(q=>q.queryKey?.[0]==='search'&&q.queryKey?.[1]==='companyList'&&key(q.queryKey?.[2]?.query)===key(company));
 if(!query||!Array.isArray(query.state?.data?.pages))throw new Error('Company search format changed');
 const pages=query.state.data.pages;
 const matches=[...new Map(pages.flatMap(p=>p.items||[]).filter(row=>key(row.name)===key(company)&&Number.isSafeInteger(row.company_id)&&row.company_id>0).map(row=>[row.company_id,row])).values()];
 // Workplace and head-office regions can differ; do not guess between namesakes.
 if(pages.some(p=>p.total_page>pages.length)||matches.length>1)return{status:'ambiguous',company};
 if(!matches.length)return{status:'not_found',company};
 const row=matches[0],rating=row.rate_total_avg,reviewUrl='https://www.jobplanet.co.kr/companies/'+row.company_id+'/reviews';
 if(typeof rating!=='number'||!Number.isFinite(rating)||rating<1||rating>5)return{status:'unrated',company,reviewUrl};
 return{status:'ok',company,matchedCompany:row.name,companyId:row.company_id,rating,reviewUrl,source:'jobplanet'};
}

export async function getCompanyRating(company,fetcher=globalThis.fetch){
 if(typeof company!=='string'||!company.trim()||company.length>100||!key(company))throw new Error('Invalid company');
 company=company.trim();let cache=stores.get(fetcher);if(!cache){cache=new Map();stores.set(fetcher,cache);}
 const id=key(company),old=cache.get(id);if(old&&old.until>Date.now())return{...await old.value,company};
 const value=(async()=>{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
  try{
   const url=new URL('https://www.jobplanet.co.kr/search/companies');
   url.searchParams.set('query',company.replace(/주식회사|㈜|\(주\)/g,'').trim());
   const response=await fetcher(url,{signal:controller.signal,redirect:'error',headers:{Accept:'text/html'}});
   if(!response.ok)return{status:response.status===403||response.status===429?'blocked':'error',company};
   const html=await response.text();if(html.length>3000000)throw new Error('Unexpected response size');
   return{...parseCompanyRatings(html,company),checkedAt:new Date().toISOString()};
  }catch{return{status:'error',company};}finally{clearTimeout(timer);}
 })();
 const entry={value,until:Date.now()+15000};cache.set(id,entry);
 const result=await value;entry.until=Date.now()+(result.status==='ok'?21600000:300000);
 while(cache.size>1000)cache.delete(cache.keys().next().value);
 return result;
}

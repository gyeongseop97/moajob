export const jobkoreaHtml=`<html><body><article data-sentry-component="CardJob">
<a data-sentry-component="Title" href="https://www.jobkorea.co.kr/Recruit/GI_Read/901">서비스 기획 담당자</a>
<span class="text-typo-b2-16">테스트기업</span><span class="text-typo-b4-14">서울 강남구</span>
<span class="text-gray700 text-typo-c1-13">경력3년↑</span><span>연봉 4,000만원</span>
</article><a href="/Search?Page_No=2">2</a></body></html>`;

export const saraminHtml=`<html><body><div id="recruit_info_list"><div class="item_recruit" value="902">
<h2 class="job_tit"><a href="/zf_user/jobs/relay/view?rec_idx=902">사업 기획 담당자</a></h2>
<div class="job_condition"><span>경기 성남시</span><span>경력1년↑</span><span>대졸 이상</span><span>정규직</span></div>
<span class="date">상시채용</span><div class="job_sector"><a>사업기획</a></div>
<strong class="corp_name">가상기업</strong></div></div><div class="pagination"><a page="2">2</a></div></body></html>`;

export const incruitData={success:true,numFound:41,page:1,rows:20,docs:[{jobId:'903',companyNm:'예시기업',title:'제품 기획 담당자',regionNm:'서울>서초구',careerNm:'경력 2~5년',employTyNm:'정규직',salaryNm:'협의',scholNm:'학력무관',dDay:'D-7',pstnNm:'제품 기획',occuNm:'경영>제품기획'}]};

export function wantedData(query='디자이너',offset=0){return{links:{prev:null,next:'/api/v4/jobs?country=kr&limit=20&offset='+(offset+20)+'&query='+encodeURIComponent(query)},data:[{id:905,status:'active',hidden:false,company:{name:'테스트디자인',industry_name:'디자인'},position:'뷰티 콘텐츠 디자이너',address:{location:'서울',district:'강남구',full_location:'서울 강남구 테헤란로'},annual_from:0,annual_to:3,due_time:null}]};}

export function wantedDetailHtml(id='905'){return '<script type="application/ld+json">'+JSON.stringify({'@context':'https://schema.org','@type':'JobPosting',url:'https://www.wanted.co.kr/wd/'+id,title:'뷰티 콘텐츠 디자이너',hiringOrganization:{name:'테스트디자인'},employmentType:'정규직',datePosted:'2026-10-14',baseSalary:{currency:'KRW',value:{unitText:'YEAR',minValue:0,maxValue:0}}})+'</script>';}

export function detailHtml(id='901'){
  return '<html><body><script type="application/ld+json">'+JSON.stringify({
    '@context':'https://schema.org','@type':'JobPosting',title:'서비스 기획 담당자',
    identifier:{value:id},url:'https://www.jobkorea.co.kr/Recruit/GI_Read/'+id,
    hiringOrganization:{name:'테스트기업'},employmentType:'FULL_TIME',educationRequirements:'대졸 이상',
    experienceRequirements:'경력 3년 이상',datePosted:'2026-01-01',validThrough:'2099-12-31',
    baseSalary:{currency:'KRW',value:{unitText:'YEAR',minValue:40000000,maxValue:50000000}},
  })+'</script></body></html>';
}

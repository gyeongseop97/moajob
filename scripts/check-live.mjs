import {searchJobs} from '../lib/job-search.mjs';
const result=await searchJobs('기획',['saramin','jobkorea','incruit'],fetch,{}, {fresh:true});
for(const source of result.sources)console.log(source.source+': '+source.status+' · '+source.count+'건'+(source.status!=='ok'?' · '+source.message:''));
console.log('전체 '+result.jobs.length+'건 확인');
if(result.sources.some(source=>source.status!=='ok'))process.exitCode=1;

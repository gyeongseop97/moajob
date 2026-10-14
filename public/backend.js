(function(){
 'use strict';
 const key='moajob-api-origin-v1',isPages=!!document.querySelector('meta[name="moajob-hosting"][content="github-pages"]')||location.hostname.endsWith('.github.io');
 function normalize(value){if(!value)return '';const url=new URL(value);if(url.username||url.password||!['https:','http:'].includes(url.protocol)||(url.protocol!=='https:'&&!['localhost','127.0.0.1','[::1]'].includes(url.hostname)))throw new Error('https://로 시작하는 배포 주소를 입력해 주세요.');return url.origin;}
 let origin='';try{origin=normalize(localStorage.getItem(key)||window.MOAJOB_CONFIG?.apiBaseUrl||'');}catch{}
 const $=selector=>document.querySelector(selector),feedback=$('#backend-feedback'),input=$('#backend-url'),button=$('#backend-connect');
 const ready=()=>!!origin||!isPages;
 function paint(){ $('#backend-notice')?.classList.toggle('hidden',ready());if(input)input.value=origin;$('#backend-disconnect')?.classList.toggle('hidden',!origin);if(feedback)feedback.textContent=origin?'설정된 검색 서버: '+origin:isPages?'검색 서버를 연결하면 실제 공고 검색과 원문 확인을 사용할 수 있습니다.':'현재 사이트의 검색 서버를 사용합니다. 별도 연결이 필요하지 않습니다.'; }
 function requireConnection(){if(ready())return true;document.querySelector('nav [data-view="sources"]')?.click();$('#backend-settings')?.scrollIntoView({behavior:'smooth',block:'center'});input?.focus({preventScroll:true});return false;}
 window.MoajobBackend=Object.freeze({ready,requireConnection,fetch:(route,options={})=>{if(!ready())return Promise.reject(new Error('검색 서버를 연결해 주세요.'));if(!route.startsWith('/api/'))return Promise.reject(new Error('지원하지 않는 요청입니다.'));return fetch((origin||'')+route,{...options,credentials:'omit'});}});
 $('#backend-form')?.addEventListener('submit',async event=>{event.preventDefault();let next;try{next=normalize(input.value.trim());if(!next)throw new Error('배포된 모아잡 주소를 입력해 주세요.');}catch(error){feedback.textContent=error.message;return;}
  button.disabled=true;feedback.textContent='서버 연결을 확인하고 있습니다. 잠든 무료 서버는 약 1분이 걸릴 수 있어요.';const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),90000);
  try{const response=await fetch(next+'/health',{signal:controller.signal,credentials:'omit',cache:'no-store'});if(!response.ok)throw new Error();const data=await response.json();if(data.status!=='ok'||data.service!=='moajob')throw new Error();try{localStorage.setItem(key,next);}catch{throw new Error('브라우저 저장 공간을 사용할 수 없어 주소를 저장하지 못했습니다.');}origin=next;paint();feedback.textContent='검색 서버가 연결되었습니다. 공고 탐색에서 검색해 보세요.';}
  catch(error){feedback.textContent=error.message.startsWith('브라우저')?error.message:'연결하지 못했습니다. 배포가 Live 상태인지, 주소가 맞는지 확인하고 다시 시도해 주세요. 기존 연결은 유지됩니다.';}
  finally{clearTimeout(timer);button.disabled=false;}
 });
 $('#backend-disconnect')?.addEventListener('click',()=>{try{localStorage.removeItem(key);}catch{feedback.textContent='브라우저 설정을 변경하지 못했습니다.';return;}origin='';paint();});
 paint();
})();

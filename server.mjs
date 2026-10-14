import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath, pathToFileURL} from 'node:url';
import path from 'node:path';
import {searchJobs} from './lib/job-search.mjs';
import {checkJobs} from './lib/job-details.mjs';

const publicDirectory=fileURLToPath(new URL('./public/',import.meta.url));
const sourceNames=new Set(['saramin','jobkorea','wanted','remember','incruit']);
const assets=new Map([
  ['/explore',{file:'explore.html',type:'text/html; charset=utf-8'}],
  ['/explore.html',{file:'explore.html',type:'text/html; charset=utf-8'}],
  ['/config.js',{file:'config.js',type:'text/javascript; charset=utf-8'}],
  ['/backend.js',{file:'backend.js',type:'text/javascript; charset=utf-8'}],
  ['/app.js',{file:'app.js',type:'text/javascript; charset=utf-8'}],
  ['/core.js',{file:'core.js',type:'text/javascript; charset=utf-8'}],
  ['/domain.js',{file:'domain.js',type:'text/javascript; charset=utf-8'}],
  ['/style.css',{file:'style.css',type:'text/css; charset=utf-8'}],
]);

class HttpError extends Error {
  constructor(status,message){super(message);this.status=status;}
}

function json(response,status,data,extraHeaders={}){
  response.writeHead(status,{
    'Content-Type':'application/json; charset=utf-8',
    'Cache-Control':'private, no-store',
    'X-Content-Type-Options':'nosniff',
    ...extraHeaders,
  });
  response.end(JSON.stringify(data));
}

function readBody(request,maximum=4000){
  return new Promise((resolve,reject)=>{
    let length=0,done=false;const chunks=[];
    request.on('data',chunk=>{
      if(done)return;
      length+=chunk.length;
      if(length>maximum){done=true;chunks.length=0;reject(new HttpError(413,'요청 크기를 확인해 주세요.'));return;}
      chunks.push(chunk);
    });
    request.on('end',()=>{if(!done){done=true;resolve(Buffer.concat(chunks).toString('utf8'));}});
    request.on('error',error=>{if(!done){done=true;reject(error);}});
  });
}

export function createAppServer({fetcher=globalThis.fetch,allowedOrigins=(process.env.ALLOWED_ORIGINS||'https://gyeongseop97.github.io').split(',').map(value=>value.trim()).filter(Boolean)}={}){
  const permittedOrigins=new Set(allowedOrigins);
  const server=http.createServer(async(request,response)=>{
    try{
      const url=new URL(request.url||'/','http://localhost');
      if(url.pathname.startsWith('/api/')||url.pathname==='/health'){
        const requestOrigin=request.headers.origin;
        response.setHeader('Vary','Origin');
        let sameOrigin=false;try{sameOrigin=new URL(requestOrigin).host===request.headers.host;}catch{}
        if(requestOrigin&&!sameOrigin&&!permittedOrigins.has(requestOrigin)){json(response,403,{error:'이 주소에서 검색 서버에 연결할 수 없습니다.'});return;}
        if(requestOrigin)response.setHeader('Access-Control-Allow-Origin',requestOrigin);
        if(request.method==='OPTIONS'){
          const methods=url.pathname==='/api/jobs/refresh'?['POST']:url.pathname==='/health'?['GET','HEAD']:['GET'];
          const requestedHeaders=(request.headers['access-control-request-headers']||'').split(',').map(value=>value.trim().toLowerCase()).filter(Boolean);
          if(!requestOrigin||!methods.includes(request.headers['access-control-request-method'])||requestedHeaders.some(value=>value!=='content-type')){json(response,403,{error:'지원하지 않는 연결 요청입니다.'});return;}
          response.writeHead(204,{'Access-Control-Allow-Methods':methods.join(', '),'Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'600','Cache-Control':'no-store'});response.end();return;
        }
      }
      if(url.pathname==='/api/search'){

        if(request.method!=='GET'){json(response,405,{error:'GET 요청을 사용해 주세요.'},{Allow:'GET'});return;}
        const query=url.searchParams.get('q')||'';
        const sources=(url.searchParams.get('sources')||'saramin,jobkorea,incruit').split(',').filter(Boolean);
        if(!query.trim()||query.trim().length>100||sources.some(source=>!sourceNames.has(source))){
          json(response,400,{error:'검색어는 1~100자로 입력하고 지원하는 사이트를 선택해 주세요.'});return;
        }
        let pages;
        try{pages=JSON.parse(url.searchParams.get('pages')||'{}');}
        catch{json(response,400,{error:'검색 페이지의 형식을 확인해 주세요.'});return;}
        try{
          const data=await searchJobs(query,sources,fetcher,pages,{fresh:url.searchParams.get('fresh')==='1'});
          json(response,200,data);
        }catch{json(response,400,{error:'검색 페이지를 확인해 주세요. 페이지는 1~100 사이여야 합니다.'});}
        return;
      }
      if(url.pathname==='/api/jobs/refresh'){
        if(request.method!=='POST'){json(response,405,{error:'POST 요청을 사용해 주세요.'},{Allow:'POST'});return;}
        const body=await readBody(request);
        try{
          const data=JSON.parse(body);
          const result=await checkJobs(data.ids,fetcher,{fresh:data.fresh===true});
          json(response,200,result);
        }catch{json(response,400,{error:'지원하는 실제 공고를 한 번에 1~5개 선택해 주세요.'});}
        return;
      }
      if(request.method!=='GET'&&request.method!=='HEAD'){
        json(response,405,{error:'지원하지 않는 요청 방식입니다.'},{Allow:'GET, HEAD'});return;
      }
      if(url.pathname==='/'){
        response.writeHead(302,{Location:'/explore','Cache-Control':'no-store'});response.end();return;
      }
      if(url.pathname==='/health'){
        if(request.method==='HEAD'){response.writeHead(200,{'Cache-Control':'no-store'});response.end();}
        else json(response,200,{status:'ok',service:'moajob',version:'1.1.0'});
        return;
      }
      const asset=assets.get(url.pathname);
      if(!asset){json(response,404,{error:'페이지를 찾을 수 없습니다.'});return;}
      const data=await readFile(path.join(publicDirectory,asset.file));
      response.writeHead(200,{
        'Content-Type':asset.type,
        'Content-Length':data.length,
        'Cache-Control':'no-cache',
        'X-Content-Type-Options':'nosniff',
      });
      response.end(request.method==='HEAD'?undefined:data);
    }catch(error){
      if(!response.headersSent)json(response,error instanceof HttpError?error.status:500,{error:error instanceof HttpError?error.message:'요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'});
      else response.end();
    }
  });
  server.headersTimeout=10000;
  server.requestTimeout=30000;
  server.keepAliveTimeout=5000;
  return server;
}

if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  const port=Number(process.env.PORT||3000),host=process.env.HOST||'0.0.0.0';
  if(!Number.isInteger(port)||port<1||port>65535)throw new Error('PORT는 1~65535 사이 정수여야 합니다.');
  const server=createAppServer();
  server.on('error',error=>{console.error('서버를 시작하지 못했습니다: '+error.message);process.exitCode=1;});
  server.listen(port,host,()=>console.log('모아잡 실행 중: http://'+(host==='0.0.0.0'?'localhost':host)+':'+port+'/explore'));
  for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>server.close(()=>process.exit(0)));
}

# 모아잡 · MOAJOB

사람인·잡코리아·인크루트의 공개 채용 검색을 한곳에서 확인하고, 관심 공고와 지원 현황을 관리하는 개인용 웹앱입니다.

배포된 모아잡의 화면과 검색 모듈을 기반으로, 호스팅 부분을 **Node.js 기본 서버**로 바꾼 GitHub 업로드용 코드입니다. 별도 패키지 의존성·API 키·데이터베이스 없이 실행할 수 있습니다. 내보낸 날짜: 2026-10-14.

## 빠르게 실행하기

1. [Node.js](https://nodejs.org/en/download) 22.13 이상을 설치합니다.
2. 압축을 풀고 `package.json`이 있는 폴더에서 터미널을 엽니다.
3. 아래 명령을 실행합니다.

```sh
npm install
npm start
```

브라우저에서 **http://localhost:3000/explore** 를 엽니다. 종료할 때는 터미널에서 `Ctrl+C`를 누릅니다.

외부 패키지가 없어 `node server.mjs`로 바로 실행해도 됩니다. `explore.html`을 파일로 직접 열면 검색 서버가 연결되지 않으므로 서버 주소로 접속하세요.

## GitHub에 업로드하기

1. GitHub에서 새 저장소를 만듭니다. 저장소 이름 예: `moajob`.
2. 저장소의 **Add file → Upload files**를 선택합니다.
3. 압축을 푼 폴더 **안의 파일과 폴더 전체**를 드래그합니다. ZIP 파일 자체를 업로드하지 않습니다.
4. 최상위에 `package.json`, `server.mjs`, `README.md`가 놓이는지 확인하고 저장합니다.

업로드 절차: [GitHub 공식 파일 업로드 안내](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository).

`.github/workflows/test.yml`도 포함되어 있습니다. GitHub Actions가 활성화된 저장소에서는 업로드·코드 변경·PR 시 Node 22와 24로 자동 검사를 실행합니다. [checkout](https://github.com/actions/checkout), [setup-node](https://github.com/actions/setup-node)의 공식 사용 예를 따릅니다.

## 포함된 기능

- 사람인·잡코리아·인크루트 통합 검색, 사이트별 연결 상태 표시
- 더보기, 같은 원본 공고 중복 제거, 조건 일치 공고 추가 탐색
- 전국 지역·근무지·경력·고용 형태·학력·연봉·마감·등록일·포함/제외 키워드 필터
- 조건 일치와 정보 확인 필요 공고를 별도 목록으로 표시
- 기업·제목·근무지가 일치하는 사이트 간 중복 추정 공고 묶기와 원본 링크 유지
- 메뉴 이동·새로고침·뒤로가기 시 검색 조건과 결과 복원, 검색 주소 공유
- 관심 공고, 지원 상태, 메모, 직접 추가, JSON 백업 내보내기·가져오기
- 모바일 저장 검색, 저장 조건의 새로 발견한 공고 비교, 원문·마감 재확인

독립 실행 검증 과정에서 원문 공고의 1~100년 경력 범위를 처리하도록 보완했습니다. 형식이 잘못된 공고 한 건 때문에 전체 결과가 사라지지 않도록 개별 검증도 적용했습니다. 직접 입력하는 경력의 0~50년 제한은 유지합니다.

원티드·리멤버는 현재 미연결입니다. 화면에 연결된 것처럼 표시하거나 공고를 생성하지 않습니다.

## 데이터와 검색 범위

관심 공고·메모·저장 조건은 브라우저의 `localStorage`에, 최근 가져온 결과는 `sessionStorage`에 저장합니다. 다른 기기나 주소로 옮길 때는 화면의 **연동 사이트 → 내 데이터 내보내기 / 백업 가져오기**를 이용하세요. 기존 모아잡에서 내보낸 백업도 가져올 수 있습니다.

검색 필터는 **지금까지 가져온 공고**에 적용됩니다. 더보기로 페이지를 확장할 수 있으며 사이트별 한 번의 검색에서 최대 100페이지까지 지원합니다. 공유 주소의 결과를 새 환경에서 복원할 때는 우선 최대 5페이지를 가져오고, 이후는 더보기로 이어 갑니다.

서버의 검색 캐시는 최대 5분, 원문 정보 캐시는 최대 10분 동안 재사용됩니다. 저장 검색의 ↻ 버튼은 검색 캐시를 건너뛰어 현재 결과를 확인합니다. ‘새로 발견’은 지난 확인 목록에 없던 공고를 뜻하며, 가져온 범위 안에서 비교합니다. 사이트를 닫아 둔 동안 자동으로 확인하거나 알림을 보내는 기능은 없습니다.

공개 검색 화면의 구조 변경이나 접근 제한이 생기면 연결 실패 상태를 표시합니다. 실패한 사이트를 ‘공고 0건’으로 간주하지 않습니다. 최종 지원 조건과 채용 여부는 원본 링크에서 확인할 수 있습니다.

## 실행 명령

| 명령 | 내용 |
| --- | --- |
| `npm start` | 서버 실행 |
| `npm run dev` | 서버 코드 변경 시 재시작하는 개발 모드 |
| `npm test` | 외부 채용사이트에 접속하지 않는 자동 검사 |
| `npm run test:live` | 세 사이트에 실제 검색 요청을 보내 연결 상태 확인 |

PowerShell에서 `npm` 실행 정책 오류가 발생하면 같은 명령의 `npm`을 `npm.cmd`로 바꿀 수 있습니다.

## 포트와 배포

기본 포트는 `3000`이며 `PORT`, `HOST` 환경변수로 바꿀 수 있습니다.

```powershell
# Windows PowerShell 예시
$env:PORT = "8080"
$env:HOST = "127.0.0.1"
npm start
```

`.env.example`을 `.env`로 복사해 사용하는 경우에는 다음 명령을 사용합니다. `npm start`는 `.env`를 자동으로 읽지 않습니다.

```sh
node --env-file=.env server.mjs
```

서버에 배포할 때는 Node.js 22.13 이상을 사용하고, 설치 명령은 `npm ci`, 시작 명령은 `npm start`로 설정합니다. 별도 빌드 단계는 없습니다. 호스팅에서 제공하는 `PORT`를 사용하고 외부 접속용 `HOST`는 `0.0.0.0`으로 설정합니다. 상태 확인 주소는 `/health`입니다.

**GitHub 업로드와 사이트 호스팅은 별도입니다.** [GitHub Pages는 정적 사이트 호스팅](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)이므로, 이 프로젝트의 검색 API를 실행하려면 Node.js 서버를 지원하는 환경이 필요합니다.

## 코드 구조

```text
server.mjs                   HTTP 서버와 API 경로
public/
  explore.html               화면 구조
  style.css                  화면 스타일과 모바일 배치
  app.js                     검색·저장·복원·메모·새 공고 비교
  core.js                    데이터 검증과 기본 기능
  domain.js                  필터·중복·마감 판정
lib/
  job-search.mjs             사이트별 검색과 페이지 확장
  listing-metadata.mjs       공개 목록의 정보 보완
  job-details.mjs            공개 원문과 마감 재확인
  detail-cache.mjs           원문 정보 캐시
tests/                       API와 파서 검사
scripts/check-live.mjs       실제 연결 확인
.github/workflows/test.yml   GitHub 자동 검사
```

API는 `GET /api/search?q=기획&sources=saramin,jobkorea,incruit`와 `POST /api/jobs/refresh`를 제공합니다. 페이지를 지정할 때는 `pages`에 `{"saramin":2,"jobkorea":2,"incruit":2}`를 JSON으로 넣습니다. 원문 확인 요청 본문은 `{"ids":["live-jobkorea-12345"],"fresh":true}` 형태이며 한 번에 최대 5건을 확인합니다.

이 코드 묶음에는 기존 호스팅의 프로젝트 ID, 인증정보, Git 이력, 임시 수집 결과, 개인 백업 파일이 포함되지 않습니다.

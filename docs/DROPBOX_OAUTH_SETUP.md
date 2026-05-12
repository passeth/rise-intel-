# Dropbox OAuth Refresh Token 설정 가이드

## 배경

Dropbox는 2021년 9월부터 장기 access token 발급을 중단했습니다.
기존 `DROPBOX_ACCESS_TOKEN` 방식은 약 4시간 후 만료되어 401 에러가 발생합니다.

**해결**: OAuth 2.0 Refresh Token 방식으로 전환하면 SDK가 자동으로 토큰을 갱신합니다.

## 현재 앱 정보

- **App Key**: `s0snnx2emz8cg60`
- **App Secret**: `<DROPBOX_APP_SECRET>`
- **Dropbox App Console**: https://www.dropbox.com/developers/apps

## 환경 변수 설정

`.env.local`에 다음 3개 변수를 설정합니다:

```env
DROPBOX_APP_KEY=<your_app_key>
DROPBOX_APP_SECRET=<your_app_secret>
DROPBOX_REFRESH_TOKEN=<발급받은_refresh_token>
```

> 기존 `DROPBOX_ACCESS_TOKEN`은 더 이상 필요하지 않습니다.

## Refresh Token 발급 방법

### Step 1: Authorization Code 발급

아래 URL을 브라우저에서 열고 "허용" 클릭:

```
https://www.dropbox.com/oauth2/authorize?client_id=<DROPBOX_APP_KEY>&response_type=code&token_access_type=offline
```

화면에 표시되는 authorization code를 복사합니다.

### Step 2: Refresh Token 교환

```bash
curl -X POST https://api.dropboxapi.com/oauth2/token \
  -d "code=<AUTHORIZATION_CODE>" \
  -d "grant_type=authorization_code" \
  -d "client_id=<DROPBOX_APP_KEY>" \
  -d "client_secret=<DROPBOX_APP_SECRET>"
```

응답에서 `refresh_token` 값을 `.env.local`에 설정합니다.

> Refresh Token은 사용자가 앱 접근을 해제하지 않는 한 **영구적**입니다.

## 코드 구현

```typescript
import { Dropbox } from 'dropbox'

const dbx = new Dropbox({
  clientId: process.env.DROPBOX_APP_KEY,
  clientSecret: process.env.DROPBOX_APP_SECRET,
  refreshToken: process.env.DROPBOX_REFRESH_TOKEN,
  fetch: fetch,
})
```

SDK가 API 호출 시 access token 만료를 감지하면 자동으로 refresh token을 사용해 새 access token을 발급받습니다.

## rise-mes 적용 현황 (2026-03-20)

- `src/lib/dropbox/client.ts` — refresh token 방식으로 전환 완료
- `.env.local` — `DROPBOX_APP_KEY`, `DROPBOX_APP_SECRET`, `DROPBOX_REFRESH_TOKEN` 설정 완료
- 기존 `DROPBOX_ACCESS_TOKEN` 제거됨

## rise-intel 적용 현황 (2026-03-20)

로컬 Dropbox 동기화 폴더(`DESIGN_DATA_BASE_PATH` + Node.js `fs`) 방식에서 **Dropbox SDK API** 방식으로 전환 완료.

- `src/lib/dropbox/client.ts` — OAuth refresh token + pathRoot 팀 네임스페이스 설정
- `src/lib/design-files.ts` — 모든 파일 작업을 Dropbox API로 전환
- `src/app/api/design-files/*` — 7개 API route 전체 전환 (browse, download, upload, preview, copy-files, create-version, save-xlsx)

### 추가 환경변수

```env
DROPBOX_ROOT_NAMESPACE_ID=<팀_root_namespace_id>
DROPBOX_BASE_FOLDER=/RISE/100_DESIGN DATA
```

- `DROPBOX_ROOT_NAMESPACE_ID`: 팀 Business 계정의 root namespace ID. 없으면 개인 네임스페이스로 접근됨.
- `DROPBOX_BASE_FOLDER`: 디자인 데이터 최상위 폴더 경로 (Dropbox 내 절대 경로).

### Root Namespace ID 확인 방법

Dropbox API로 현재 계정의 root namespace ID를 조회:

```bash
curl -X POST https://api.dropboxapi.com/2/users/get_current_account \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

응답의 `root_info.root_namespace_id` 값을 `DROPBOX_ROOT_NAMESPACE_ID`에 설정합니다.

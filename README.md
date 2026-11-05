# UE18sales — 북페어 판매 현황

한 페이지짜리 판매 집계표입니다. 수량은 **서버(Upstash Redis)에 저장**되어 새로고침하거나 다른 기기에서 열어도 그대로 유지됩니다.

- 탭: **11/6 · 11/7 · 11/8 · 총합** (총합은 세 날짜를 더한 값, 수정 불가·날짜별 수량 표시)
- 작품 | 작가 | 가격 | + / − | 수량 | 금액 을 한 줄씩 표시, 맨 아래에 합계 (총 ○개 · 총 금액)
- 우측 상단 한 / 中 버튼으로 한국어·중국어 전환
- 판매일 당일에 열면 그 날짜 탭이 먼저 열림. 다른 기기에서 입력한 수량은 15초마다 자동 반영
- 작품·가격을 바꾸려면 `index.html` 의 `WORKS`, 날짜를 바꾸려면 `index.html` 의 `DAYS` 와 `api/sales.js` 의 `DAYS` 를 함께 수정

## 구성
- `index.html` : 화면 (빌드 없음)
- `api/sales.js` : 저장 API (Vercel 서버리스 함수)
  - `GET /api/sales` → 날짜별 수량
  - `POST /api/sales` `{ day, id, delta: 1 | -1 }` → 수량 증감 (0 아래로는 내려가지 않음)

## Vercel 배포 + 저장소 연결
1. Vercel에서 이 레포를 Import (Framework Preset: Other, 빌드 설정 비움)
2. 프로젝트 → **Storage** → **Upstash for Redis**(Marketplace) 생성 후 이 프로젝트에 Connect
   → `KV_REST_API_URL`, `KV_REST_API_TOKEN` 환경변수가 자동으로 들어갑니다
3. **Redeploy** 한 번 하면 끝

디자인은 작품 소개 사이트(SYDesign)와 같은 톤(라이트그레이 배경, 블랙 글자, Noto Sans KR/SC)입니다.

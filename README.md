# 울산광역시 중구 부동산 플랫폼

울산광역시 중구 한정 공개 매물 플랫폼입니다.

- 공개 매물 지도/리스트 홈
- 회원가입 / 로그인
- 로그인 후 매물 등록
- 관리자 검토 / 공개 전환
- RDS(MySQL) + S3 presigned upload + EC2 standalone 배포
- 카카오 Local API 기반 주소/위치 검증

## 꼭 알아둘 점

- 카카오 REST API 키는 서버 주소 검색과 위치 검증에 사용합니다.
- 카카오 지도 렌더링은 별도의 JavaScript 키가 필요합니다.
- 사용자가 제공한 비밀 키는 저장소에 커밋하지 말고 `.env.local` 또는 서버 환경변수로 넣어야 합니다.

## 환경 변수

```bash
cp .env.example .env.local
```

필수 값:

- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `DATABASE_URL`
- `S3_BUCKET`, `S3_REGION`, `S3_UPLOAD_PREFIX`
- `ADMIN_SESSION_SECRET`
- `USER_SESSION_SECRET`
- `KAKAO_REST_API_KEY`
- `NEXT_PUBLIC_KAKAO_JS_KEY`

## DB 준비

신규 설치:

```sql
SOURCE db/schema.sql;
```

기존 DB 업그레이드:

```sql
SOURCE db/migrations/20260406_platform_upgrade.sql;
```

기본 중개사무소 예시:

```sql
INSERT INTO offices (name, slug, phone, address)
VALUES ('중구 대표 부동산', 'ulsan-junggu', '052-000-0000', '울산광역시 중구');
```

관리자 생성:

```bash
npm run create-admin -- --email admin@example.com --name 관리자 --password StrongPassword123! --officeId 1
```

## 로컬 실행

```bash
npm install
npx prisma validate
npm run dev
```

## EC2 / standalone 실행

CSS와 정적 파일이 빠지지 않게 아래 순서로 실행하세요.

```bash
npm install
npm run build:standalone
npm run start:standalone
```

또는 직접:

```bash
node .next/standalone/server.js
```

단, 이 경우에도 `npm run build:standalone`으로 정적 파일 복사를 먼저 끝내야 합니다.

## Prisma

`prisma/schema.prisma`도 함께 제공하므로, EC2에서 Prisma 관련 명령을 실행할 때 스키마 누락 오류가 나지 않습니다.

```bash
npm run prisma:generate
npx prisma validate
```


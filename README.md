# 한국 부동산 중개사무소용 매물 접수 웹앱

집주인 매물 접수 폼과 관리자용 접수 현황 화면만 제공하는 Next.js 앱입니다.

## 포함 기능

- 집주인 매물 접수 폼과 개인정보 수집 동의
- S3 presigned URL 기반 사진 직접 업로드
- 관리자 로그인과 접수 목록 조회
- 접수 상태 변경과 감사 로그 저장
- UTM, referrer, landing URL 저장
- `prisma/schema.prisma` 제공
- Dockerfile, `apprunner.yaml` 포함

## 기술 스택

- Next.js App Router + TypeScript
- MySQL(RDS)
- AWS S3 presigned upload

## 로컬 실행

1. 의존성 설치

```bash
npm install
```

2. 환경 변수 설정

```bash
cp .env.example .env.local
```

Prisma 명령을 사용할 경우에는 `.env` 또는 `DATABASE_URL` 환경 변수가 필요합니다.

3. DB 스키마 적용

```sql
SOURCE db/schema.sql;
```

또는 Prisma 스키마를 맞춰 두었기 때문에 아래 명령도 사용할 수 있습니다.

```bash
npm run prisma:generate
npm run prisma:push
```

4. 기본 중개사무소 생성

```sql
INSERT INTO offices (name, slug, phone, address)
VALUES ('예시 부동산', 'main-office', '02-1234-5678', '서울시 강남구');
```

5. 관리자 계정 생성

```bash
npm run create-admin -- --email admin@example.com --name 관리자 --password StrongPassword123! --officeId 1
```

6. 개발 서버 실행

```bash
npm run dev
```

## EC2 또는 수동 서버 실행

`output: "standalone"`을 켜 둔 상태에서 `.next/standalone/server.js`만 바로 실행하면 CSS와 정적 파일이 누락될 수 있습니다.
Next.js 공식 문서도 `public`과 `.next/static`을 standalone 폴더로 함께 복사해야 한다고 안내합니다.

- 공식 문서: [Next.js output standalone](https://nextjs.org/docs/15/app/api-reference/config/next-config-js/output)

이 프로젝트에서는 아래 명령으로 한 번에 준비할 수 있습니다.

```bash
npm install
npm run build:standalone
node .next/standalone/server.js
```

또는 아래처럼 사용할 수 있습니다.

```bash
npm run build:standalone
npm run start:standalone
```

## 배포 메모

- App Runner 소스 코드 배포 시 공식 설정 파일인 `apprunner.yaml`을 사용할 수 있습니다.
- Docker 이미지를 직접 배포하려면 `Dockerfile` 기준으로 ECR 이미지를 빌드한 뒤 App Runner 이미지 서비스로 연결하면 됩니다.
- S3 버킷은 비공개로 두고, 앱 서버가 presigned PUT URL만 발급하도록 구성했습니다.
- 관리자 세션은 `ADMIN_SESSION_SECRET`으로 서명한 HttpOnly 쿠키를 사용합니다.
- 앱 런타임은 `mysql2`를 사용하고, `prisma/schema.prisma`는 배포 환경 호환과 스키마 관리 편의를 위해 함께 제공합니다.

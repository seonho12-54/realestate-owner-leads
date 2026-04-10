# Downy Spring + React

기존 Next.js 버전과 같은 기능 흐름을 유지하면서, 프론트와 백엔드를 분리한 `Spring Boot + React` 병행 구성을 추가했습니다.

## 구성

- `backend/`
  - Spring Boot API
  - MySQL(RDS), S3 presigned upload, Kakao Local API, 세션 쿠키 인증
- `frontend/`
  - React + Vite
  - 공개 홈, 로그인, 회원가입, 매물 등록, 관리자 콘솔

## 포함 기능

- 공개 홈에서 승인된 매물 목록과 지도 보기
- 비회원은 지도와 대략적인 매물 존재 여부만 확인
- 회원가입 시 1회 위치 인증
- 회원 로그인 후 상세 보기와 매물 등록
- 관리자 로그인 후 `/admin/leads`에서 상태 변경, 공개 전환, 메모 관리
- S3 presigned URL 업로드
- 브라우저 이미지 압축 후 업로드
- Kakao 주소 검색과 좌표 기반 허용 지역 검증

## 허용 지역

- 울산광역시 중구 다운동
- 경기도 용인시 처인구 유방동
- 경기도 용인시 처인구 역북동
- 서울특별시 마포구 서교동

## 요구 사항

- Node.js 20+
- Java 21
- Maven 3.8+
- MySQL 8+

## 환경변수

백엔드 예시는 `backend/.env.example`, 프론트 예시는 `frontend/.env.example`에 있습니다.

주요 백엔드 환경변수:

- `SPRING_DATASOURCE_URL`
- `SPRING_DATASOURCE_USERNAME`
- `SPRING_DATASOURCE_PASSWORD`
- `APP_BASE_URL`
- `FRONTEND_ORIGIN`
- `APP_CORS_ALLOWED_ORIGINS`
- `ADMIN_SESSION_SECRET`
- `APP_COOKIE_SAME_SITE`
- `APP_COOKIE_DOMAIN`
- `APP_COOKIE_SECURE`
- `USER_SESSION_SECRET`
- `KAKAO_REST_API_KEY`
- `KAKAO_JS_KEY`
- `S3_BUCKET`
- `S3_REGION`
- `S3_UPLOAD_PREFIX`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

주요 프론트 환경변수:

- `VITE_API_PROXY_TARGET`
- `VITE_API_BASE_URL`
- `VITE_KAKAO_JS_KEY`

## 관리자 로그인

- 관리자 로그인 화면: `/admin/login`
- 실제 관리자 계정은 `admins` 테이블에 저장된 이메일/비밀번호 해시를 기준으로 인증합니다.
- 배포 환경에서 프론트와 백엔드 도메인이 다르면 아래 값을 함께 맞춰야 쿠키 세션이 유지됩니다.
  - `APP_CORS_ALLOWED_ORIGINS`
  - `APP_COOKIE_SAME_SITE=None`
  - `APP_COOKIE_SECURE=true`
  - `APP_COOKIE_DOMAIN=<배포 쿠키 도메인>`
- 프론트 요청은 `credentials: include`로 쿠키를 함께 보내도록 구현되어 있습니다.

## 로컬 실행

백엔드:

```bash
cd backend
mvn spring-boot:run
```

프론트:

```bash
cd frontend
npm install
npm run dev
```

## EC2 + PM2 배포

중요: PM2는 `ecosystem.spring-react.cjs` 파일명을 직접 주면 설정 파일이 아니라 스크립트로 잘못 실행할 수 있습니다. 배포할 때는 표준 이름인 `ecosystem.config.js`를 사용하세요.

### 1. 코드와 빌드 준비

```bash
cd ~/realestate-owner-leads
git pull origin main

source ~/downy-spring.env

cd backend
export JAVA_HOME=/usr/lib/jvm/java-21-amazon-corretto
export PATH=$JAVA_HOME/bin:$PATH
mvn clean package -DskipTests

cd ../frontend
npm install
npm run build
```

### 2. 잘못 떠 있는 기존 PM2 프로세스 정리

```bash
cd ~/realestate-owner-leads
pm2 delete ecosystem.spring-react
pm2 delete realestate-app
```

목록에서 이름이 다르면 `pm2 list`로 확인 후 해당 이름을 지우면 됩니다.

### 3. 새 프론트와 백엔드 실행

```bash
cd ~/realestate-owner-leads
source ~/downy-spring.env

pm2 start ecosystem.config.js --only downy-api --update-env
pm2 start ecosystem.config.js --only downy-web --update-env
pm2 save
pm2 list
```

### 4. 로그 확인

```bash
pm2 logs downy-api --lines 50
pm2 logs downy-web --lines 50
```

## 502 Bad Gateway가 날 때 체크할 것

- `pm2 list`에 `downy-api`, `downy-web` 두 프로세스가 실제로 보이는지
- `ecosystem.spring-react` 같은 이름의 잘못된 프로세스만 떠 있지 않은지
- `frontend/dist`가 실제로 빌드되어 있는지
- `backend/target/downy-api-0.0.1-SNAPSHOT.jar`가 생겼는지
- Nginx가 `3000`은 프론트, `8080`은 백엔드로 프록시하고 있는지

## 주요 API

- `GET /api/session`
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/admin/login`
- `POST /api/admin/logout`
- `GET /api/listings/preview`
- `GET /api/listings`
- `GET /api/listings/{id}`
- `GET /api/public/listings`
- `GET /api/public/listings/{id}`
- `POST /api/leads`
- `GET /api/me/leads`
- `PATCH /api/me/leads/{id}`
- `GET /api/admin/leads`
- `PATCH /api/admin/leads/{id}`
- `POST /api/uploads/presign`
- `POST /api/location/verify`
- `POST /api/location/reverify`
- `GET /api/region/me`
- `GET /api/location/address-search`
- `GET /api/offices`

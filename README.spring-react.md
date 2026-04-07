# Downy Spring + React

현재 Next.js 버전과 같은 흐름을 기준으로, 별도 병행 구조의 `Spring Boot + React` 앱을 추가했습니다.

## 폴더 구조

- `backend/`
  - Spring Boot API
  - MySQL(RDS), S3 presigned upload, Kakao Local API, 세션 쿠키 기반 인증
- `frontend/`
  - React + Vite
  - 공개 홈, 회원 로그인/회원가입, 매물 등록, 관리자 로그인/관리 화면

## 포함된 기능

- 공개 홈에서 승인된 매물 목록/지도/클러스터 보기
- 비회원은 대략적인 매물 흐름만 확인
- 회원가입 시 1회 위치 인증 후 로컬 저장
- 회원 로그인 후 상세 보기 / 매물 등록
- 관리자 로그인 후 `/admin/leads`에서 상태 변경 / 공개 전환 / 메모 관리
- S3 presigned URL 업로드
- 브라우저 이미지 압축 후 업로드
- Kakao 주소 검색 / 좌표 기반 허용 지역 검증

## 허용 지역

- 울산광역시 중구 다운동
- 경기도 용인시 처인구 포곡읍

## 실행 전 요구사항

- Node.js 20+
- Java 21
- Maven 3.9+
- MySQL 8+

로컬 확인 결과:

- `frontend/` 는 `npm run build` 통과
- `backend/` 는 이 작업 환경에 Maven이 없고 Java가 8 버전이라 실제 빌드는 여기서 못 돌렸습니다

## 백엔드 실행

1. 환경변수 준비

`backend/.env.example` 내용을 참고해 아래 값을 설정합니다.

- `SPRING_DATASOURCE_URL`
- `SPRING_DATASOURCE_USERNAME`
- `SPRING_DATASOURCE_PASSWORD`
- `APP_BASE_URL`
- `ADMIN_SESSION_SECRET`
- `USER_SESSION_SECRET`
- `KAKAO_REST_API_KEY`
- `KAKAO_JS_KEY`
- `S3_BUCKET`
- `S3_REGION`
- `S3_UPLOAD_PREFIX`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `FRONTEND_ORIGIN`

2. 실행

```bash
cd backend
mvn spring-boot:run
```

기본 포트는 `8080` 입니다.

## 프론트 실행

1. 환경변수 준비

`frontend/.env.example` 참고:

- `VITE_API_PROXY_TARGET=http://localhost:8080`
- `VITE_KAKAO_JS_KEY`

2. 실행

```bash
cd frontend
npm install
npm run dev
```

기본 포트는 `5173` 입니다.

## 배포 메모

- 프론트와 백엔드는 `/api` 기준 같은 도메인 뒤에 리버스 프록시로 붙이는 구성을 권장합니다.
- 카카오 JavaScript SDK 도메인에는 실제 공개 주소를 정확히 등록해야 합니다.
- S3 업로드는 `PUT` presigned URL 방식이라 버킷 CORS 설정이 필요합니다.
- 쿠키 보안 플래그는 `APP_BASE_URL` 이 `https://` 로 시작하면 자동으로 `secure` 로 설정됩니다.

## 주요 엔드포인트

- `GET /api/session`
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/admin/login`
- `POST /api/admin/logout`
- `GET /api/public/listings`
- `GET /api/public/listings/{id}`
- `POST /api/leads`
- `GET /api/admin/leads`
- `PATCH /api/admin/leads/{id}`
- `POST /api/uploads/presign`
- `POST /api/location/verify`
- `GET /api/location/address-search`
- `GET /api/offices`

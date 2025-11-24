# 📸 TodaysUs (PhotoVault)

사진을 올리고, 썸네일을 만들고, 메타데이터까지 함께 보관하는 S3 호환 스토리지 기반 포토 보관함입니다. 대용량 업로드는 Presigned URL로 직접 S3/MinIO에 전송하고, 백엔드는 메타데이터와 썸네일 생성만 담당합니다.

Production: https://todaysus-serverbased-frontend.onrender.com/ (정적 프런트는 Render, 백엔드도 Render, 스토리지는 AWS S3)

---

## 주요 기능

-   Presigned URL 기반 클라이언트→스토리지 직접 업로드
-   원본 이미지 저장 + 400x400 JPG 썸네일 자동 생성 (Thumbnailator, 비동기)
-   사진 이름/위치/설명 메타데이터 저장 및 노출
-   Infinite scroll 기반 갤러리, 모달 확대/축소·팬, 다운로드/삭제
-   MinIO 로컬 ↔ AWS S3 프로덕션 호환
-   Docker Compose로 DB/MinIO 로컬 부팅

---

## 아키텍처

```
React (Vite) ── /api/upload/init ──▶ Spring Boot
                                  │ presigned URL 발급
Client ── PUT ──▶ S3/MinIO (직접 업로드)
                                  │ /upload/{id}/complete 콜백
                                  └─ 썸네일 생성 후 DB 메타데이터 업데이트
Frontend ── /api/users/{id}/photos ▶ 목록·삭제
```

---

## 기술 스택

-   Frontend: React 18, Vite, TypeScript, Axios
-   Backend: Spring Boot 3.5 (Web, Validation, Data JPA), Lombok, Thumbnailator
-   DB: PostgreSQL
-   Object Storage: MinIO (local), AWS S3 (prod)
-   Infra: Docker Compose, Java 21, Node 18+

---

## 로컬 개발 가이드

### 1) 환경 변수 작성 (`infra/.env`)

```
POSTGRES_USER=?
POSTGRES_PASSWORD=?
POSTGRES_DB=todaysus
PG_PORT=5432

MINIO_ROOT_USER=?
MINIO_ROOT_PASSWORD=?
MINIO_API_PORT=9000
MINIO_CONSOLE_PORT=9001
MINIO_BUCKET=todaysus
```

### 2) DB + MinIO 기동

```
docker compose -f infra/docker-compose.yaml --env-file infra/.env up -d
```

접속: MinIO Console http://localhost:9001, PostgreSQL localhost:${PG_PORT}

### 3) 백엔드 실행

환경 변수를 로드한 뒤 Spring Boot를 띄웁니다.

```
cd backend
export $(grep -v '^#' ../infra/.env | xargs) && ./gradlew bootRun
```

기본 포트: 8080, 헬스체크: GET /health

### 4) 프런트엔드 실행

```
cd ../frontend
cp .env.example .env.local   # 없으면 직접 생성
# VITE_API_BASE_URL=          # 로컬은 비워두면 Vite 프록시(/api→http://localhost:8080)
npm install
npm run dev
```

로컬 접속: http://localhost:5173

---

## API 개요

-   `POST /upload/init`  
    Body: `{ filename, contentType, name?, location?, description? }`  
    Response: `{ photoId, key, url }` (url은 S3/MinIO PUT presigned)

-   `POST /upload/{photoId}/complete`  
    업로드 완료 콜백 → 썸네일 생성 및 메타데이터 확정

-   `GET /users/{userId}/photos?page=&size=`  
    Spring Data Page 반환. `imageUrl`(썸네일 또는 원본 presigned), `originalImageUrl` 제공

-   `DELETE /users/{userId}/photos/{photoId}`  
    원본/썸네일 객체 삭제 후 DB 레코드 제거

-   `GET /health`  
    헬스 체크 문자열 반환

현재 인증은 없으며 프런트/백엔드는 userId=1을 사용합니다.

---

## 데이터 모델

`photos` 테이블 (JPA `Photo` 엔티티)

-   `id` BIGSERIAL PK
-   `user_id` BIGINT
-   `filename`, `content_type`
-   `original_key`, `thumbnail_key`
-   `name`, `location`, `description (TEXT)`
-   `created_at` TIMESTAMPTZ (기본값 now())

썸네일 키 규칙: `users/{userId}/photos/{photoId}/thumbnail`  
원본 키 규칙: `users/{userId}/photos/{photoId}/original`

---

## 프런트엔드 UX 하이라이트

-   Masonry 느낌의 카드형 갤러리 + Intersection Observer로 무한 스크롤
-   모달에서 이미지 확대/축소(CTRL+휠), 드래그 팬, 다운로드/삭제
-   썸네일 없을 때 원본 presigned URL 자동 사용
-   메타데이터(이름/위치/설명) 입력 후 업로드 지원

---

## 배포 메모

-   프런트: Render Static Site → https://todaysus-serverbased-frontend.onrender.com/
-   백엔드: Render Web Service (Dockerfile 사용, `-Dserver.port=$PORT` 설정)
-   스토리지: AWS S3 (prod). 로컬은 MinIO path-style 설정으로 동일 코드 사용

---

## 라이선스

MIT

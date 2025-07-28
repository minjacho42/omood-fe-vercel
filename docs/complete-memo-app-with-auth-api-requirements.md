# 완전한 메모 앱 API 요구사항 문서 (인증 포함)

## 개요
Google OAuth 인증, AI 기반 자동 카테고리 분류, 멀티미디어 지원, 메모 정리 기능, 사용자 정의 카테고리 관리가 포함된 완전한 메모 앱의 백엔드 API 요구사항입니다.

## 목차
1. [인증 시스템](#인증-시스템)
2. [데이터 구조](#데이터-구조)
3. [사용자 관리 API](#사용자-관리-api)
4. [카테고리 관리 API](#카테고리-관리-api)
5. [메모 관리 API](#메모-관리-api)
6. [메모 정리 API](#메모-정리-api)
7. [AI 분류 API](#ai-분류-api)
8. [검색 및 필터링 API](#검색-및-필터링-api)
9. [통계 및 요약 API](#통계-및-요약-api)
10. [데이터베이스 스키마](#데이터베이스-스키마)
11. [에러 처리](#에러-처리)
12. [성능 최적화](#성능-최적화)
13. [보안 고려사항](#보안-고려사항)

## 인증 시스템

### 1. Google OAuth 2.0 인증 플로우

#### 1.1 Google OAuth 콜백 처리
**Endpoint:** `POST /auth/google/callback`

**Description:** Google OAuth 인증 코드를 받아 사용자 정보를 가져오고 JWT 토큰을 발급합니다.

#### Request Body
\`\`\`json
{
  "code": "google_oauth_authorization_code"
}
\`\`\`

#### Response Format
\`\`\`json
{
  "success": true,
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "사용자 이름",
    "picture": "https://lh3.googleusercontent.com/...",
    "created_at": "2025-01-21T10:30:00Z"
  },
  "tokens": {
    "access_token": "jwt_access_token",
    "refresh_token": "jwt_refresh_token",
    "expires_in": 3600
  }
}
\`\`\`

#### 처리 과정
1. Google OAuth 코드로 액세스 토큰 요청
2. Google API로 사용자 정보 조회
3. 신규 사용자인 경우 데이터베이스에 등록
4. JWT 토큰 생성 및 쿠키 설정
5. 기본 카테고리 생성 (신규 사용자만)

### 1.2 사용자 인증 확인
**Endpoint:** `GET /auth/me`

**Description:** 현재 로그인된 사용자 정보를 반환합니다.

#### Response Format
\`\`\`json
{
  "user_id": "user_123",
  "email": "user@example.com",
  "name": "사용자 이름",
  "picture": "https://lh3.googleusercontent.com/...",
  "timezone": "Asia/Seoul",
  "created_at": "2025-01-21T10:30:00Z"
}
\`\`\`

### 1.3 로그아웃
**Endpoint:** `POST /auth/logout`

**Description:** 사용자 세션을 종료하고 토큰을 무효화합니다.

#### Response Format
\`\`\`json
{
  "success": true,
  "message": "로그아웃되었습니다"
}
\`\`\`

### 1.4 토큰 갱신
**Endpoint:** `POST /auth/refresh`

**Description:** 리프레시 토큰을 사용하여 새로운 액세스 토큰을 발급합니다.

#### Response Format
\`\`\`json
{
  "access_token": "new_jwt_access_token",
  "expires_in": 3600
}
\`\`\`

## 데이터 구조

### 사용자 데이터 구조
\`\`\`json
{
  "id": "user_123",
  "email": "user@example.com",
  "name": "사용자 이름",
  "picture": "https://lh3.googleusercontent.com/...",
  "google_id": "google_user_id",
  "timezone": "Asia/Seoul",
  "created_at": "2025-01-21T10:30:00Z",
  "updated_at": "2025-01-21T10:30:00Z",
  "last_login_at": "2025-01-21T10:30:00Z"
}
\`\`\`

### 메모 데이터 구조
\`\`\`json
{
  "id": "memo_123",
  "user_id": "user_456",
  "content": "메모의 텍스트 내용 (항상 존재)",
  "attachments": [
    {
      "id": "att_123",
      "type": "image" | "audio",
      "url": "파일 URL",
      "filename": "original_filename.jpg",
      "size": 1024000,
      "created_at": "2025-01-21T10:30:00Z"
    }
  ],
  "tags": ["tag1", "tag2"],
  "category": "idea",
  "category_confidence": 0.85,
  "is_archived": false,
  "created_at": "2025-01-21T10:30:00Z",
  "updated_at": "2025-01-21T10:30:00Z"
}
\`\`\`

### 카테고리 데이터 구조
\`\`\`json
{
  "key": "idea",
  "name": "아이디어",
  "icon": "lightbulb",
  "color": "#F59E0B",
  "user_id": "user_456",
  "is_default": true,
  "created_at": "2025-01-21T10:30:00Z",
  "updated_at": "2025-01-21T10:30:00Z"
}
\`\`\`

## 사용자 관리 API

### 1. 사용자 프로필 조회
**Endpoint:** `GET /user/profile`

#### Response Format
\`\`\`json
{
  "user_id": "user_456",
  "email": "user@example.com",
  "name": "사용자 이름",
  "picture": "https://lh3.googleusercontent.com/...",
  "timezone": "Asia/Seoul",
  "created_at": "2025-01-01T00:00:00Z",
  "stats": {
    "total_memos": 150,
    "categories_count": 8,
    "last_memo_at": "2025-01-21T10:30:00Z"
  }
}
\`\`\`

### 2. 사용자 설정 업데이트
**Endpoint:** `PUT /user/profile`

#### Request Body
\`\`\`json
{
  "timezone": "Asia/Seoul",
  "name": "새로운 이름"
}
\`\`\`

### 3. 계정 삭제
**Endpoint:** `DELETE /user/account`

**Description:** 사용자 계정과 모든 관련 데이터를 삭제합니다.

#### Response Format
\`\`\`json
{
  "success": true,
  "message": "계정이 삭제되었습니다",
  "deleted_data": {
    "memos": 150,
    "attachments": 45,
    "categories": 3
  }
}
\`\`\`

## 카테고리 관리 API

### 1. 카테고리 목록 조회
**Endpoint:** `GET /categories`

#### Response Format
\`\`\`json
{
  "categories": [
    {
      "key": "idea",
      "name": "아이디어",
      "icon": "lightbulb",
      "color": "#F59E0B",
      "is_default": true,
      "memo_count": 15,
      "created_at": "2025-01-21T10:30:00Z"
    }
  ]
}
\`\`\`

### 2. 카테고리 생성
**Endpoint:** `POST /categories`

#### Request Body
\`\`\`json
{
  "key": "custom_category",
  "name": "커스텀 카테고리",
  "icon": "star",
  "color": "#10B981"
}
\`\`\`

### 3. 카테고리 수정
**Endpoint:** `PUT /categories/{category_key}`

#### Request Body
\`\`\`json
{
  "name": "수정된 카테고리명",
  "icon": "new_icon",
  "color": "#EF4444"
}
\`\`\`

### 4. 카테고리 삭제
**Endpoint:** `DELETE /categories/{category_key}`

#### Response Format
\`\`\`json
{
  "success": true,
  "moved_memos_count": 5,
  "moved_to_category": "uncategorized"
}
\`\`\`

## 메모 관리 API

### 1. 메모 생성
**Endpoint:** `POST /memo`

#### Request (FormData)
- `content`: "메모의 텍스트 내용" (필수)
- `tags`: "tag1,tag2,tag3" (선택사항)
- `category`: "idea" (선택사항, AI 분류 전까지 임시)
- `image_0`: File (선택사항)
- `image_1`: File (선택사항)
- `audio_0`: File (선택사항)

#### Response Format
\`\`\`json
{
  "id": "memo_123",
  "user_id": "user_456",
  "content": "메모의 텍스트 내용",
  "attachments": [
    {
      "id": "att_123",
      "type": "image",
      "url": "https://cdn.example.com/images/att_123.jpg",
      "filename": "att_123.jpg",
      "size": 1024000,
      "created_at": "2025-01-21T10:30:00Z"
    }
  ],
  "tags": ["tag1", "tag2"],
  "category": "idea",
  "category_confidence": null,
  "is_archived": false,
  "created_at": "2025-01-21T10:30:00Z",
  "updated_at": "2025-01-21T10:30:00Z"
}
\`\`\`

### 2. 메모 목록 조회
**Endpoint:** `GET /memo/list`

#### Request Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| tz | string | Yes | 사용자 타임존 (예: Asia/Seoul) |
| start_date | string | No | 시작 날짜 (YYYY-MM-DD) |
| end_date | string | No | 종료 날짜 (YYYY-MM-DD) |
| category | string | No | 카테고리 필터 |
| tags | string | No | 태그 필터 (쉼표로 구분) |
| search | string | No | 검색 키워드 |
| archived | boolean | No | 아카이브된 메모 포함 여부 (기본값: false) |
| limit | number | No | 결과 개수 제한 (기본값: 50) |
| offset | number | No | 페이지네이션 오프셋 (기본값: 0) |

### 3. 메모 수정
**Endpoint:** `PUT /memo/{memo_id}`

### 4. 메모 삭제
**Endpoint:** `DELETE /memo/{memo_id}`

### 5. 메모 카테고리 변경
**Endpoint:** `PUT /memo/{memo_id}/category`

#### Request Body
\`\`\`json
{
  "category": "new_category",
  "confidence": 0.95
}
\`\`\`

## 메모 정리 API

### 1. 정리 대상 메모 조회
**Endpoint:** `GET /memo/organize`

#### Request Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| tz | string | Yes | 사용자 타임존 |
| limit | number | No | 결과 개수 제한 (기본값: 50) |
| min_age_days | number | No | 최소 경과 일수 (기본값: 7) |

### 2. 메모 정리 액션
**Endpoint:** `PUT /memo/{memo_id}/organize`

#### Request Body
\`\`\`json
{
  "action": "keep" | "delete"
}
\`\`\`

## AI 분류 API

### 1. 자동 분류 실행
**Endpoint:** `POST /memo/classify`

#### Request Body
\`\`\`json
{
  "memo_ids": ["memo_123", "memo_456"],
  "force_reclassify": false
}
\`\`\`

### 2. 분류 작업 상태 조회
**Endpoint:** `GET /memo/classify/status/{job_id}`

## 데이터베이스 스키마

### 1. users 테이블
\`\`\`sql
CREATE TABLE users (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    picture VARCHAR(500),
    google_id VARCHAR(255) UNIQUE NOT NULL,
    timezone VARCHAR(50) DEFAULT 'UTC',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_users_email ON users(email);
\`\`\`

### 2. user_sessions 테이블
\`\`\`sql
CREATE TABLE user_sessions (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    refresh_token VARCHAR(500) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
\`\`\`

### 3. categories 테이블
\`\`\`sql
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    key VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(50) NOT NULL,
    color VARCHAR(7) NOT NULL,
    user_id VARCHAR(255),
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, key),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 기본 카테고리 생성 함수
CREATE OR REPLACE FUNCTION create_default_categories(p_user_id VARCHAR(255))
RETURNS VOID AS $$
BEGIN
    INSERT INTO categories (key, name, icon, color, user_id, is_default) VALUES
    ('idea', '아이디어', 'lightbulb', '#F59E0B', p_user_id, TRUE),
    ('study', '공부', 'book', '#3B82F6', p_user_id, TRUE),
    ('shopping', '쇼핑', 'shopping-cart', '#10B981', p_user_id, TRUE),
    ('work', '업무', 'briefcase', '#8B5CF6', p_user_id, TRUE),
    ('personal', '개인', 'heart', '#EC4899', p_user_id, TRUE),
    ('quote', '인용구', 'book', '#6B7280', p_user_id, TRUE),
    ('uncategorized', '분류중', 'rotate-ccw', '#9CA3AF', p_user_id, TRUE);
END;
$$ LANGUAGE plpgsql;
\`\`\`

### 4. snippets 테이블 (수정)
\`\`\`sql
CREATE TABLE snippets (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    tags TEXT[],
    category VARCHAR(50) DEFAULT 'uncategorized',
    category_confidence DECIMAL(3,2),
    is_archived BOOLEAN DEFAULT FALSE,
    last_organized_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 인덱스
CREATE INDEX idx_snippets_user_id ON snippets(user_id);
CREATE INDEX idx_snippets_user_date ON snippets(user_id, created_at DESC);
CREATE INDEX idx_snippets_user_category ON snippets(user_id, category);
CREATE INDEX idx_snippets_user_archived ON snippets(user_id, is_archived);
CREATE INDEX idx_snippets_organize ON snippets(user_id, is_archived, last_organized_at);
CREATE INDEX idx_snippets_content_search ON snippets USING GIN(to_tsvector('korean', content));
CREATE INDEX idx_snippets_tags ON snippets USING GIN(tags);
\`\`\`

### 5. memo_attachments 테이블
\`\`\`sql
CREATE TABLE memo_attachments (
    id VARCHAR(255) PRIMARY KEY,
    memo_id VARCHAR(255) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('image', 'audio')),
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (memo_id) REFERENCES snippets(id) ON DELETE CASCADE
);

CREATE INDEX idx_memo_attachments_memo_id ON memo_attachments(memo_id);
CREATE INDEX idx_memo_attachments_type ON memo_attachments(memo_id, type);
\`\`\`

## 에러 처리

### HTTP Status Codes
- `200`: 성공
- `201`: 생성 성공
- `400`: 잘못된 요청
- `401`: 인증 실패
- `403`: 권한 없음
- `404`: 리소스를 찾을 수 없음
- `409`: 충돌 (중복 데이터 등)
- `413`: 파일 크기 초과
- `422`: 유효성 검사 실패
- `429`: 요청 한도 초과
- `500`: 서버 내부 오류

### 인증 관련 에러
\`\`\`json
{
  "error": "Authentication failed",
  "message": "Google OAuth 인증에 실패했습니다",
  "code": "GOOGLE_AUTH_FAILED",
  "details": {
    "google_error": "invalid_grant"
  }
}
\`\`\`

### 주요 에러 코드
- `GOOGLE_AUTH_FAILED`: Google OAuth 인증 실패
- `INVALID_TOKEN`: 유효하지 않은 JWT 토큰
- `TOKEN_EXPIRED`: 만료된 토큰
- `USER_NOT_FOUND`: 존재하지 않는 사용자
- `CATEGORY_NOT_FOUND`: 존재하지 않는 카테고리
- `MEMO_NOT_FOUND`: 존재하지 않는 메모
- `FILE_TOO_LARGE`: 파일 크기 초과
- `INVALID_FILE_TYPE`: 지원하지 않는 파일 형식

## 보안 고려사항

### 1. OAuth 보안
- State 파라미터를 통한 CSRF 방지
- Authorization Code 일회성 사용
- 토큰 만료 시간 관리 (Access Token: 1시간, Refresh Token: 30일)

### 2. JWT 토큰 보안
- 강력한 시크릿 키 사용
- 토큰 만료 시간 설정
- HttpOnly 쿠키 사용
- Secure 플래그 설정 (HTTPS)

### 3. 데이터 보안
- 사용자별 데이터 격리
- SQL Injection 방지
- XSS 공격 방지
- 파일 업로드 보안

### 4. API 보안
- Rate Limiting (사용자당 분당 100회)
- CORS 설정
- HTTPS 강제
- 요청 크기 제한

## 성능 최적화

### 1. 캐싱 전략
- **Redis 캐싱**:
  - 사용자 세션: TTL 1시간
  - 카테고리 목록: TTL 1시간
  - 메모 목록 (자주 조회되는 기간): TTL 30분

### 2. 데이터베이스 최적화
- 적절한 인덱스 설정
- 쿼리 최적화
- 커넥션 풀링
- 읽기 복제본 활용

### 3. 파일 처리 최적화
- CDN 활용
- 이미지 압축 및 리사이징
- 음성 파일 압축

## 배포 및 모니터링

### 1. 환경 변수
\`\`\`env
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_EXPIRES_IN=30d

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/memo_app

# Redis
REDIS_URL=redis://localhost:6379

# File Storage
AWS_S3_BUCKET=your-s3-bucket
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# API
API_BASE_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000
\`\`\`

### 2. 모니터링
- API 응답 시간 추적
- 에러 발생률 모니터링
- 사용자 활동 로그
- 시스템 리소스 모니터링

이 문서는 Google OAuth 인증이 포함된 완전한 메모 앱의 백엔드 API 요구사항을 정의합니다. 프론트엔드와 백엔드 개발자가 이 문서를 참고하여 일관된 API를 구현할 수 있습니다.

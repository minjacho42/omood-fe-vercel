# Session Backend API Requirements

## Overview
포모도로 세션 관리를 위한 백엔드 API 요구사항입니다. 세션의 생성, 상태 변경, 완료, 회고 등의 모든 단계를 추적할 수 있어야 합니다.

## API Endpoints

### 1. POST /session - 세션 생성
새로운 포모도로 세션을 생성합니다.

**Request Body:**
\`\`\`json
{
  "id": "uuid-string",
  "subject": "JWT refresh token 로직 작성",
  "goal": "/login 테스트까지 완료",
  "duration": 25,
  "breakDuration": 5,
  "tags": ["#backend", "#jwt", "#auth"],
  "startTime": "2024-01-15T10:30:00.000Z",
  "completed": false
}
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "session": {
    "id": "uuid-string",
    "subject": "JWT refresh token 로직 작성",
    "goal": "/login 테스트까지 완료",
    "duration": 25,
    "breakDuration": 5,
    "tags": ["#backend", "#jwt", "#auth"],
    "startTime": "2024-01-15T10:30:00.000Z",
    "endTime": null,
    "completed": false,
    "status": "created",
    "reflection": null,
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z"
  }
}
\`\`\`

### 2. PUT /session/{id}/status - 세션 상태 변경
세션의 상태를 변경합니다 (시작, 일시정지, 재시작, 취소).

**Request Body:**
\`\`\`json
{
  "status": "started|paused|resumed|cancelled",
  "timestamp": "2024-01-15T10:31:00.000Z"
}
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "session": {
    "id": "uuid-string",
    "status": "started",
    "updated_at": "2024-01-15T10:31:00.000Z"
  }
}
\`\`\`

### 3. PUT /session/{id} - 세션 완료 및 회고 제출
세션을 완료하고 회고를 제출합니다.

**Request Body:**
\`\`\`json
{
  "endTime": "2024-01-15T10:55:00.000Z",
  "completed": true,
  "reflection": {
    "summary": "DB 연결 재설정 완료, env 분리 진행 중",
    "blockers": "환경변수 설정에서 약간의 어려움",
    "insights": "Docker 환경에서 env 파일 로딩 방식이 다름을 알게 됨",
    "nextGoal": "테스트 코드 작성 및 API 문서화"
  }
}
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "session": {
    "id": "uuid-string",
    "endTime": "2024-01-15T10:55:00.000Z",
    "completed": true,
    "reflection": {
      "summary": "DB 연결 재설정 완료, env 분리 진행 중",
      "blockers": "환경변수 설정에서 약간의 어려움",
      "insights": "Docker 환경에서 env 파일 로딩 방식이 다름을 알게 됨",
      "nextGoal": "테스트 코드 작성 및 API 문서화"
    },
    "updated_at": "2024-01-15T10:55:00.000Z"
  }
}
\`\`\`

### 4. GET /session/list - 세션 목록 조회
사용자의 세션 목록을 조회합니다.

**Query Parameters:**
- `tz`: 타임존 (예: "Asia/Seoul")
- `start_date`: 시작 날짜 (YYYY-MM-DD)
- `end_date`: 종료 날짜 (YYYY-MM-DD)
- `status`: 세션 상태 필터 (optional)

**Response:**
\`\`\`json
{
  "sessions": [
    {
      "id": "uuid-string",
      "subject": "JWT refresh token 로직 작성",
      "goal": "/login 테스트까지 완료",
      "duration": 25,
      "breakDuration": 5,
      "tags": ["#backend", "#jwt", "#auth"],
      "startTime": "2024-01-15T10:30:00.000Z",
      "endTime": "2024-01-15T10:55:00.000Z",
      "completed": true,
      "status": "completed",
      "reflection": {
        "summary": "DB 연결 재설정 완료, env 분리 진행 중",
        "blockers": "환경변수 설정에서 약간의 어려움",
        "insights": "Docker 환경에서 env 파일 로딩 방식이 다름을 알게 됨",
        "nextGoal": "테스트 코드 작성 및 API 문서화"
      },
      "created_at": "2024-01-15T10:30:00.000Z",
      "updated_at": "2024-01-15T10:55:00.000Z"
    }
  ]
}
\`\`\`

### 5. GET /session/statistics - 세션 통계 조회
사용자의 세션 통계를 조회합니다.

**Query Parameters:**
- `tz`: 타임존 (예: "Asia/Seoul")
- `period`: 통계 기간 ("daily", "weekly", "monthly")
- `date`: 기준 날짜 (YYYY-MM-DD)

**Response:**
\`\`\`json
{
  "statistics": {
    "period": "daily",
    "date": "2024-01-15",
    "totalSessions": 3,
    "completedSessions": 2,
    "totalFocusTime": 50,
    "averageSessionDuration": 25,
    "completionRate": 66.7,
    "topTags": [
      {"tag": "#backend", "count": 2},
      {"tag": "#jwt", "count": 1}
    ]
  }
}
\`\`\`

## Database Schema

### sessions 테이블
\`\`\`sql
CREATE TABLE sessions (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  goal TEXT NOT NULL,
  duration INTEGER NOT NULL, -- 분 단위
  break_duration INTEGER NOT NULL, -- 분 단위
  tags JSON, -- 태그 배열
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NULL,
  completed BOOLEAN DEFAULT FALSE,
  status ENUM('created', 'started', 'paused', 'resumed', 'cancelled', 'completed') DEFAULT 'created',
  reflection JSON NULL, -- 회고 데이터
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_date (user_id, start_time),
  INDEX idx_status (status),
  INDEX idx_completed (completed)
);
\`\`\`

### session_events 테이블 (선택사항 - 상세 추적용)
\`\`\`sql
CREATE TABLE session_events (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(36) NOT NULL,
  event_type ENUM('created', 'started', 'paused', 'resumed', 'cancelled', 'completed') NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  metadata JSON NULL, -- 추가 이벤트 데이터
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  INDEX idx_session_time (session_id, timestamp)
);
\`\`\`

## 프론트엔드 연동 시점

### 1. 세션 생성 시점
- 사용자가 "세션 시작" 버튼을 클릭할 때
- `POST /session` 호출

### 2. 세션 시작 시점
- 타이머 시작 버튼을 클릭할 때
- `PUT /session/{id}/status` 호출 (status: "started")

### 3. 일시정지 시점
- 일시정지 버튼을 클릭할 때
- `PUT /session/{id}/status` 호출 (status: "paused")

### 4. 재시작 시점
- 일시정지 후 다시 시작 버튼을 클릭할 때
- `PUT /session/{id}/status` 호출 (status: "resumed")

### 5. 취소 시점
- X 버튼을 클릭하여 세션을 취소할 때
- `PUT /session/{id}/status` 호출 (status: "cancelled")

### 6. 리셋 시점
- 리셋 버튼을 클릭할 때
- 상태 변경 없이 프론트엔드에서만 처리

### 7. 세션 완료 및 회고 제출 시점
- 타이머가 끝나고 회고를 작성하여 제출할 때
- `PUT /session/{id}` 호출 (completed: true, reflection 포함)

## 에러 처리

### 공통 에러 응답
\`\`\`json
{
  "success": false,
  "error": {
    "code": "SESSION_NOT_FOUND",
    "message": "세션을 찾을 수 없습니다.",
    "details": {}
  }
}
\`\`\`

### 주요 에러 코드
- `SESSION_NOT_FOUND`: 세션을 찾을 수 없음
- `INVALID_SESSION_STATUS`: 잘못된 세션 상태 변경
- `SESSION_ALREADY_COMPLETED`: 이미 완료된 세션
- `UNAUTHORIZED`: 권한 없음
- `VALIDATION_ERROR`: 입력 데이터 검증 실패

## 보안 고려사항

1. **인증**: 모든 API는 사용자 인증이 필요
2. **권한**: 사용자는 자신의 세션만 조회/수정 가능
3. **입력 검증**: 모든 입력 데이터에 대한 검증 필요
4. **Rate Limiting**: API 호출 빈도 제한
5. **데이터 무결성**: 세션 상태 변경 시 논리적 검증 필요

## 성능 고려사항

1. **인덱싱**: 사용자별, 날짜별 조회를 위한 적절한 인덱스
2. **캐싱**: 통계 데이터는 캐싱 고려
3. **페이지네이션**: 세션 목록 조회 시 페이지네이션 적용
4. **배치 처리**: 통계 계산은 배치 작업으로 처리 고려

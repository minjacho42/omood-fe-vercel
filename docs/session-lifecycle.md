# 포모도로 세션 라이프사이클 관리

## 개요
포모도로 세션의 전체 라이프사이클을 관리하고 백엔드와의 동기화를 통해 일관된 상태를 유지합니다.

## 세션 상태 정의

### 프론트엔드 상태
- `setup`: 세션 설정 단계 (초기 상태)
- `focus`: 집중 시간 진행 중
- `reflection`: 회고 작성 단계
- `break`: 휴식 시간 진행 중

### 백엔드 상태
- `created`: 세션 생성됨
- `started`: 세션 시작됨
- `paused`: 세션 일시정지됨
- `resumed`: 세션 재시작됨
- `cancelled`: 세션 취소됨
- `completed`: 세션 완료됨

## 라이프사이클 플로우

### 1. 세션 생성 및 시작
\`\`\`
사용자 액션: "세션 시작" 버튼 클릭
프론트엔드: setup → focus 상태 변경
백엔드 호출: POST /session (세션 생성)
백엔드 호출: PUT /session/{id}/status (status: "started")
\`\`\`

### 2. 타이머 제어
\`\`\`
일시정지:
사용자 액션: 일시정지 버튼 클릭
프론트엔드: isRunning = false
백엔드 호출: PUT /session/{id}/status (status: "paused")

재시작:
사용자 액션: 시작 버튼 클릭
프론트엔드: isRunning = true
백엔드 호출: PUT /session/{id}/status (status: "resumed")

리셋:
사용자 액션: 리셋 버튼 클릭
프론트엔드: 타이머 시간 초기화
백엔드 호출: 없음 (프론트엔드에서만 처리)
\`\`\`

### 3. 세션 취소
\`\`\`
사용자 액션: X 버튼 클릭
프론트엔드: setup 상태로 복귀
백엔드 호출: DELETE /session/{id}
\`\`\`

### 4. 세션 완료 및 회고
\`\`\`
타이머 완료:
프론트엔드: focus → reflection 상태 변경
백엔드 호출: PUT /session/{id}/status (status: "completed")

회고 제출:
사용자 액션: 회고 작성 후 제출
프론트엔드: reflection → break 상태 변경
백엔드 호출: PUT /session/{id} (reflection 데이터 포함)
\`\`\`

### 5. 휴식 완료
\`\`\`
휴식 타이머 완료:
프론트엔드: break → setup 상태 변경
세션 데이터: localStorage에 저장
\`\`\`

## 데이터 동기화

### 앱 시작 시
1. localStorage에서 세션 데이터 로드
2. 백엔드에서 미완료 세션 목록 조회
3. 회고가 작성되지 않은 완료된 세션이 있으면 알림 표시

### 세션 복구 로직
\`\`\`typescript
// 미완료 회고가 있는 세션 확인
const incompleteSessions = sessions.filter(session => 
  session.completed && !session.reflection
)

if (incompleteSessions.length > 0) {
  // 회고 작성 모달 표시
  showReflectionModal(incompleteSessions[0])
}
\`\`\`

## 에러 처리

### 네트워크 오류
- 백엔드 호출 실패 시 로컬 상태 유지
- 재연결 시 상태 동기화 시도

### 상태 불일치
- 백엔드 상태와 프론트엔드 상태가 다를 경우 백엔드 우선
- 사용자에게 상태 복구 알림

## API 호출 시점 상세

### POST /session
**호출 시점**: 세션 설정 완료 후 "세션 시작" 버튼 클릭
**데이터**: 세션 기본 정보 (subject, goal, duration, tags)

### PUT /session/{id}/status
**호출 시점**: 
- 타이머 시작: status = "started"
- 일시정지: status = "paused" 
- 재시작: status = "resumed"
- 완료: status = "completed"

### PUT /session/{id}
**호출 시점**: 회고 작성 완료 후 제출
**데이터**: reflection 객체 포함

### DELETE /session/{id}
**호출 시점**: X 버튼으로 세션 취소
**결과**: 세션 완전 삭제

### GET /session/list
**호출 시점**: 
- 앱 시작 시
- 세션 모드 진입 시
- 날짜 변경 시

## 상태 복구 시나리오

### 시나리오 1: 앱 재시작 후 진행 중인 세션 발견
\`\`\`
1. localStorage에서 currentSession 확인
2. 백엔드에서 해당 세션 상태 조회
3. 상태가 "started"면 타이머 복구
4. 상태가 "paused"면 일시정지 상태로 복구
\`\`\`

### 시나리오 2: 완료되었지만 회고 미작성 세션 발견
\`\`\`
1. 백엔드에서 completed=true, reflection=null 세션 조회
2. 회고 작성 알림 표시
3. 사용자가 회고 작성 시 PUT /session/{id} 호출
\`\`\`

### 시나리오 3: 네트워크 오류 후 복구
\`\`\`
1. 실패한 API 호출을 큐에 저장
2. 네트워크 복구 감지 시 큐의 API 순차 실행
3. 상태 동기화 완료 후 정상 동작 재개

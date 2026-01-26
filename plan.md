# Lecture Q&A Pulse - UX 개선 구현 계획

## 개요
Norman의 디자인 원칙(제약, 시그니파이어, 맵핑, 피드백, 표준화)을 기반으로 한 UX 개선 작업을 순차적으로 진행합니다.

---

## 제안 1: 입력 상태와 버튼 활성화 연동

### 대상 파일
- `src/components/RoomView.vue` (질문 제출)
- `src/components/RoomCreate.vue` (룸 생성)
- `src/components/RoomJoin.vue` (룸 참여)
- `src/components/QuestionList.vue` (답변 제출)

### 현재 상태
```javascript
// RoomView.vue:49-52
const submit = () => {
  if (!text.value.trim()) {
    return;  // 빈 입력 거부하지만 버튼은 항상 활성화
  }
  ...
}
```
```html
<!-- RoomView.vue:142 -->
<button class="primary" type="submit" :disabled="loading">
```

### 변경 내용
1. **computed 속성 추가**: 입력값이 있는지 확인하는 `canSubmit` 계산 속성 생성
2. **버튼 disabled 바인딩**: `:disabled="!canSubmit || loading"`
3. **비활성 스타일 추가**: `.primary:disabled` 스타일에 회색 배경 적용

### 구현 코드 예시
```javascript
// 추가할 computed
const canSubmit = computed(() => text.value.trim().length > 0);
```
```html
<!-- 변경할 버튼 -->
<button class="primary" type="submit" :disabled="!canSubmit || loading">
```
```css
/* 추가할 스타일 */
.primary:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  opacity: 0.6;
}
```

### 적용 대상
| 컴포넌트 | 입력 필드 | 버튼 |
|---------|----------|------|
| RoomView.vue | `text` (질문 내용) | 投稿する |
| RoomCreate.vue | `name` (강의명) | ルームを生成 |
| RoomJoin.vue | `code` (룸 코드) | 参加する |
| QuestionList.vue | `replyText[questionId]` (답변) | 返信 |

### 기대 효과
- 사용자가 입력 전에는 버튼이 비활성화되어 "글을 써야 제출 가능"함을 시각적으로 인지
- 불필요한 클릭과 혼란 방지

---

## 제안 2: 클릭 가능 영역 명확화 (프로필 버튼)

### 대상 파일
- `src/App.vue`

### 현재 상태
```html
<!-- App.vue:539-562 -->
<div class="account-bar">
  <div class="account-left">
    <div class="account-avatar">...</div>  <!-- 클릭 불가 -->
    <div>
      <p class="account-name">...</p>  <!-- 클릭 불가 -->
    </div>
  </div>
  <div class="account-actions">
    <button class="ghost" @click="toggleProfile">プロフィール</button>  <!-- 이것만 클릭 가능 -->
  </div>
</div>
```

### 변경 내용
1. **클릭 영역 확장**: `account-left` 전체를 클릭 가능하게 변경
2. **화살표 아이콘 추가**: 프로필 버튼 옆에 펼침/접힘 화살표 표시
3. **호버 효과 추가**: `account-bar` 전체에 호버 시 배경색 변경

### 구현 코드 예시
```html
<!-- 변경: account-left를 클릭 가능하게 -->
<button class="account-left" @click="toggleProfile">
  ...
</button>
<div class="account-actions">
  <span class="profile-arrow" :class="{ open: profileOpen }">▼</span>
</div>
```
```css
/* 추가할 스타일 */
.account-left {
  cursor: pointer;
  background: transparent;
  border: none;
}
.account-bar:hover {
  background: rgba(37, 99, 235, 0.04);
}
.profile-arrow {
  transition: transform 0.2s ease;
}
.profile-arrow.open {
  transform: rotate(180deg);
}
```

### 기대 효과
- 아바타, 이름, 프로필 버튼 어디를 클릭해도 프로필 패널 토글
- 화살표 아이콘으로 "누르면 펼쳐진다"는 시그니파이어 제공

---

## 제안 3: 에러 메시지를 문제 지점 바로 아래에 표시

### 대상 파일
- `src/App.vue` (전역 에러 상태 관리)
- `src/components/RoomJoin.vue` (인라인 에러 표시)

### 현재 상태
```html
<!-- App.vue:613 - 우측 하단 토스트 -->
<div v-if="error" class="toast">{{ error }}</div>
```
```javascript
// App.vue:193-195 - 룸 참여 실패 시
if (!joined) {
  setError("ルームが見つかりませんでした。");  // 전역 토스트로 표시
  return;
}
```

### 변경 내용
1. **인라인 에러 상태 추가**: `joinError` ref를 RoomJoin에 전달
2. **에러 메시지 위치 변경**: 입력창 바로 아래에 빨간 텍스트로 표시
3. **시각적 효과 추가**: 에러 시 입력창 테두리 빨간색 + shake 애니메이션

### 구현 코드 예시
```html
<!-- RoomJoin.vue: 입력창 아래에 추가 -->
<input v-model="code" type="text" :class="{ 'input-error': props.error }" />
<p v-if="props.error" class="inline-error">{{ props.error }}</p>
```
```css
/* 추가할 스타일 */
.input-error {
  border-color: #ef4444 !important;
  animation: shake 0.3s ease;
}
.inline-error {
  color: #ef4444;
  font-size: 12px;
  margin-top: 6px;
}
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
}
```

### 적용 대상
| 컴포넌트 | 에러 상황 | 표시 위치 |
|---------|----------|----------|
| RoomJoin.vue | 룸 없음, TA키 불일치 | 코드 입력창 아래 |
| App.vue (프로필) | 이미지 크기 초과 | 아바타 선택 버튼 아래 |

### 기대 효과
- 에러 원인(입력값)과 결과(메시지)가 공간적으로 맵핑
- 사용자가 무엇을 수정해야 하는지 즉시 파악

---

## 제안 4: 일관성 있는 삭제 확인 모달

### 대상 파일
- `src/App.vue` (삭제 핸들러)
- `src/components/ConfirmModal.vue` (신규 생성)

### 현재 상태
```javascript
// App.vue:386-389
const handleDeleteQuestion = async (payload: { questionId: string }) => {
  if (!confirm("この質問を削除しますか？")) {  // 브라우저 기본 confirm
    return;
  }
  ...
}
```

### 변경 내용
1. **ConfirmModal 컴포넌트 생성**: 앱 스타일에 맞는 커스텀 모달
2. **모달 상태 관리**: `confirmModal` ref로 열림/닫힘, 메시지, 콜백 관리
3. **파괴적 액션 버튼**: 삭제 버튼은 빨간색으로 강조

### 신규 파일: `src/components/ConfirmModal.vue`
```vue
<template>
  <Teleport to="body">
    <div v-if="props.open" class="modal-overlay" @click.self="emit('cancel')">
      <div class="modal-content">
        <h3>{{ props.title }}</h3>
        <p>{{ props.message }}</p>
        <p class="warning">この操作は取り消せません。</p>
        <div class="modal-actions">
          <button class="ghost" @click="emit('cancel')">キャンセル</button>
          <button class="danger" @click="emit('confirm')">削除</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: grid;
  place-items: center;
  z-index: 1000;
}
.modal-content {
  background: white;
  padding: 24px;
  border-radius: 20px;
  max-width: 400px;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
}
.danger {
  background: #ef4444;
  color: white;
}
</style>
```

### 기대 효과
- 앱 전체 디자인 일관성 유지
- 빨간색 삭제 버튼으로 파괴적 액션임을 명확히 시그니파이어

---

## 제안 5: 리액션 버튼 활성화 상태 표시

### 대상 파일
- `src/components/QuestionList.vue`
- `src/App.vue` (사용자 리액션 상태 관리)
- `src/lib/data.ts` (API 확장 필요 시)

### 현재 상태
```html
<!-- QuestionList.vue:170-181 -->
<button class="reaction" @click="emit('react', ...)">
  いいね {{ question.reactions.like }}
</button>
```
- 버튼을 눌러도 시각적 변화 없음
- 내가 눌렀는지 여부 확인 불가

### 변경 내용
1. **사용자 리액션 상태 추적**: `userReactions` Map 추가 (questionId → Set<'like'|'thanks'>)
2. **활성 상태 스타일**: 내가 누른 버튼은 primary 색상으로 강조
3. **토글 기능**: 활성화된 버튼 다시 클릭 시 취소

### 구현 코드 예시
```html
<!-- QuestionList.vue -->
<button
  class="reaction"
  :class="{ active: isReacted(question.id, 'like') }"
  @click="emit('react', { questionId: question.id, type: 'like' })"
>
  いいね {{ question.reactions.like }}
</button>
```
```css
.reaction.active {
  background: var(--accent);
  color: white;
  border-color: var(--accent);
}
```

### 데이터 구조 변경
```typescript
// App.vue에 추가
const userReactions = ref<Record<string, { like: boolean; thanks: boolean }>>({});

// Question 타입에 추가 (선택적)
interface Question {
  ...
  userReacted?: { like: boolean; thanks: boolean };
}
```

### 기대 효과
- 내가 반응한 질문을 시각적으로 즉시 확인
- 토글 기능으로 실수로 누른 반응 취소 가능
- 활성 버튼이 지속적인 시그니파이어 역할

---

## 제안 6: 아코디언 스타일 질문 목록

### 대상 파일
- `src/components/QuestionList.vue`

### 현재 상태
```html
<!-- QuestionList.vue:148-157 - 탭 방식 -->
<button class="tab" :class="{ active: isAnswersOpen(question.id) }" @click="toggleAnswers(question.id)">
  返信 {{ question.answers.length }}
</button>
```
- 답변 영역이 즉시 나타남 (애니메이션 없음)
- 펼침/접힘 아이콘 없음

### 변경 내용
1. **화살표 아이콘 추가**: 질문 카드 우측에 펼침(▶)/접힘(▼) 아이콘
2. **슬라이드 애니메이션**: `max-height` 트랜지션으로 부드러운 펼침
3. **클릭 영역 확장**: 질문 텍스트 클릭으로도 토글 가능

### 구현 코드 예시
```html
<!-- 펼침/접힘 아이콘 -->
<span class="toggle-icon" :class="{ open: isAnswersOpen(question.id) }">▶</span>

<!-- 답변 영역 래퍼 -->
<div class="answers-wrapper" :class="{ open: isAnswersOpen(question.id) }">
  <div class="answers-content">
    ...
  </div>
</div>
```
```css
.toggle-icon {
  transition: transform 0.3s ease;
}
.toggle-icon.open {
  transform: rotate(90deg);
}
.answers-wrapper {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease;
}
.answers-wrapper.open {
  max-height: 1000px;
}
```

### 기대 효과
- 클릭과 답변 영역 펼침이 부드러운 애니메이션으로 연결 (맵핑 강화)
- 화살표 아이콘이 명확한 시그니파이어
- UI가 더 동적이고 세련됨

---

## 제안 7: 룸 입장 버튼 명확화

### 대상 파일
- `src/components/RoomHistory.vue`

### 현재 상태
```html
<!-- RoomHistory.vue:35 -->
<span class="enter">開く</span>
```
- 텍스트만 있고 아이콘 없음
- 호버 효과는 있음 (transform, box-shadow)

### 변경 내용
1. **화살표 아이콘 추가**: "開く" 옆에 → 또는 ▶ 아이콘
2. **아이템 전체 호버 효과 강화**: 호버 시 배경색도 변경

### 구현 코드 예시
```html
<!-- RoomHistory.vue -->
<span class="enter">開く <span class="enter-icon">→</span></span>
```
```css
.enter-icon {
  display: inline-block;
  transition: transform 0.2s ease;
}
.room-item:hover .enter-icon {
  transform: translateX(4px);
}
.room-item:hover {
  background: rgba(37, 99, 235, 0.04);
}
```

### 기대 효과
- 화살표 아이콘이 "룸으로 이동"을 명확하게 시그니파이어
- 호버 시 화살표 이동으로 클릭 유도

---

## 제안 8: 룸 코드/URL 입력 시 실시간 피드백

### 대상 파일
- `src/components/RoomJoin.vue`

### 현재 상태
```javascript
// RoomJoin.vue:17-25
const parseCode = (input: string) => {
  try {
    const url = new URL(input);
    const param = url.searchParams.get("room");
    return param ? param.toUpperCase() : input.toUpperCase();
  } catch {
    return input.toUpperCase();
  }
};
```
- URL 파싱은 되지만 사용자에게 피드백 없음

### 변경 내용
1. **실시간 파싱 결과 표시**: computed로 파싱 결과 계산
2. **URL 감지 메시지**: "URLからルームコード検出: ABC123"
3. **유효성 시각화**: 유효한 코드 입력 시 입력창 테두리 초록색 + 체크 아이콘

### 구현 코드 예시
```javascript
// 추가할 computed
const parsedCode = computed(() => parseCode(code.value.trim()));
const isUrl = computed(() => {
  try {
    new URL(code.value.trim());
    return true;
  } catch {
    return false;
  }
});
const isValidCode = computed(() => parsedCode.value.length >= 4);
```
```html
<!-- 입력창 아래에 추가 -->
<p v-if="isUrl && parsedCode" class="parse-hint">
  URLからルームコード検出: <strong>{{ parsedCode }}</strong>
</p>
<span v-if="isValidCode" class="valid-icon">✓</span>
```
```css
input.valid {
  border-color: #10b981;
}
.parse-hint {
  color: var(--accent);
  font-size: 12px;
  margin-top: 6px;
}
.valid-icon {
  color: #10b981;
  margin-left: 8px;
}
```

### 기대 효과
- URL에서 코드가 추출되었음을 즉시 확인
- 유효한 입력에 대한 긍정적 피드백으로 사용자 불안감 감소

---

## 제안 9: 프로필 저장 버튼 활성화 조건

### 대상 파일
- `src/App.vue`

### 현재 상태
```html
<!-- App.vue:574 -->
<button class="primary" @click="handleProfileSave">保存</button>
```
- 항상 활성화
- 변경 없이도 클릭 가능

### 변경 내용
1. **변경 감지**: `hasProfileChanges` computed 추가
2. **조건부 활성화**: 변경 시에만 저장 버튼 활성화
3. **변경 시각화**: 닉네임 변경 시 입력창 테두리 주황색

### 구현 코드 예시
```javascript
// 추가할 computed
const hasProfileChanges = computed(() => {
  if (!currentUser.value) return false;
  return displayNameDraft.value.trim() !== currentUser.value.name;
});
```
```html
<!-- 변경 -->
<input
  v-model="displayNameDraft"
  type="text"
  :class="{ 'has-changes': hasProfileChanges }"
/>
<button
  class="primary"
  :disabled="!hasProfileChanges"
  @click="handleProfileSave"
>
  保存
</button>
```
```css
.has-changes {
  border-color: #f59e0b !important;
}
```

### 기대 효과
- 변경 사항 없을 때 불필요한 서버 통신 방지
- 주황색 테두리로 "저장되지 않은 변경"을 시각적으로 알림

---

## 제안 10: 질문 템플릿 적용 시 시각적 강조

### 대상 파일
- `src/components/RoomView.vue`

### 현재 상태
```javascript
// RoomView.vue:75-77
const applyTemplate = (value: string) => {
  text.value = value;  // 텍스트만 삽입, 피드백 없음
};
```

### 변경 내용
1. **입력창 강조 애니메이션**: 템플릿 적용 시 테두리 깜빡임
2. **자동 포커스**: textarea에 포커스 이동
3. **스크롤**: 입력창이 화면에 보이도록 스크롤

### 구현 코드 예시
```javascript
const textareaRef = ref<HTMLTextAreaElement | null>(null);
const templateApplied = ref(false);

const applyTemplate = (value: string) => {
  text.value = value;
  templateApplied.value = true;

  // 포커스 및 스크롤
  nextTick(() => {
    textareaRef.value?.focus();
    textareaRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  // 애니메이션 리셋
  setTimeout(() => {
    templateApplied.value = false;
  }, 600);
};
```
```html
<textarea
  ref="textareaRef"
  v-model="text"
  :class="{ 'template-applied': templateApplied }"
/>
```
```css
.template-applied {
  animation: highlight 0.6s ease;
}
@keyframes highlight {
  0%, 100% { border-color: rgba(31, 41, 55, 0.12); }
  50% { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); }
}
```

### 기대 효과
- 템플릿 적용이 입력창의 시각적 변화로 명확하게 맵핑
- 자동 포커스로 다음 행동(수정)을 자연스럽게 유도

---

## 제안 12: 익명 작성자 시각적 구분

### 대상 파일
- `src/components/QuestionList.vue`
- `src/components/RoomView.vue` (폼 내 미리보기)

### 현재 상태
```html
<!-- QuestionList.vue:144 -->
<span v-if="question.anonymous" class="author">匿名</span>
```
- "匿名" 텍스트만 표시
- 일반 사용자와 시각적 구분 약함

### 변경 내용
1. **익명 전용 아바타**: 물음표 아이콘 또는 실루엣 이미지
2. **익명 토글 미리보기**: 폼에서 익명 체크 시 아바타 미리보기 변경
3. **익명 배지 스타일**: 회색 배경의 "匿名" 배지

### 구현 코드 예시
```html
<!-- QuestionList.vue: 익명일 때 -->
<div v-if="question.anonymous" class="avatar-frame anonymous">
  <div class="avatar-inner">
    <span class="anonymous-icon">?</span>
  </div>
</div>
<span class="author anonymous-badge">匿名</span>
```
```css
.avatar-frame.anonymous {
  background: #e5e7eb;
}
.anonymous-icon {
  font-size: 14px;
  font-weight: 700;
  color: #6b7280;
}
.anonymous-badge {
  background: #f3f4f6;
  padding: 2px 8px;
  border-radius: 999px;
  color: #6b7280;
}
```

### RoomView.vue 폼 미리보기
```html
<!-- 익명 체크박스 옆에 미리보기 -->
<label class="checkbox">
  <input v-model="anonymous" type="checkbox" />
  <span class="checkbox-text">匿名で投稿する</span>
  <span v-if="anonymous" class="preview-anonymous">? 匿名</span>
</label>
```

### 기대 효과
- 익명 질문/답변이 시각적으로 명확하게 구분
- 익명 토글 시 즉각적인 피드백으로 선택 확인

---

## 구현 순서 및 의존성

```
제안 1 (버튼 활성화) ──┐
                      │
제안 3 (인라인 에러)  ──┼── 독립적 구현 가능
                      │
제안 9 (프로필 저장)  ──┘

제안 2 (클릭 영역)   ────── 독립적 구현 가능

제안 4 (삭제 모달)   ────── ConfirmModal 컴포넌트 먼저 생성

제안 5 (리액션)      ────── API/데이터 구조 확인 필요

제안 6 (아코디언)    ────── 독립적 구현 가능

제안 7 (룸 입장)     ────── 독립적 구현 가능

제안 8 (URL 피드백)  ────── 독립적 구현 가능

제안 10 (템플릿)     ────── 독립적 구현 가능

제안 12 (익명 구분)  ────── 독립적 구현 가능
```

---

## 파일별 변경 요약

| 파일 | 변경 제안 |
|-----|----------|
| `src/App.vue` | 1, 2, 3, 4, 9 |
| `src/components/RoomView.vue` | 1, 10, 12 |
| `src/components/RoomCreate.vue` | 1 |
| `src/components/RoomJoin.vue` | 1, 3, 8 |
| `src/components/RoomHistory.vue` | 7 |
| `src/components/QuestionList.vue` | 1, 5, 6, 12 |
| `src/components/ConfirmModal.vue` | 4 (신규) |

---

## 테스트 체크리스트

### 제안 1
- [ ] 빈 입력 시 버튼 비활성화 확인
- [ ] 한 글자 입력 시 버튼 활성화 확인
- [ ] 공백만 입력 시 버튼 비활성화 유지

### 제안 2
- [ ] 아바타 클릭으로 프로필 토글
- [ ] 이름 클릭으로 프로필 토글
- [ ] 화살표 회전 애니메이션

### 제안 3
- [ ] 잘못된 룸 코드 입력 시 인라인 에러 표시
- [ ] 입력창 빨간 테두리 + shake 애니메이션
- [ ] 에러 후 재입력 시 에러 메시지 사라짐

### 제안 4
- [ ] 삭제 버튼 클릭 시 커스텀 모달 표시
- [ ] 취소 버튼으로 모달 닫힘
- [ ] 삭제 버튼 빨간색 확인

### 제안 5
- [ ] 리액션 버튼 클릭 시 활성 상태 변경
- [ ] 다시 클릭 시 비활성 상태로 복귀
- [ ] 페이지 새로고침 후 상태 유지

### 제안 6
- [ ] 답변 영역 슬라이드 애니메이션
- [ ] 화살표 아이콘 회전
- [ ] 질문 텍스트 클릭으로 토글

### 제안 7
- [ ] 화살표 아이콘 표시
- [ ] 호버 시 화살표 이동 애니메이션
- [ ] 아이템 전체 호버 효과

### 제안 8
- [ ] URL 입력 시 파싱 결과 표시
- [ ] 유효한 코드 입력 시 체크 아이콘
- [ ] 입력창 테두리 색상 변경

### 제안 9
- [ ] 변경 없을 때 저장 버튼 비활성화
- [ ] 닉네임 변경 시 버튼 활성화
- [ ] 변경 시 입력창 테두리 주황색

### 제안 10
- [ ] 템플릿 클릭 시 입력창 강조 애니메이션
- [ ] 자동 포커스
- [ ] 스크롤 이동

### 제안 12
- [ ] 익명 질문에 물음표 아바타 표시
- [ ] 익명 배지 스타일 적용
- [ ] 폼에서 익명 토글 시 미리보기 변경

---

## 예상 작업량

| 제안 | 난이도 | 예상 변경 라인 |
|-----|-------|--------------|
| 1 | 쉬움 | ~50 lines |
| 2 | 쉬움 | ~40 lines |
| 3 | 중간 | ~80 lines |
| 4 | 중간 | ~120 lines (신규 컴포넌트) |
| 5 | 중간 | ~100 lines |
| 6 | 중간 | ~60 lines |
| 7 | 쉬움 | ~30 lines |
| 8 | 쉬움 | ~50 lines |
| 9 | 쉬움 | ~40 lines |
| 10 | 쉬움 | ~50 lines |
| 12 | 중간 | ~70 lines |

---

## 다음 단계

1. **제안 1**부터 순차적으로 구현 시작
2. 각 제안 완료 후 테스트 체크리스트 확인
3. 브라우저에서 실제 동작 테스트
4. 다음 제안으로 진행

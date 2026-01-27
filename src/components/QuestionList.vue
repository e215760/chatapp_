<script setup lang="ts">
import { ref } from "vue";
import type { Question, Reactions, Role } from "../types";

const props = defineProps<{
  role: Role;
  questions: Question[];
  currentUserId?: string;
  userAvatars?: Record<string, string>;
  userLevels?: Record<string, number>;
  currentUserLevel?: number;
  defaultAvatarUrl: string;
  userReactions?: {
    questions: Record<string, { like: boolean; thanks: boolean }>;
    answers: Record<string, { like: boolean; thanks: boolean }>;
  };
}>();

const emit = defineEmits<{
  (e: "resolve", payload: { questionId: string }): void;
  (e: "reopen", payload: { questionId: string }): void;
  (e: "react", payload: { questionId: string; type: keyof Reactions }): void;
  (e: "react-answer", payload: { answerId: string; type: keyof Reactions }): void;
  (e: "reply", payload: { questionId: string; text: string; anonymous?: boolean }): void;
  (e: "delete-question", payload: { questionId: string }): void;
  (e: "delete-answer", payload: { answerId: string }): void;
  (e: "update-question", payload: { questionId: string; text: string }): void;
  (e: "update-answer", payload: { answerId: string; text: string }): void;
}>();

const statusLabel = (status: string) => (status === "resolved" ? "回答済み" : "受付中");
const replyText = ref<Record<string, string>>({});
const replyAnonymous = ref<Record<string, boolean>>({});
const activeTab = ref<Record<string, "question" | "answers">>({});
const editingQuestionId = ref<string | null>(null);
const editingAnswerId = ref<string | null>(null);
const editQuestionText = ref<Record<string, string>>({});
const editAnswerText = ref<Record<string, string>>({});
const roleLabel = (role: Role) => {
  if (role === "teacher") return "教員";
  return "学生";
};
const canDeleteQuestion = (question: Question) =>
  (props.role === "student" && question.ownerId === props.currentUserId) ||
  props.role === "teacher";
const canEditQuestion = (question: Question) => canDeleteQuestion(question);
const canDeleteAnswer = (answer: Question["answers"][number]) =>
  (props.role === "student" && answer.ownerId === props.currentUserId) ||
  props.role === "teacher";
const canEditAnswer = (answer: Question["answers"][number]) => canDeleteAnswer(answer);
const avatarForQuestion = (question: Question) =>
  question.ownerId ? props.userAvatars?.[question.ownerId] ?? props.defaultAvatarUrl : undefined;
const avatarForAnswer = (answer: Question["answers"][number]) =>
  answer.ownerId ? props.userAvatars?.[answer.ownerId] ?? props.defaultAvatarUrl : undefined;
const frameClassForOwner = (ownerId?: string) => {
  if (!ownerId) {
    return "";
  }
  const level =
    ownerId === props.currentUserId
      ? props.currentUserLevel ?? props.userLevels?.[ownerId] ?? 0
      : props.userLevels?.[ownerId] ?? 0;
  if (level >= 3) return "frame-3";
  if (level >= 2) return "frame-2";
  if (level >= 1) return "frame-1";
  return "";
};

const isQuestionReacted = (questionId: string, type: "like" | "thanks") =>
  props.userReactions?.questions[questionId]?.[type] ?? false;

const isAnswerReacted = (answerId: string, type: "like" | "thanks") =>
  props.userReactions?.answers[answerId]?.[type] ?? false;

const submitReply = (questionId: string) => {
  const text = replyText.value[questionId]?.trim();
  if (!text) {
    return;
  }
  emit("reply", { questionId, text, anonymous: replyAnonymous.value[questionId] });
  replyText.value[questionId] = "";
  replyAnonymous.value[questionId] = false;
};

const isAnswersOpen = (questionId: string) => activeTab.value[questionId] === "answers";
const toggleAnswers = (questionId: string) => {
  activeTab.value[questionId] = isAnswersOpen(questionId) ? "question" : "answers";
};

const startEditQuestion = (question: Question) => {
  editingQuestionId.value = question.id;
  editQuestionText.value[question.id] = question.text;
};

const cancelEditQuestion = () => {
  editingQuestionId.value = null;
};

const saveEditQuestion = (question: Question) => {
  const text = editQuestionText.value[question.id]?.trim();
  if (!text) {
    return;
  }
  emit("update-question", { questionId: question.id, text });
  editingQuestionId.value = null;
};

const startEditAnswer = (answer: Question["answers"][number]) => {
  editingAnswerId.value = answer.id;
  editAnswerText.value[answer.id] = answer.text;
};

const cancelEditAnswer = () => {
  editingAnswerId.value = null;
};

const saveEditAnswer = (answer: Question["answers"][number]) => {
  const text = editAnswerText.value[answer.id]?.trim();
  if (!text) {
    return;
  }
  emit("update-answer", { answerId: answer.id, text });
  editingAnswerId.value = null;
};
</script>

<template>
  <div class="list">
    <div
      v-for="(question, index) in questions"
      :key="question.id"
      class="item"
      :class="{ resolved: question.status === 'resolved' }"
      :style="{ animationDelay: `${index * 40}ms` }"
    >
      <div class="meta">
        <span class="badge" :class="question.status">{{ statusLabel(question.status) }}</span>
        <span class="time">{{ new Date(question.createdAt).toLocaleTimeString() }}</span>
      </div>
      <div class="author-block">
        <div class="author-info">
          <div
            v-if="!question.anonymous && avatarForQuestion(question)"
            class="avatar-frame"
            :class="frameClassForOwner(question.ownerId)"
          >
            <div class="avatar-inner">
              <img class="author-avatar" :src="avatarForQuestion(question)" alt="投稿者アイコン" />
            </div>
          </div>
          <span v-if="question.anonymous" class="author">匿名</span>
          <span v-else-if="question.author" class="author">{{ question.author }}</span>
          <span v-else class="author">名無し</span>
        </div>
        <div class="tabs">
          <button
            class="tab"
            :class="{ active: isAnswersOpen(question.id) }"
            type="button"
            @click="toggleAnswers(question.id)"
          >
            返信 {{ question.answers.length }}
          </button>
        </div>
      </div>
      <div v-if="editingQuestionId === question.id" class="edit-block">
        <textarea v-model="editQuestionText[question.id]" rows="3" />
        <div class="edit-actions">
          <button class="action" type="button" @click="saveEditQuestion(question)">保存</button>
          <button class="action ghost" type="button" @click="cancelEditQuestion">
            キャンセル
          </button>
        </div>
      </div>
      <p v-else class="text">{{ question.text }}</p>
      <div class="footer">
        <div class="reactions-group">
          <button
            class="reaction"
            :class="{ active: isQuestionReacted(question.id, 'like') }"
            @click="emit('react', { questionId: question.id, type: 'like' })"
          >
            いいね {{ question.reactions.like }}
          </button>
          <button
            class="reaction"
            :class="{ active: isQuestionReacted(question.id, 'thanks') }"
            @click="emit('react', { questionId: question.id, type: 'thanks' })"
          >
            参考になった {{ question.reactions.thanks }}
          </button>
        </div>
        <div
          v-if="canEditQuestion(question) || (role === 'student' && question.ownerId === props.currentUserId) || role === 'teacher'"
          class="owner-actions-group"
        >
          <template v-if="role === 'student' && question.ownerId === props.currentUserId">
            <button
              v-if="question.status === 'open'"
              class="action ghost"
              @click="emit('resolve', { questionId: question.id })"
            >
              納得
            </button>
            <button
              v-else
              class="action ghost"
              @click="emit('reopen', { questionId: question.id })"
            >
              納得を取り消す
            </button>
          </template>
          <button
            v-if="canEditQuestion(question)"
            class="action ghost"
            @click="startEditQuestion(question)"
          >
            編集
          </button>
          <button
            v-if="canDeleteQuestion(question)"
            class="action danger"
            @click="emit('delete-question', { questionId: question.id })"
          >
            質問削除
          </button>
          <button
            v-if="role === 'teacher' && question.status === 'open'"
            class="action"
            @click="emit('resolve', { questionId: question.id })"
          >
            回答済み
          </button>
          <button
            v-if="role === 'teacher' && question.status === 'resolved'"
            class="action ghost"
            @click="emit('reopen', { questionId: question.id })"
          >
            再オープン
          </button>
        </div>
      </div>
      <div v-if="isAnswersOpen(question.id)">
        <div v-if="question.answers.length" class="answers">
          <div v-for="answer in question.answers" :key="answer.id" class="answer">
            <div class="answer-meta">
              <div
                v-if="answer.author !== '匿名' && avatarForAnswer(answer)"
                class="avatar-frame"
                :class="frameClassForOwner(answer.ownerId)"
              >
                <div class="avatar-inner">
                  <img
                    class="answer-avatar"
                    :src="avatarForAnswer(answer)"
                    alt="返信者アイコン"
                  />
                </div>
              </div>
              <span class="answer-author">{{ answer.author || "匿名" }}</span>
              <span class="answer-role">{{ roleLabel(answer.role) }}</span>
              <span class="time">{{ new Date(answer.createdAt).toLocaleTimeString() }}</span>
            </div>
            <div v-if="editingAnswerId === answer.id" class="edit-block">
              <textarea v-model="editAnswerText[answer.id]" rows="3" />
              <div class="edit-actions">
                <button class="action" type="button" @click="saveEditAnswer(answer)">
                  保存
                </button>
                <button class="action ghost" type="button" @click="cancelEditAnswer">
                  キャンセル
                </button>
              </div>
            </div>
            <p v-else class="answer-text">{{ answer.text }}</p>
            <div class="answer-actions">
              <div class="reactions-group">
                <button
                  class="reaction"
                  :class="{ active: isAnswerReacted(answer.id, 'like') }"
                  @click="emit('react-answer', { answerId: answer.id, type: 'like' })"
                >
                  いいね {{ answer.reactions.like }}
                </button>
                <button
                  class="reaction"
                  :class="{ active: isAnswerReacted(answer.id, 'thanks') }"
                  @click="emit('react-answer', { answerId: answer.id, type: 'thanks' })"
                >
                  参考になった {{ answer.reactions.thanks }}
                </button>
              </div>
              <div v-if="canEditAnswer(answer)" class="owner-actions-group">
                <button
                  class="action ghost"
                  @click="startEditAnswer(answer)"
                >
                  編集
                </button>
                <button
                  v-if="canDeleteAnswer(answer)"
                  class="action danger"
                  @click="emit('delete-answer', { answerId: answer.id })"
                >
                  返信削除
                </button>
              </div>
            </div>
          </div>
        </div>
        <p v-else class="empty-answers">返信はまだありません。</p>
        <div class="reply">
          <input
            v-model="replyText[question.id]"
            type="text"
            placeholder="回答・返信を入力"
          />
          <button class="reply-btn" type="button" :disabled="!replyText[question.id]?.trim()" @click="submitReply(question.id)">
            返信
          </button>
        </div>
        <label class="reply-anon">
          <input v-model="replyAnonymous[question.id]" type="checkbox" />
          匿名で返信する
        </label>
      </div>
    </div>
    <p v-if="questions.length === 0" class="empty">まだ質問がありません。</p>
  </div>
</template>

<style scoped>
.list {
  display: grid;
  gap: 14px;
}

.item {
  padding: 16px 18px;
  border-radius: 18px;
  background: white;
  border: 1px solid rgba(31, 41, 55, 0.08);
  animation: rise 0.4s ease both;
}

.item.resolved {
  background: rgba(16, 185, 129, 0.08);
  border-color: rgba(16, 185, 129, 0.2);
}

.meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--ink-muted);
  margin-bottom: 8px;
}

.badge {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 600;
}

.badge.open {
  color: var(--accent-strong);
}

.badge.resolved {
  color: #059669;
}

.text {
  font-size: 15px;
  line-height: 1.6;
  color: var(--ink);
  margin-bottom: 12px;
}

.author-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;
}

.tabs {
  display: inline-flex;
  gap: 8px;
}

.tab {
  border: 1px solid rgba(31, 41, 55, 0.15);
  background: white;
  color: var(--ink);
  padding: 4px 12px;
  border-radius: 999px;
  cursor: pointer;
  font-size: 12px;
}

.tab.active {
  background: var(--ink);
  color: white;
  border-color: var(--ink);
}

.answers {
  display: grid;
  gap: 10px;
  margin-bottom: 12px;
}

.answer {
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.04);
  border: 1px solid rgba(31, 41, 55, 0.08);
}

.answer-meta {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 11px;
  color: var(--ink-muted);
  margin-bottom: 6px;
}

.avatar-frame {
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  background: transparent;
  border-radius: 50%;
  position: relative;
  overflow: visible;
}

.avatar-frame::after {
  content: "";
  position: absolute;
  inset: -10px;
  border-radius: 50%;
  pointer-events: none;
  background: transparent;
}

.avatar-frame.frame-1::after {
  background-image: url("/images/frame-level1.png");
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
}

.avatar-frame.frame-2::after {
  background-image: url("/images/frame-level2.png");
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
}

.avatar-frame.frame-3::after {
  background-image: url("/images/frame-level3.png");
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
}

.avatar-inner {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
  display: grid;
  place-items: center;
}

.answer-avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.answer-author {
  font-weight: 600;
  color: var(--ink);
}

.answer-role {
  padding: 2px 6px;
  border-radius: 999px;
  background: white;
  border: 1px solid rgba(31, 41, 55, 0.12);
}

.answer-text {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--ink);
}

.answer-actions {
  display: flex;
  gap: 12px;
  margin-top: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.reply {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.edit-block textarea {
  width: 100%;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(31, 41, 55, 0.12);
  font-size: 13px;
  background: white;
}

.edit-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.reply-anon {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--ink-muted);
  margin-bottom: 12px;
}

.reply input {
  flex: 1;
  padding: 8px 12px;
  border-radius: 12px;
  border: 1px solid rgba(31, 41, 55, 0.12);
  font-size: 13px;
  background: white;
}

.reply-btn {
  border: 1px solid rgba(31, 41, 55, 0.15);
  background: white;
  color: var(--ink);
  padding: 6px 12px;
  border-radius: 999px;
  cursor: pointer;
}

.reply-btn:disabled {
  background: #e5e7eb;
  color: #9ca3af;
  cursor: not-allowed;
}

.footer {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 12px;
  color: var(--ink-muted);
}

.reactions-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.owner-actions-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  padding-left: 12px;
  border-left: 1px solid rgba(31, 41, 55, 0.12);
}

.author-info {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.author-avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.reaction {
  border: 1px solid rgba(31, 41, 55, 0.15);
  background: white;
  color: var(--ink);
  padding: 6px 10px;
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.reaction:hover {
  background: rgba(37, 99, 235, 0.08);
}

.reaction.active {
  background: var(--accent);
  color: white;
  border-color: var(--accent);
  animation: bounce 0.3s ease;
}

@keyframes bounce {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.15); }
}

.action {
  border: none;
  background: var(--ink);
  color: white;
  padding: 6px 12px;
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action:hover {
  background: #374151;
  transform: translateY(-1px);
}

.action.ghost {
  background: transparent;
  color: var(--ink);
  border: 1px solid rgba(31, 41, 55, 0.2);
}

.action.ghost:hover {
  background: rgba(31, 41, 55, 0.08);
  border-color: rgba(31, 41, 55, 0.3);
}

.action.danger {
  background: #ef4444;
}

.action.danger:hover {
  background: #dc2626;
  transform: translateY(-1px);
}

.empty-answers {
  font-size: 12px;
  color: var(--ink-muted);
  margin: 4px 0 12px;
}

.empty {
  text-align: center;
  color: var(--ink-muted);
  padding: 24px 0;
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>

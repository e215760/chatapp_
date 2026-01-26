<script setup lang="ts">
import { computed, ref } from "vue";
import type { Profile, Question, Reactions, Room, Role } from "../types";
import QuestionList from "./QuestionList.vue";

const props = defineProps<{
  room: Room;
  role: Role;
  questions: Question[];
  profile: Profile;
  loading: boolean;
  currentUserId?: string;
  userAvatars: Record<string, string>;
  userLevels: Record<string, number>;
  currentUserLevel: number;
  defaultAvatarUrl: string;
}>();

const emit = defineEmits<{
  (e: "refresh"): void;
  (e: "exit"): void;
  (e: "submit", payload: { text: string; anonymous?: boolean }): void;
  (e: "resolve", payload: { questionId: string }): void;
  (e: "reopen", payload: { questionId: string }): void;
  (e: "react", payload: { questionId: string; type: keyof Reactions }): void;
  (e: "react-answer", payload: { answerId: string; type: keyof Reactions }): void;
  (e: "reply", payload: { questionId: string; text: string }): void;
  (e: "delete-question", payload: { questionId: string }): void;
  (e: "delete-answer", payload: { answerId: string }): void;
  (e: "update-question", payload: { questionId: string; text: string }): void;
  (e: "update-answer", payload: { answerId: string; text: string }): void;
}>();

const text = ref("");
const anonymous = ref(false);

const openCount = computed(
  () => props.questions.filter((question) => question.status === "open").length
);
const resolvedCount = computed(
  () => props.questions.filter((question) => question.status === "resolved").length
);
const roleLabel = computed(() => {
  if (props.role === "teacher") return "教員";
  return "学生";
});

const submit = () => {
  if (!text.value.trim()) {
    return;
  }
  emit("submit", {
    text: text.value.trim(),
    anonymous: anonymous.value,
  });
  text.value = "";
};

const templates = [
  {
    label: "式変形の確認",
    value: "どこで式変形を間違えたか分かりません。途中式を確認したいです。",
  },
  {
    label: "具体例を知りたい",
    value: "この概念の具体例が思い浮かびません。別の例を教えてください。",
  },
  {
    label: "流れがつながらない",
    value: "ここまでの流れがつながりません。要点を短くまとめてください。",
  },
];

const applyTemplate = (value: string) => {
  text.value = value;
};

</script>

<template>
  <section class="room">
    <div class="room-header">
      <div>
        <p class="eyebrow">Live Room</p>
        <h2>{{ room.name }}</h2>
        <p class="sub"></p>
        <p v-if="room.channel" class="sub">メモ: {{ room.channel }}</p>
      </div>
      <button class="ghost" @click="emit('exit')">退出</button>
    </div>
    <div class="stats">
      <div class="stat">
        <span class="label">質問数</span>
        <strong>{{ questions.length }}</strong>
      </div>
      <div class="stat">
        <span class="label">未解決</span>
        <strong>{{ openCount }}</strong>
      </div>
      <div class="stat">
        <span class="label">納得</span>
        <strong>{{ resolvedCount }}</strong>
      </div>
      <div class="stat role">
        <span class="label">あなたの役割</span>
        <strong>{{ roleLabel }}</strong>
      </div>
    </div>
    <div class="grid">
      <div class="panel">
        <div class="panel-header">
          <h3>質問を投稿</h3>
        </div>
        <form class="form" @submit.prevent="submit">
          <label>
            <span>質問内容</span>
            <textarea
              v-model="text"
              rows="3"
              placeholder="詰まっているポイントを具体的に書いてください"
            />
          </label>
          <div class="helper">
            <span>質問テンプレ</span>
            <div class="helper-buttons">
              <button
                v-for="item in templates"
                :key="item.label"
                type="button"
                class="helper-btn"
                @click="applyTemplate(item.value)"
              >
                {{ item.label }}
              </button>
            </div>
          </div>
          <label class="checkbox">
            <input v-model="anonymous" type="checkbox" />
            <span class="checkbox-text">匿名で投稿する (登録名は表示されません)</span>
          </label>
          <button class="primary" type="submit" :disabled="loading">
            投稿する
          </button>
        </form>
      </div>
    </div>
    <div class="panel list-panel">
      <div class="panel-header">
        <h3>質問一覧</h3>
        <p class="sub"></p>
      </div>
      <QuestionList
        :role="role"
        :questions="questions"
        :current-user-id="currentUserId"
        :user-avatars="userAvatars"
        :user-levels="userLevels"
        :default-avatar-url="defaultAvatarUrl"
        :current-user-level="currentUserLevel"
        @resolve="emit('resolve', $event)"
        @reopen="emit('reopen', $event)"
        @react="emit('react', $event)"
        @react-answer="emit('react-answer', $event)"
        @reply="emit('reply', $event)"
        @delete-question="emit('delete-question', $event)"
        @delete-answer="emit('delete-answer', $event)"
        @update-question="emit('update-question', $event)"
        @update-answer="emit('update-answer', $event)"
      />
    </div>
  </section>
</template>

<style scoped>
.room {
  display: grid;
  gap: 20px;
}

.room-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.room-header h2 {
  font-size: 30px;
  margin: 6px 0 4px;
}

.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}

.stat {
  padding: 14px 16px;
  border-radius: 16px;
  background: white;
  border: 1px solid rgba(31, 41, 55, 0.08);
}

.stat strong {
  display: block;
  font-size: 22px;
  margin-top: 4px;
}

.stat.role strong {
  font-size: 18px;
  letter-spacing: 0.08em;
}

.label {
  font-size: 12px;
  color: var(--ink-muted);
}

.grid {
  display: grid;
  gap: 18px;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}

.panel {
  padding: 20px;
  border-radius: 20px;
  background: var(--panel);
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: var(--shadow-soft);
}

.list-panel {
  background: white;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 12px;
}

.panel-header h3 {
  margin: 0;
}

.form {
  display: grid;
  gap: 12px;
}

label span {
  display: block;
  font-size: 12px;
  color: var(--ink-muted);
  margin-bottom: 6px;
}

textarea,
input {
  width: 100%;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(31, 41, 55, 0.12);
  font-size: 14px;
}

.primary {
  background: var(--accent);
  color: white;
  border: none;
  padding: 10px 14px;
  border-radius: 999px;
  font-weight: 600;
  cursor: pointer;
}

.primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.ghost {
  border: 1px solid rgba(31, 41, 55, 0.2);
  background: transparent;
  padding: 6px 12px;
  border-radius: 999px;
  cursor: pointer;
}

.checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--ink-muted);
}

.checkbox input {
  width: auto;
}

.checkbox-text {
  display: inline;
  white-space: nowrap;
  margin: 0;
}

.helper {
  display: grid;
  gap: 8px;
  font-size: 12px;
  color: var(--ink-muted);
}

.helper-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.helper-btn {
  border: 1px solid rgba(31, 41, 55, 0.2);
  background: white;
  padding: 6px 10px;
  border-radius: 999px;
  cursor: pointer;
  font-size: 12px;
}


.code {
  font-size: 12px;
  color: var(--ink-muted);
}

.sub {
  font-size: 12px;
  color: var(--ink-muted);
}
</style>

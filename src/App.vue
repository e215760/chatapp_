<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import type { Profile, Question, Role, Room, UserAccount } from "./types";
import { dataApi } from "./lib/data";
import AuthPanel from "./components/AuthPanel.vue";
import RoomCreate from "./components/RoomCreate.vue";
import RoomJoin from "./components/RoomJoin.vue";
import RoomHistory from "./components/RoomHistory.vue";
import RoomView from "./components/RoomView.vue";
import ConfirmModal from "./components/ConfirmModal.vue";

const currentUser = ref<UserAccount | null>(null);
const baseUrl = import.meta.env.BASE_URL;
const defaultAvatarUrl = `${baseUrl}images/default-avatar.png`;
const role = computed<Role>(() => currentUser.value?.role ?? "student");
const room = ref<Room | null>(null);
const questions = ref<Question[]>([]);
const joinedRooms = ref<Room[]>([]);
const profile = ref<Profile>({ xp: 0, level: 0, avatarStage: 0 });
const loading = ref(false);
const error = ref<string | null>(null);
const pendingJoinCode = ref<string | null>(null);
const joinError = ref<string | null>(null);
const userAvatars = ref<Record<string, string>>({});
const userLevels = ref<Record<string, number>>({});
const userReactions = ref<{
  questions: Record<string, { like: boolean; thanks: boolean }>;
  answers: Record<string, { like: boolean; thanks: boolean }>;
}>({ questions: {}, answers: {} });
const avatarInput = ref<HTMLInputElement | null>(null);
const profileOpen = ref(false);
const displayNameDraft = ref("");
const confirmModal = ref<{
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
}>({
  open: false,
  title: "",
  message: "",
  onConfirm: () => {},
});
const avatarUrlForCurrent = computed(
  () => currentUser.value?.avatarUrl ?? defaultAvatarUrl
);
const avatarFrameClass = computed(() => {
  if (!currentUser.value) {
    return "";
  }
  const level = profile.value.level ?? 0;
  if (level >= 3) return "frame-3";
  if (level >= 2) return "frame-2";
  if (level >= 1) return "frame-1";
  return "";
});

const setError = (message: string | null) => {
  error.value = message;
  if (message) {
    setTimeout(() => {
      if (error.value === message) {
        error.value = null;
      }
    }, 4000);
  }
};

const handleLogin = async (payload: { email: string; password: string }) => {
  loading.value = true;
  try {
    const user = await dataApi.loginUser(payload.email, payload.password);
    if (!user) {
      setError("ログインに失敗しました。入力内容を確認してください。");
      return;
    }
    currentUser.value = user;
    displayNameDraft.value = user.name;
    joinedRooms.value = await dataApi.listJoinedRooms();
    profile.value = await dataApi.getProfile();
    if (pendingJoinCode.value) {
      const code = pendingJoinCode.value;
      pendingJoinCode.value = null;
      await handleJoinRoom({ code });
    }
  } catch (err) {
    setError((err as Error).message);
  } finally {
    loading.value = false;
  }
};

const handleRegister = async (payload: {
  name: string;
  role: Role;
  email: string;
  password: string;
  avatarUrl?: string;
}) => {
  loading.value = true;
  try {
    currentUser.value = await dataApi.registerUser(
      payload.name,
      payload.role,
      payload.email,
      payload.password,
      payload.avatarUrl
    );
    displayNameDraft.value = currentUser.value.name;
    joinedRooms.value = await dataApi.listJoinedRooms();
    profile.value = await dataApi.getProfile();
  } catch (err) {
    setError((err as Error).message);
  } finally {
    loading.value = false;
  }
};

const handleLogout = async () => {
  await dataApi.logoutUser();
  currentUser.value = null;
  room.value = null;
  questions.value = [];
  joinedRooms.value = [];
  profileOpen.value = false;
};

const handleAvatarPick = () => {
  avatarInput.value?.click();
};

const handleAvatarChange = (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file) {
    return;
  }
  if (!file.type.startsWith("image/")) {
    setError("画像ファイルを選択してください。");
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    setError("2MB以下の画像を選択してください。");
    return;
  }
  const reader = new FileReader();
  reader.onload = async () => {
    const result = reader.result;
    if (typeof result !== "string") {
      setError("画像の読み込みに失敗しました。");
      return;
    }
    try {
      const updated = await dataApi.updateAvatar(result);
      currentUser.value = updated;
      displayNameDraft.value = updated.name;
      if (updated.avatarUrl) {
        userAvatars.value = { ...userAvatars.value, [updated.id]: updated.avatarUrl };
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };
  reader.readAsDataURL(file);
};

const toggleProfile = () => {
  profileOpen.value = !profileOpen.value;
  if (currentUser.value) {
    displayNameDraft.value = currentUser.value.name;
  }
};

const handleProfileSave = async () => {
  const trimmed = displayNameDraft.value.trim();
  if (!trimmed || !currentUser.value) {
    return;
  }
  try {
    const updated = await dataApi.updateDisplayName(trimmed);
    currentUser.value = updated;
    displayNameDraft.value = updated.name;
  } catch (err) {
    setError((err as Error).message);
  }
};

const handleCreateRoom = async (payload: { name: string; channel: string }) => {
  loading.value = true;
  try {
    room.value = await dataApi.createRoom(payload.name, payload.channel);
    joinedRooms.value = await dataApi.listJoinedRooms();
    await refreshQuestions();
  } catch (err) {
    setError((err as Error).message);
  } finally {
    loading.value = false;
  }
};

const handleJoinRoom = async (payload: { code: string }) => {
  loading.value = true;
  joinError.value = null;
  try {
    const joined = await dataApi.joinRoom(payload.code);
    if (!joined) {
      joinError.value = "ルームが見つかりませんでした。";
      return;
    }
    room.value = joined;
    joinedRooms.value = await dataApi.listJoinedRooms();
    await refreshQuestions();
  } catch (err) {
    joinError.value = (err as Error).message;
  } finally {
    loading.value = false;
  }
};

const refreshQuestions = async (options?: { silent?: boolean }) => {
  if (!room.value) {
    return;
  }
  if (!options?.silent) {
    loading.value = true;
  }
  try {
    questions.value = await dataApi.listQuestions(room.value.id);
    const ownerIds = new Set<string>();
    const questionIds: string[] = [];
    const answerIds: string[] = [];
    for (const question of questions.value) {
      questionIds.push(question.id);
      if (question.ownerId) {
        ownerIds.add(question.ownerId);
      }
      for (const answer of question.answers) {
        answerIds.push(answer.id);
        if (answer.ownerId) {
          ownerIds.add(answer.ownerId);
        }
      }
    }
    const ownerIdList = Array.from(ownerIds);
    const [avatars, levels] = await Promise.all([
      dataApi.listUserAvatars(ownerIdList),
      dataApi.listUserLevels(ownerIdList),
    ]);
    userAvatars.value = avatars;
    userLevels.value = levels;

    if (currentUser.value) {
      userReactions.value = await dataApi.listUserReactions(
        questionIds,
        answerIds,
        currentUser.value.id
      );
    }
  } catch (err) {
    setError((err as Error).message);
  } finally {
    if (!options?.silent) {
      loading.value = false;
    }
  }
};

const handleSubmitQuestion = async (payload: { text: string; anonymous?: boolean }) => {
  if (!room.value) {
    return;
  }
  loading.value = true;
  try {
    const isAnonymous = payload.anonymous === true;
    const author = isAnonymous ? "匿名" : currentUser.value?.name;
    await dataApi.createQuestion(
      room.value.id,
      payload.text,
      author,
      isAnonymous,
      currentUser.value?.id
    );
    if (role.value !== "teacher") {
      profile.value = await dataApi.addXp(1);
    }
    await refreshQuestions();
  } catch (err) {
    setError((err as Error).message);
  } finally {
    loading.value = false;
  }
};

const handleResolve = async (payload: { questionId: string }) => {
  loading.value = true;
  try {
    await dataApi.updateQuestionStatus(payload.questionId, "resolved");
    await refreshQuestions();
  } catch (err) {
    setError((err as Error).message);
  } finally {
    loading.value = false;
  }
};

const handleReopen = async (payload: { questionId: string }) => {
  loading.value = true;
  try {
    await dataApi.updateQuestionStatus(payload.questionId, "open");
    await refreshQuestions();
  } catch (err) {
    setError((err as Error).message);
  } finally {
    loading.value = false;
  }
};

const handleReact = async (payload: { questionId: string; type: "like" | "thanks" }) => {
  try {
    if (!currentUser.value) {
      setError("ログインが必要です。");
      return;
    }
    const updated = await dataApi.addQuestionReaction(
      payload.questionId,
      payload.type,
      currentUser.value.id
    );
    if (!updated) {
      await refreshQuestions({ silent: true });
      return;
    }
    questions.value = questions.value.map((question) =>
      question.id === updated.id ? { ...question, reactions: updated.reactions } : question
    );
    await refreshQuestions({ silent: true });
  } catch (err) {
    setError((err as Error).message);
  }
};

const handleAnswerReact = async (payload: { answerId: string; type: "like" | "thanks" }) => {
  try {
    if (!currentUser.value) {
      setError("ログインが必要です。");
      return;
    }
    const updated = await dataApi.addAnswerReaction(
      payload.answerId,
      payload.type,
      currentUser.value.id
    );
    if (!updated) {
      await refreshQuestions({ silent: true });
      return;
    }
    questions.value = questions.value.map((question) => ({
      ...question,
      answers: question.answers.map((answer) =>
        answer.id === updated.id ? { ...answer, reactions: updated.reactions } : answer
      ),
    }));
    await refreshQuestions({ silent: true });
  } catch (err) {
    setError((err as Error).message);
  }
};

const handleReply = async (payload: {
  questionId: string;
  text: string;
  anonymous?: boolean;
}) => {
  loading.value = true;
  try {
    const author = payload.anonymous ? "匿名" : currentUser.value?.name ?? "匿名";
    const roleValue = currentUser.value?.role ?? "student";
    const ownerId = currentUser.value?.id;
    const answer = await dataApi.createAnswer(
      payload.questionId,
      payload.text,
      author,
      roleValue,
      ownerId
    );
    if (currentUser.value) {
      profile.value = await dataApi.addXp(1);
    }
    if (currentUser.value?.avatarUrl && currentUser.value.id) {
      userAvatars.value = {
        ...userAvatars.value,
        [currentUser.value.id]: currentUser.value.avatarUrl,
      };
    }
    questions.value = questions.value.map((question) =>
      question.id === payload.questionId
        ? { ...question, answers: [...question.answers, answer] }
        : question
    );
  } catch (err) {
    setError((err as Error).message);
  } finally {
    loading.value = false;
  }
};

const handleDeleteQuestion = (payload: { questionId: string }) => {
  confirmModal.value = {
    open: true,
    title: "質問を削除",
    message: "この質問を削除しますか？",
    onConfirm: async () => {
      confirmModal.value.open = false;
      const target = questions.value.find((question) => question.id === payload.questionId);
      loading.value = true;
      try {
        await dataApi.deleteQuestion(payload.questionId);
        if (target && currentUser.value && target.ownerId === currentUser.value.id) {
          profile.value = await dataApi.addXp(-1);
        }
        await refreshQuestions();
      } catch (err) {
        setError((err as Error).message);
      } finally {
        loading.value = false;
      }
    },
  };
};

const handleDeleteAnswer = (payload: { answerId: string }) => {
  confirmModal.value = {
    open: true,
    title: "返信を削除",
    message: "この返信を削除しますか？",
    onConfirm: async () => {
      confirmModal.value.open = false;
      const target = questions.value
        .flatMap((question) => question.answers)
        .find((answer) => answer.id === payload.answerId);
      loading.value = true;
      try {
        await dataApi.deleteAnswer(payload.answerId);
        if (target && currentUser.value && target.ownerId === currentUser.value.id) {
          profile.value = await dataApi.addXp(-1);
        }
        await refreshQuestions();
      } catch (err) {
        setError((err as Error).message);
      } finally {
        loading.value = false;
      }
    },
  };
};

const handleUpdateQuestion = async (payload: { questionId: string; text: string }) => {
  loading.value = true;
  try {
    await dataApi.updateQuestionText(payload.questionId, payload.text);
    await refreshQuestions();
  } catch (err) {
    setError((err as Error).message);
  } finally {
    loading.value = false;
  }
};

const handleUpdateAnswer = async (payload: { answerId: string; text: string }) => {
  loading.value = true;
  try {
    await dataApi.updateAnswerText(payload.answerId, payload.text);
    await refreshQuestions();
  } catch (err) {
    setError((err as Error).message);
  } finally {
    loading.value = false;
  }
};

const exitRoom = () => {
  room.value = null;
  questions.value = [];
};

const handleOpenRoom = async (target: Room) => {
  room.value = target;
  await refreshQuestions();
};

onMounted(() => {
  dataApi.getCurrentUser().then((value) => {
    currentUser.value = value;
    if (value) {
      dataApi.listJoinedRooms().then((rooms) => {
        joinedRooms.value = rooms;
      });
      if (pendingJoinCode.value) {
        const code = pendingJoinCode.value;
        pendingJoinCode.value = null;
        handleJoinRoom({ code });
      }
    }
  });
  dataApi.getProfile().then((value) => {
    profile.value = value;
  });
  const params = new URLSearchParams(window.location.search);
  const code = params.get("room");
  if (code && currentUser.value) {
    handleJoinRoom({ code: code.toUpperCase() });
  } else if (code) {
    pendingJoinCode.value = code.toUpperCase();
  }
});

let refreshTimer: number | null = null;
const startPolling = () => {
  if (refreshTimer) {
    return;
  }
  refreshTimer = window.setInterval(() => {
    if (room.value) {
      refreshQuestions({ silent: true });
    }
  }, 5000);
};

const stopPolling = () => {
  if (refreshTimer) {
    window.clearInterval(refreshTimer);
    refreshTimer = null;
  }
};

watch(room, (value) => {
  if (value) {
    refreshQuestions();
    startPolling();
  } else {
    stopPolling();
  }
});

onUnmounted(() => {
  stopPolling();
});
</script>

<template>
  <div class="page">
    <header class="hero">
      <div>
        <p class="eyebrow">Lecture Interaction</p>
        <h1>Lecture Q&A Board</h1>
        <p class="lead">
          
        </p>
      </div>
    </header>

    <main>
      <section class="content">
        <AuthPanel
          v-if="!currentUser"
          :default-avatar-url="defaultAvatarUrl"
          @login="handleLogin"
          @register="handleRegister"
        />
        <div v-else class="account-bar" @click="toggleProfile">
          <div class="account-left">
            <div class="account-avatar" :class="avatarFrameClass">
              <div class="account-avatar-inner">
                <img :src="avatarUrlForCurrent" alt="アイコン" />
              </div>
            </div>
            <div>
              <p class="eyebrow">Signed in</p>
              <p class="account-name">
                {{ currentUser.name }} / {{ role === "teacher" ? "教員" : "学生" }}
              </p>
            </div>
          </div>
          <div class="account-actions">
            <input
              ref="avatarInput"
              class="sr-only"
              type="file"
              accept="image/*"
              @change="handleAvatarChange"
              @click.stop
            />
            <span class="profile-arrow" :class="{ open: profileOpen }">▼</span>
          </div>
        </div>
        <div v-if="currentUser && profileOpen" class="profile-panel">
          <div class="profile-header">
            <h3>プロフィール</h3>
          </div>
          <label class="profile-field">
            <span>ニックネーム</span>
            <input v-model="displayNameDraft" type="text" />
          </label>
          <div class="profile-actions">
            <button class="ghost" @click="handleAvatarPick">アイコンを設定</button>
            <button class="primary" @click="handleProfileSave">保存</button>
            <button class="ghost" @click="handleLogout">ログアウト</button>
          </div>
        </div>
        <RoomHistory
          v-if="currentUser && !room"
          :rooms="joinedRooms"
          @open="handleOpenRoom"
        />
        <RoomCreate v-if="currentUser && role === 'teacher' && !room" @create="handleCreateRoom" />
        <RoomJoin
          v-if="currentUser && !room"
          :error="joinError"
          @join="handleJoinRoom"
          @clear-error="joinError = null"
        />
        <RoomView
          v-if="currentUser && room"
          :room="room"
          :role="role"
          :questions="questions"
          :profile="profile"
          :loading="loading"
          :current-user-id="currentUser?.id"
          :user-avatars="userAvatars"
          :user-levels="userLevels"
          :default-avatar-url="defaultAvatarUrl"
          :current-user-level="profile.level"
          :user-reactions="userReactions"
          @refresh="refreshQuestions"
          @exit="exitRoom"
          @submit="handleSubmitQuestion"
          @resolve="handleResolve"
          @reopen="handleReopen"
          @react="handleReact"
          @react-answer="handleAnswerReact"
          @reply="handleReply"
          @delete-question="handleDeleteQuestion"
          @delete-answer="handleDeleteAnswer"
          @update-question="handleUpdateQuestion"
          @update-answer="handleUpdateAnswer"
        />
      </section>
    </main>

    <div v-if="error" class="toast">{{ error }}</div>

    <ConfirmModal
      :open="confirmModal.open"
      :title="confirmModal.title"
      :message="confirmModal.message"
      @confirm="confirmModal.onConfirm"
      @cancel="confirmModal.open = false"
    />
  </div>
</template>

<style>
:root {
  color-scheme: light;
  font-family: "Avenir Next", "Hiragino Kaku Gothic ProN", "Yu Gothic", "Meiryo",
    sans-serif;
  --ink: #111827;
  --ink-muted: rgba(17, 24, 39, 0.6);
  --accent: #2563eb;
  --accent-strong: #1d4ed8;
  --panel: rgba(255, 255, 255, 0.72);
  --shadow: 0 22px 60px rgba(15, 23, 42, 0.12);
  --shadow-soft: 0 16px 50px rgba(15, 23, 42, 0.08);
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: radial-gradient(circle at top, #e0f2fe 0%, transparent 55%),
    radial-gradient(circle at 20% 20%, rgba(59, 130, 246, 0.2), transparent 45%),
    linear-gradient(120deg, #fff7ed 0%, #f8fafc 50%, #eff6ff 100%);
  min-height: 100vh;
  color: var(--ink);
}

a {
  color: inherit;
}

.page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 48px 24px 64px;
  display: grid;
  gap: 32px;
  animation: fadeIn 0.6s ease;
}

.hero {
  display: grid;
  gap: 20px;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  align-items: end;
}

.hero h1 {
  font-size: clamp(32px, 4vw, 46px);
  margin: 6px 0 10px;
}

.lead {
  font-size: 16px;
  color: var(--ink-muted);
  max-width: 520px;
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.2em;
  font-size: 11px;
  color: var(--ink-muted);
}

.role-panel {
  display: grid;
  gap: 12px;
}

.role-toggle {
  display: inline-flex;
  background: white;
  padding: 6px;
  border-radius: 999px;
  box-shadow: var(--shadow-soft);
  border: 1px solid rgba(31, 41, 55, 0.08);
}

.role-toggle button {
  border: none;
  background: transparent;
  padding: 10px 20px;
  border-radius: 999px;
  cursor: pointer;
  font-weight: 600;
  color: var(--ink-muted);
}

.role-toggle button.active {
  background: var(--accent);
  color: white;
}

.role-note {
  color: var(--ink-muted);
  margin: 0;
}

.content {
  display: grid;
  gap: 24px;
  animation: rise 0.5s ease both;
}

.account-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-radius: 18px;
  background: white;
  border: 1px solid rgba(31, 41, 55, 0.08);
  box-shadow: var(--shadow-soft);
  cursor: pointer;
  transition: background 0.2s ease;
}

.account-bar:hover {
  background: rgba(37, 99, 235, 0.04);
}

.account-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.account-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.profile-arrow {
  font-size: 12px;
  color: var(--ink-muted);
  transition: transform 0.2s ease;
}

.profile-arrow.open {
  transform: rotate(180deg);
}

.profile-panel {
  margin-top: 16px;
  padding: 18px 20px;
  border-radius: 18px;
  background: white;
  border: 1px solid rgba(31, 41, 55, 0.08);
  box-shadow: var(--shadow-soft);
  display: grid;
  gap: 12px;
}

.profile-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.profile-header h3 {
  margin: 0;
}

.profile-field span {
  display: block;
  font-size: 12px;
  color: var(--ink-muted);
  margin-bottom: 6px;
}

.profile-field input {
  width: 100%;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(31, 41, 55, 0.12);
  font-size: 14px;
}

.profile-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.account-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(15, 23, 42, 0.08);
  display: grid;
  place-items: center;
  overflow: visible;
  border: 1px solid rgba(31, 41, 55, 0.12);
  box-sizing: border-box;
  position: relative;
}

.account-avatar-inner {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
  display: grid;
  place-items: center;
}

.account-avatar-inner img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.account-avatar-placeholder {
  font-weight: 700;
  color: rgba(31, 41, 55, 0.6);
}

.account-avatar.frame-1 {
  border: none;
  border-radius: 50%;
}

.account-avatar.frame-2 {
  border: none;
  border-radius: 50%;
}

.account-avatar.frame-3 {
  border: none;
  border-radius: 50%;
}

.account-avatar::after {
  content: "";
  position: absolute;
  inset: -24px;
  border-radius: 50%;
  pointer-events: none;
  background: transparent;
}

.account-avatar.frame-1::after {
  background-image: url("/images/frame-level1.png");
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
}

.account-avatar.frame-2::after {
  background-image: url("/images/frame-level2.png");
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
}

.account-avatar.frame-3::after {
  background-image: url("/images/frame-level3.png");
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
}

.account-name {
  margin: 4px 0 0;
  font-weight: 600;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}

.toast {
  position: fixed;
  right: 24px;
  bottom: 24px;
  background: #111827;
  color: white;
  padding: 10px 16px;
  border-radius: 999px;
  font-size: 13px;
  box-shadow: var(--shadow);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@media (max-width: 720px) {
  .page {
    padding: 32px 18px 48px;
  }
  .hero {
    grid-template-columns: 1fr;
  }
}
</style>

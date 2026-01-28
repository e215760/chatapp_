<script setup lang="ts">
import { ref, computed } from "vue";
import type { Role } from "../types";

const ALLOWED_DOMAIN = "@ie.u-ryukyu.ac.jp";

const props = defineProps<{
  defaultAvatarUrl: string;
}>();

const emit = defineEmits<{
  (e: "login", payload: { email: string; password: string }): void;
  (e: "register", payload: {
    name: string;
    role: Role;
    email: string;
    password: string;
    avatarUrl?: string;
  }): void;
}>();

const mode = ref<"login" | "register">("login");
const name = ref("");
const email = ref("");
const password = ref("");
const passwordConfirm = ref("");
const role = ref<Role>("student");
const avatarInput = ref<HTMLInputElement | null>(null);
const avatarUrl = ref<string | undefined>(undefined);
const touched = ref<Record<string, boolean>>({});

const markTouched = (field: string) => {
  touched.value[field] = true;
};

const emailError = computed(() => {
  if (!touched.value.email) return "";
  const trimmed = email.value.trim();
  if (!trimmed) return "メールアドレスを入力してください。";
  if (!trimmed.toLowerCase().endsWith(ALLOWED_DOMAIN)) {
    return `${ALLOWED_DOMAIN} のメールアドレスのみ登録できます。`;
  }
  return "";
});

const passwordError = computed(() => {
  if (!touched.value.password) return "";
  if (!password.value) return "パスワードを入力してください。";
  if (password.value.length < 8) return "パスワードは8文字以上で入力してください。";
  return "";
});

const passwordConfirmError = computed(() => {
  if (mode.value !== "register") return "";
  if (!touched.value.passwordConfirm) return "";
  if (!passwordConfirm.value) return "パスワード確認を入力してください。";
  if (password.value !== passwordConfirm.value) return "パスワードが一致しません。";
  return "";
});

const nameError = computed(() => {
  if (mode.value !== "register") return "";
  if (!touched.value.name) return "";
  if (!name.value.trim()) return "表示名を入力してください。";
  return "";
});

const isFormValid = computed(() => {
  const trimmedEmail = email.value.trim();
  const hasEmail = !!trimmedEmail;
  const hasValidDomain = trimmedEmail.toLowerCase().endsWith(ALLOWED_DOMAIN);
  const hasPassword = password.value.length >= 8;

  if (mode.value === "login") {
    return hasEmail && hasValidDomain && hasPassword;
  }
  const hasName = !!name.value.trim();
  const passwordsMatch = password.value === passwordConfirm.value && !!passwordConfirm.value;
  return hasName && hasEmail && hasValidDomain && hasPassword && passwordsMatch;
});

const pickAvatar = () => {
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
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result === "string") {
      avatarUrl.value = reader.result;
    }
  };
  reader.readAsDataURL(file);
};

const submit = () => {
  if (!isFormValid.value) return;

  const trimmedEmail = email.value.trim();
  const trimmedPassword = password.value.trim();
  if (mode.value === "login") {
    emit("login", { email: trimmedEmail, password: trimmedPassword });
  } else {
    const trimmedName = name.value.trim();
    emit("register", {
      name: trimmedName,
      role: role.value,
      email: trimmedEmail,
      password: trimmedPassword,
      avatarUrl: avatarUrl.value,
    });
  }
};
</script>

<template>
  <section class="card">
    <div class="card-header">
      <p class="eyebrow">Account</p>
      <h2>アカウント管理</h2>
      <p class="sub"></p>
    </div>
    <div class="mode-toggle">
      <button :class="{ active: mode === 'login' }" @click="mode = 'login'">ログイン</button>
      <button :class="{ active: mode === 'register' }" @click="mode = 'register'">
        新規登録
      </button>
    </div>
    <form class="form" @submit.prevent="submit">
      <div v-if="mode === 'register'" class="field">
        <label>
          <span>表示名</span>
          <input v-model="name" type="text" placeholder="例: Yuki" :class="{ 'input-error': nameError }" @blur="markTouched('name')" />
        </label>
        <p v-if="nameError" class="field-error">{{ nameError }}</p>
      </div>
      <div v-if="mode === 'register'" class="avatar-picker">
        <span class="label">アイコン設定</span>
        <div class="avatar-row">
          <img
            class="avatar-preview"
            :src="avatarUrl || props.defaultAvatarUrl"
            alt="アイコンプレビュー"
          />
          <div class="avatar-actions">
            <input
              ref="avatarInput"
              class="sr-only"
              type="file"
              accept="image/*"
              @change="handleAvatarChange"
            />
            <button class="ghost" type="button" @click="pickAvatar">画像を選ぶ</button>
            <p class="hint">未設定の場合はデフォルトアイコンになります</p>
          </div>
        </div>
      </div>
      <div class="field">
        <label>
          <span>メールアドレス</span>
          <input v-model="email" type="email" placeholder="example@ie.u-ryukyu.ac.jp" :class="{ 'input-error': emailError }" @blur="markTouched('email')" />
        </label>
        <p v-if="emailError" class="field-error">{{ emailError }}</p>
      </div>
      <label v-if="mode === 'register'">
        <span>役割</span>
        <select v-model="role">
          <option value="student">学生</option>
          <option value="teacher">教員</option>
        </select>
      </label>
      <div class="field">
        <label>
          <span>パスワード</span>
          <input v-model="password" type="password" placeholder="8文字以上" :class="{ 'input-error': passwordError }" @blur="markTouched('password')" />
        </label>
        <p v-if="passwordError" class="field-error">{{ passwordError }}</p>
      </div>
      <div v-if="mode === 'register'" class="field">
        <label>
          <span>パスワード確認</span>
          <input v-model="passwordConfirm" type="password" placeholder="もう一度入力" :class="{ 'input-error': passwordConfirmError }" @blur="markTouched('passwordConfirm')" />
        </label>
        <p v-if="passwordConfirmError" class="field-error">{{ passwordConfirmError }}</p>
      </div>
      <button class="primary" type="submit" :disabled="!isFormValid">
        {{ mode === "login" ? "ログイン" : "登録して続ける" }}
      </button>
    </form>
  </section>
</template>

<style scoped>
.card {
  padding: 28px;
  border-radius: 24px;
  background: var(--panel);
  box-shadow: var(--shadow);
  border: 1px solid rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(12px);
}

.card-header h2 {
  margin: 6px 0 8px;
  font-size: 24px;
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 12px;
  color: var(--ink-muted);
}

.sub {
  color: var(--ink-muted);
  margin-bottom: 20px;
}

.mode-toggle {
  display: inline-flex;
  background: white;
  padding: 6px;
  border-radius: 999px;
  box-shadow: var(--shadow-soft);
  border: 1px solid rgba(31, 41, 55, 0.08);
  margin-bottom: 16px;
}

.mode-toggle button {
  border: none;
  background: transparent;
  padding: 10px 18px;
  border-radius: 999px;
  cursor: pointer;
  font-weight: 600;
  color: var(--ink-muted);
}

.mode-toggle button.active {
  background: var(--accent);
  color: white;
}

.form {
  display: grid;
  gap: 16px;
}

.avatar-picker {
  display: grid;
  gap: 8px;
}

.avatar-row {
  display: flex;
  gap: 12px;
  align-items: center;
}

.avatar-preview {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid rgba(31, 41, 55, 0.12);
  background: white;
}

.avatar-actions {
  display: grid;
  gap: 6px;
}

label span {
  display: block;
  font-size: 13px;
  color: var(--ink-muted);
  margin-bottom: 6px;
}

input,
select {
  width: 100%;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid rgba(31, 41, 55, 0.12);
  font-size: 14px;
  background: white;
}

.primary {
  background: var(--accent);
  color: white;
  border: none;
  padding: 12px 16px;
  border-radius: 999px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.ghost {
  border: 1px solid rgba(31, 41, 55, 0.2);
  background: transparent;
  padding: 6px 12px;
  border-radius: 999px;
  cursor: pointer;
  width: fit-content;
}

.hint {
  font-size: 12px;
  color: var(--ink-muted);
  margin: 0;
}

.field {
  display: grid;
  gap: 0;
}

.field-error {
  margin: 4px 0 0;
  font-size: 12px;
  color: #dc2626;
}

.input-error {
  border-color: #dc2626 !important;
}

.primary:disabled {
  background: #9ca3af;
  opacity: 0.7;
  cursor: not-allowed;
}

.primary:hover:not(:disabled) {
  transform: translateY(-2px);
}
</style>

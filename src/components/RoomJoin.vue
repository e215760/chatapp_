<script setup lang="ts">
import { ref } from "vue";

defineProps<{
  error?: string | null;
}>();

const emit = defineEmits<{
  (e: "join", payload: { code: string }): void;
  (e: "clear-error"): void;
}>();

const code = ref("");

const handleInput = () => {
  emit("clear-error");
};
const parseCode = (input: string) => {
  try {
    const url = new URL(input);
    const param = url.searchParams.get("room");
    return param ? param.toUpperCase() : input.toUpperCase();
  } catch {
    return input.toUpperCase();
  }
};

const submit = () => {
  const value = parseCode(code.value.trim());
  if (!value) {
    return;
  }
  emit("join", { code: value });
};
</script>

<template>
  <section class="card">
    <div class="card-header">
      <p class="eyebrow">Student Entry</p>
      <h2>ルームに参加</h2>
      <p class="sub"></p>
    </div>
    <form class="form" @submit.prevent="submit">
      <label>
        <span>ルームコード</span>
        <input
          v-model="code"
          type="text"
          placeholder="例: X7K9Q2"
          :class="{ 'input-error': error }"
          @input="handleInput"
        />
        <p v-if="error" class="error-message">{{ error }}</p>
      </label>
      <button class="primary" type="submit" :disabled="!code.trim()">参加する</button>
      <p class="hint">
        教員が表示しているコードを入力してください。
      </p>
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

.form {
  display: grid;
  gap: 16px;
}

label span {
  display: block;
  font-size: 13px;
  color: var(--ink-muted);
  margin-bottom: 6px;
}

input {
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

.primary:hover:not(:disabled) {
  transform: translateY(-2px);
}

.primary:disabled {
  background: #9ca3af;
  opacity: 0.7;
  cursor: not-allowed;
}

.hint {
  margin-top: 4px;
  font-size: 12px;
  color: var(--ink-muted);
}

.input-error {
  border-color: #ef4444;
  background: #fef2f2;
}

.error-message {
  margin-top: 6px;
  font-size: 13px;
  color: #ef4444;
  display: flex;
  align-items: center;
  gap: 4px;
}

.error-message::before {
  content: "⚠";
}
</style>

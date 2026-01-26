<script setup lang="ts">
import { ref } from "vue";

const emit = defineEmits<{
  (e: "create", payload: { name: string; channel: string }): void;
}>();

const name = ref("");
const channel = ref("");
const submit = () => {
  if (!name.value.trim()) {
    return;
  }
  emit("create", {
    name: name.value.trim(),
    channel: channel.value.trim(),
  });
};
</script>

<template>
  <section class="card">
    <div class="card-header">
      <p class="eyebrow">Teacher Console</p>
      <h2>ルームを作成</h2>
      <p class="sub"></p>
    </div>
    <form class="form" @submit.prevent="submit">
      <label>
        <span>講義名</span>
        <input v-model="name" type="text" placeholder="例: データ構造入門" />
      </label>
      <label>
        <span>メモ (任意)</span>
        <input v-model="channel" type="text" placeholder="例: 水2 / 大教室" />
      </label>
      <button class="primary" type="submit">ルームを生成</button>
      <p class="hint"></p>
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

.primary:hover {
  transform: translateY(-2px);
}

.hint {
  margin-top: 4px;
  font-size: 12px;
  color: var(--ink-muted);
}
</style>

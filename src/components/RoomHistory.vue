<script setup lang="ts">
import type { Room } from "../types";

const props = defineProps<{
  rooms: Room[];
}>();

const emit = defineEmits<{
  (e: "open", payload: Room): void;
}>();
</script>

<template>
  <section class="card">
    <div class="card-header">
      <p class="eyebrow">History</p>
      <h2>参加済みルーム</h2>
      <p class="sub"></p>
    </div>
    <div v-if="props.rooms.length" class="room-list">
      <button
        v-for="item in props.rooms"
        :key="item.id"
        class="room-item"
        type="button"
        @click="emit('open', item)"
      >
        <div>
          <p class="room-name">{{ item.name }}</p>
          <p class="room-meta">
            Code: {{ item.code }}
            <span v-if="item.channel">/ {{ item.channel }}</span>
          </p>
        </div>
        <span class="enter">
          <span class="enter-icon">▶</span>
          開く
        </span>
      </button>
    </div>
    <div v-else class="empty">
      <p>まだ参加履歴がありません。ルームに参加するとここに表示されます。</p>
    </div>
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

.room-list {
  display: grid;
  gap: 12px;
}

.room-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  border-radius: 16px;
  border: 1px solid rgba(31, 41, 55, 0.1);
  background: white;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  text-align: left;
}

.room-item:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-soft);
  background: rgba(37, 99, 235, 0.04);
}

.room-name {
  margin: 0 0 4px;
  font-weight: 600;
}

.room-meta {
  margin: 0;
  font-size: 12px;
  color: var(--ink-muted);
}

.enter {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent);
  font-weight: 600;
}

.enter-icon {
  font-size: 10px;
  transition: transform 0.2s ease;
}

.room-item:hover .enter-icon {
  transform: translateX(3px);
}

.empty {
  padding: 14px 18px;
  border-radius: 16px;
  border: 1px dashed rgba(31, 41, 55, 0.2);
  color: var(--ink-muted);
  background: rgba(255, 255, 255, 0.6);
}
</style>

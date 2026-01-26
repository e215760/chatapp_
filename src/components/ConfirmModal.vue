<script setup lang="ts">
const props = defineProps<{
  open: boolean;
  title: string;
  message: string;
}>();

const emit = defineEmits<{
  (e: "confirm"): void;
  (e: "cancel"): void;
}>();
</script>

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
  animation: fadeIn 0.15s ease;
}

.modal-content {
  background: white;
  padding: 24px;
  border-radius: 20px;
  max-width: 400px;
  width: calc(100% - 48px);
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
  animation: scaleIn 0.15s ease;
}

.modal-content h3 {
  margin: 0 0 12px;
  font-size: 18px;
}

.modal-content p {
  margin: 0 0 8px;
  color: var(--ink-muted);
  font-size: 14px;
}

.warning {
  color: #ef4444 !important;
  font-size: 13px !important;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.ghost {
  background: transparent;
  border: 1px solid rgba(31, 41, 55, 0.2);
  padding: 10px 18px;
  border-radius: 999px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease;
}

.ghost:hover {
  background: rgba(31, 41, 55, 0.05);
}

.danger {
  background: #ef4444;
  color: white;
  border: none;
  padding: 10px 18px;
  border-radius: 999px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, background 0.2s ease;
}

.danger:hover {
  background: #dc2626;
  transform: translateY(-1px);
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>

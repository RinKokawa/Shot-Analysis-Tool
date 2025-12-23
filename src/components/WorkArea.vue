<template>
  <div class="work-area" :style="areaStyle">
    <button class="back-button" type="button" @click="emit('back')">返回</button>
    工作区域
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'

const emit = defineEmits<{
  (e: 'back'): void
}>()

const props = defineProps<{
  width: number
  height: number
  filePath?: string | null
}>()

const areaStyle = computed(() => ({
  width: `${props.width}px`,
  height: `${props.height}px`,
}))

const ensureAnalysisFile = async () => {
  if (!props.filePath || !window.ipcRenderer?.invoke) return
  await window.ipcRenderer.invoke('analysis:init', {
    videoPath: props.filePath,
  })
}

watch(
  () => props.filePath,
  () => {
    ensureAnalysisFile()
  },
  { immediate: true }
)
</script>

<style scoped>
.work-area {
  background: #f0f0f0;
  color: #1a1a1a;
  font-size: 14px;
  padding: 12px;
  box-sizing: border-box;
  border-left: 1px solid #d0d0d0;
  position: relative;
}

.back-button {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 6px 10px;
  border: 1px solid #c9c9c9;
  border-radius: 0;
  background: #ffffff;
  color: #1a1a1a;
  cursor: pointer;
}
</style>

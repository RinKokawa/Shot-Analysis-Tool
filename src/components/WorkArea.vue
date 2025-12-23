<template>
  <div class="work-area" :style="areaStyle">
    工作区域
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'

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
}
</style>

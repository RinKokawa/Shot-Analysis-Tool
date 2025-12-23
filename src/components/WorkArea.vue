<template>
  <div class="work-area" :style="areaStyle">
    <div class="work-header">
      <button class="back-button" type="button" @click="emit('back')">返回</button>
      <input
        v-model="cid"
        class="cid-input"
        type="text"
        placeholder="输入CID"
        @keydown.enter="saveCid"
        @blur="saveCid"
      />
      <button
        class="save-button"
        type="button"
        :disabled="isSaveDisabled"
        @click="saveCid"
      >
        保存
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const emit = defineEmits<{
  (e: 'back'): void
}>()

const props = defineProps<{
  width: number
  height: number
  filePath?: string | null
}>()

const cid = ref('')
const savedCid = ref('')

const areaStyle = computed(() => ({
  width: `${props.width}px`,
  height: `${props.height}px`,
}))

const isSaveDisabled = computed(() => cid.value.trim() === savedCid.value)

const ensureAnalysisFile = async () => {
  if (!props.filePath || !window.ipcRenderer?.invoke) return
  await window.ipcRenderer.invoke('analysis:init', {
    videoPath: props.filePath,
  })
}

const loadAnalysis = async () => {
  if (!props.filePath || !window.ipcRenderer?.invoke) return
  const result = await window.ipcRenderer.invoke('analysis:read', {
    videoPath: props.filePath,
  })
  if (result && typeof result === 'object' && typeof result.cid === 'string') {
    cid.value = result.cid
    savedCid.value = result.cid
  } else {
    cid.value = ''
    savedCid.value = ''
  }
}

const saveCid = async () => {
  if (!props.filePath || !window.ipcRenderer?.invoke) return
  const nextCid = cid.value.trim()
  if (nextCid === savedCid.value) return
  await window.ipcRenderer.invoke('analysis:update', {
    videoPath: props.filePath,
    patch: {
      cid: nextCid,
      updatedAt: Date.now(),
    },
  })
  savedCid.value = nextCid
}

watch(
  () => props.filePath,
  () => {
    ensureAnalysisFile()
    loadAnalysis()
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

.work-header {
  position: absolute;
  top: 8px;
  left: 8px;
  right: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.back-button {
  padding: 6px 10px;
  border: 1px solid #c9c9c9;
  border-radius: 0;
  background: #ffffff;
  color: #1a1a1a;
  cursor: pointer;
  flex: 0 0 auto;
}

.cid-input {
  height: 30px;
  padding: 0 8px;
  border: 1px solid #c9c9c9;
  border-radius: 0;
  background: #ffffff;
  color: #1a1a1a;
  flex: 1 1 auto;
  min-width: 0;
}

.save-button {
  padding: 6px 10px;
  border: 1px solid #c9c9c9;
  border-radius: 0;
  background: #ffffff;
  color: #1a1a1a;
  cursor: pointer;
  flex: 0 0 auto;
}

.save-button:disabled {
  color: #999999;
  border-color: #d9d9d9;
  cursor: not-allowed;
}
</style>

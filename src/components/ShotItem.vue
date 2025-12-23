<template>
  <div class="chart-shot-item" :class="{ 'chart-shot-active': isShotActive }">
    <div class="chart-shot-title">Shot {{ index + 1 }} · {{ formatShotTime(shot) }}</div>
    <div class="chart-meta chart-meta-small">
      <label class="chart-label">标题</label>
      <input
        v-model="editState.title"
        class="chart-input chart-input-small"
        type="text"
        @blur="commitTitle"
        @change="commitTitle"
        @keydown.enter.prevent="commitTitle"
        @keydown.ctrl.s.prevent="commitTitle"
      />
      <label class="chart-label">备注</label>
      <textarea
        v-model="editState.note"
        class="chart-textarea chart-textarea-small"
        rows="2"
        @blur="commitNote"
        @change="commitNote"
        @keydown.ctrl.s.prevent="commitNote"
      ></textarea>
    </div>
    <div class="chart-controls chart-controls-small">
      <label class="chart-label">起</label>
      <input
        v-model="editState.start"
        class="chart-input chart-input-small"
        type="text"
        inputmode="decimal"
        step="0.01"
        @blur="commitStart"
        @change="commitStart"
        @keydown.enter.prevent="commitStart"
        @keydown.ctrl.s.prevent="commitStart"
      />
      <button class="chart-button" type="button" @click="emitSetStart">取当前</button>
      <label class="chart-label">止</label>
      <input
        v-model="editState.end"
        class="chart-input chart-input-small"
        type="text"
        inputmode="decimal"
        step="0.01"
        @blur="commitEnd"
        @change="commitEnd"
        @keydown.enter.prevent="commitEnd"
        @keydown.ctrl.s.prevent="commitEnd"
      />
      <button class="chart-button" type="button" @click="emitSetEnd">取当前</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

type NormalizedRange = {
  start: number
  end: number | undefined
  createdAt: number
  title?: string
  note?: string
}

type UpdateActPayload = {
  createdAt: number
  start?: number | null
  end?: number | null
  title?: string | null
  note?: string | null
}

type EditState = { start: string; end: string; title: string; note: string }

const props = defineProps<{
  shot: NormalizedRange
  index: number
  currentTime: number
}>()

const emit = defineEmits<{
  (e: 'update-shot', payload: UpdateActPayload): void
  (e: 'set-shot-start', createdAt: number): void
  (e: 'set-shot-end', createdAt: number): void
}>()

const editState = ref<EditState>({ start: '', end: '', title: '', note: '' })

const formatNumber = (value: number) => value.toFixed(2)

const refreshEdit = () => {
  editState.value = {
    start: formatNumber(props.shot.start),
    end: props.shot.end === undefined ? '' : formatNumber(props.shot.end),
    title: props.shot.title ?? '',
    note: props.shot.note ?? '',
  }
}

watch(
  () => props.shot,
  () => refreshEdit(),
  { immediate: true }
)

const normalizeText = (value: string) => value.trim()

const parseTime = (input: string) => {
  const value = input.trim()
  if (!value) return null
  if (value.includes(':')) {
    const parts = value.split(':')
    if (parts.length != 2) return null
    const minutes = Number(parts[0])
    const seconds = Number(parts[1])
    if (Number.isNaN(minutes) || Number.isNaN(seconds)) return null
    return minutes * 60 + seconds
  }
  const numberValue = Number(value)
  if (Number.isNaN(numberValue)) return null
  return numberValue
}

const commitStart = () => {
  const parsed = parseTime(editState.value.start)
  if (parsed === null) return
  emit('update-shot', { createdAt: props.shot.createdAt, start: parsed })
}

const commitEnd = () => {
  const value = editState.value.end.trim()
  if (!value) {
    emit('update-shot', { createdAt: props.shot.createdAt, end: null })
    return
  }
  const parsed = parseTime(value)
  if (parsed === null) return
  emit('update-shot', { createdAt: props.shot.createdAt, end: parsed })
}

const commitTitle = () => {
  const title = normalizeText(editState.value.title)
  emit('update-shot', { createdAt: props.shot.createdAt, title: title ? title : null })
}

const commitNote = () => {
  const note = normalizeText(editState.value.note)
  emit('update-shot', { createdAt: props.shot.createdAt, note: note ? note : null })
}

const emitSetStart = () => emit('set-shot-start', props.shot.createdAt)
const emitSetEnd = () => emit('set-shot-end', props.shot.createdAt)

const isShotActive = computed(() => {
  const end = props.shot.end
  return props.currentTime >= props.shot.start && (end === undefined || props.currentTime < end)
})

const formatTime = (time: number) => {
  const totalSeconds = Math.max(0, Math.floor(time))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

const formatRange = (start: number, end?: number) => {
  if (end === undefined) return `${formatTime(start)} -`
  return `${formatTime(start)} - ${formatTime(end)}`
}

const formatShotTime = (shot: { start: number; end?: number }) => {
  if (shot.end === undefined) return formatTime(shot.start)
  return formatRange(shot.start, shot.end)
}
</script>

<style scoped>
.chart-shot-item {
  padding: 4px 6px;
  border: 1px solid #e0e0e0;
  background: #fafafa;
}

.chart-shot-active {
  border-color: #6bbf7d;
  background: #e6f7eb;
}

.chart-shot-title {
  margin-bottom: 4px;
}

.chart-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 6px 0 4px;
  flex-wrap: wrap;
}

.chart-meta-small {
  margin-top: 4px;
}

.chart-controls {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 6px 0 4px;
}

.chart-controls-small {
  margin: 4px 0 0;
  gap: 4px;
}

.chart-label {
  color: #666666;
}

.chart-input {
  width: 90px;
  height: 24px;
  padding: 0 6px;
  border: 1px solid #c9c9c9;
  border-radius: 0;
}

.chart-input-small {
  width: 72px;
}

.chart-textarea {
  width: 220px;
  min-height: 36px;
  padding: 4px 6px;
  border: 1px solid #c9c9c9;
  border-radius: 0;
  resize: vertical;
  font-size: 12px;
  font-family: inherit;
}

.chart-textarea-small {
  width: 160px;
  min-height: 30px;
}

.chart-button {
  padding: 4px 8px;
  border: 1px solid #c9c9c9;
  border-radius: 0;
  background: #ffffff;
  cursor: pointer;
}
</style>

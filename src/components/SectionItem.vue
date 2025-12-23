<template>
  <div class="chart-subsection" :class="{ 'chart-subsection-active': isSectionActive }">
    <div class="chart-subtitle">
      节{{ index + 1 }}
      <span class="chart-range">{{ formatRange(sectionGroup.section.start, sectionGroup.effectiveEnd) }}</span>
    </div>
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
    <div class="chart-shot-list">
      <ShotItem
        v-for="(shot, shotIndex) in sectionGroup.shots"
        :key="'shot-' + shot.createdAt + '-' + shotIndex"
        :shot="shot"
        :index="shotIndex"
        :current-time="currentTime"
        @update-shot="$emit('update-shot', $event)"
        @set-shot-start="$emit('set-shot-start', $event)"
        @set-shot-end="$emit('set-shot-end', $event)"
      />
      <div v-if="sectionGroup.shots.length === 0" class="chart-empty">暂无 Shot</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ShotItem from './ShotItem.vue'

type NormalizedRange = {
  start: number
  end: number | undefined
  createdAt: number
  title?: string
  note?: string
}

type SectionGroup = {
  section: NormalizedRange
  effectiveEnd: number | undefined
  shots: NormalizedRange[]
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
  sectionGroup: SectionGroup
  index: number
  currentTime: number
}>()

const emit = defineEmits<{
  (e: 'update-section', payload: UpdateActPayload): void
  (e: 'set-section-start', createdAt: number): void
  (e: 'set-section-end', createdAt: number): void
  (e: 'update-shot', payload: UpdateActPayload): void
  (e: 'set-shot-start', createdAt: number): void
  (e: 'set-shot-end', createdAt: number): void
}>()

const editState = ref<EditState>({ start: '', end: '', title: '', note: '' })

const formatNumber = (value: number) => value.toFixed(2)

const refreshEdit = () => {
  editState.value = {
    start: formatNumber(props.sectionGroup.section.start),
    end:
      props.sectionGroup.section.end === undefined
        ? ''
        : formatNumber(props.sectionGroup.section.end),
    title: props.sectionGroup.section.title ?? '',
    note: props.sectionGroup.section.note ?? '',
  }
}

watch(
  () => props.sectionGroup.section,
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
  const payload: UpdateActPayload = { createdAt: props.sectionGroup.section.createdAt, start: parsed }
  emit('update-section', payload)
}

const commitEnd = () => {
  const value = editState.value.end.trim()
  if (!value) {
    emit('update-section', { createdAt: props.sectionGroup.section.createdAt, end: null })
    return
  }
  const parsed = parseTime(value)
  if (parsed === null) return
  emit('update-section', { createdAt: props.sectionGroup.section.createdAt, end: parsed })
}

const commitTitle = () => {
  const title = normalizeText(editState.value.title)
  emit('update-section', {
    createdAt: props.sectionGroup.section.createdAt,
    title: title ? title : null,
  })
}

const commitNote = () => {
  const note = normalizeText(editState.value.note)
  emit('update-section', {
    createdAt: props.sectionGroup.section.createdAt,
    note: note ? note : null,
  })
}

const emitSetStart = () => emit('set-section-start', props.sectionGroup.section.createdAt)
const emitSetEnd = () => emit('set-section-end', props.sectionGroup.section.createdAt)

const isSectionActive = computed(() => {
  const start = props.sectionGroup.section.start
  const end = props.sectionGroup.effectiveEnd ?? props.sectionGroup.section.end
  return props.currentTime >= start && (end === undefined || props.currentTime < end)
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
</script>

<style scoped>
.chart-subsection {
  margin-top: 8px;
  padding-left: 12px;
}

.chart-subsection-active {
  background: #e6f3ff;
}

.chart-subtitle {
  font-size: 12px;
  color: #333333;
  display: flex;
  gap: 8px;
  align-items: center;
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

.chart-range {
  color: #666666;
  font-weight: 400;
}

.chart-shot-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}

.chart-empty {
  font-size: 12px;
  color: #999999;
  margin-top: 6px;
}
</style>

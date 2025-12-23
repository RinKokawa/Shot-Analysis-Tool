<template>
  <div class="chart-section">
    <div class="chart-title">
      幕 {{ index + 1 }}
      <span class="chart-range">{{ formatRange(act.start, act.end) }}</span>
      <button class="chart-delete" type="button" @click="emitDeleteAct(act.createdAt)">删除</button>
    </div>
    <div class="chart-controls">
      <label class="chart-label">起</label>
      <input
        v-model="editState.start"
        class="chart-input"
        type="text"
        inputmode="decimal"
        step="0.01"
        @blur="commitStart"
        @change="commitStart"
        @keydown.enter.prevent="commitStart"
        @keydown.ctrl.s.prevent="commitStart"
      />
      <button class="chart-button" type="button" @click="emitSetStart(act.createdAt)">T</button>
      <label class="chart-label">止</label>
      <input
        v-model="editState.end"
        class="chart-input"
        type="text"
        inputmode="decimal"
        step="0.01"
        @blur="commitEnd"
        @change="commitEnd"
        @keydown.enter.prevent="commitEnd"
        @keydown.ctrl.s.prevent="commitEnd"
      />
      <button class="chart-button" type="button" @click="emitSetEnd(act.createdAt)">T</button>
    </div>

    <div v-if="sections.length === 0" class="chart-empty">暂无节</div>
    <div
      v-for="(sectionGroup, sectionIndex) in sections"
      :key="'section-' + sectionGroup.section.createdAt + '-' + sectionIndex"
      class="chart-subsection"
    >
      <div class="chart-subtitle">
        节 {{ sectionIndex + 1 }}
        <span class="chart-range">{{ formatRange(sectionGroup.section.start, sectionGroup.section.end) }}</span>
      </div>
      <div class="chart-shot-list">
        <div
          v-for="(shot, shotIndex) in sectionGroup.shots"
          :key="'shot-' + shot.createdAt + '-' + shotIndex"
          class="chart-shot-item"
        >
          Shot {{ shotIndex + 1 }} · {{ formatShotTime(shot) }}
        </div>
        <div v-if="sectionGroup.shots.length === 0" class="chart-empty">暂无 Shot</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

type NormalizedRange = { start: number; end: number | undefined; createdAt: number }
type SectionGroup = { section: NormalizedRange; shots: NormalizedRange[] }
type UpdateActPayload = { createdAt: number; start?: number | null; end?: number | null }

const props = defineProps<{
  act: NormalizedRange
  index: number
  sections: SectionGroup[]
}>()

const emit = defineEmits<{
  (e: 'update-act', payload: UpdateActPayload): void
  (e: 'set-act-start', createdAt: number): void
  (e: 'set-act-end', createdAt: number): void
  (e: 'delete-act', createdAt: number): void
}>()

const editState = ref({ start: '', end: '' })

const formatNumber = (value: number) => value.toFixed(2)

const refreshEdit = () => {
  editState.value = {
    start: formatNumber(props.act.start),
    end: props.act.end === undefined ? '' : formatNumber(props.act.end),
  }
}

watch(
  () => props.act,
  () => refreshEdit(),
  { immediate: true }
)

const parseTime = (input: string) => {
  const value = input.trim()
  if (!value) return null
  if (value.includes(':')) {
    const parts = value.split(':')
    if (parts.length !== 2) return null
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
  emit('update-act', { createdAt: props.act.createdAt, start: parsed })
}

const commitEnd = () => {
  const value = editState.value.end.trim()
  if (!value) {
    emit('update-act', { createdAt: props.act.createdAt, end: null })
    return
  }
  const parsed = parseTime(value)
  if (parsed === null) return
  emit('update-act', { createdAt: props.act.createdAt, end: parsed })
}

const emitSetStart = (createdAt: number) => emit('set-act-start', createdAt)
const emitSetEnd = (createdAt: number) => emit('set-act-end', createdAt)
const emitDeleteAct = (createdAt: number) => emit('delete-act', createdAt)

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
.chart-title {
  font-size: 12px;
  color: #1a1a1a;
  font-weight: 600;
  display: flex;
  gap: 8px;
  align-items: center;
}

.chart-controls {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 6px 0 4px;
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

.chart-button,
.chart-delete {
  padding: 4px 8px;
  border: 1px solid #c9c9c9;
  border-radius: 0;
  background: #ffffff;
  cursor: pointer;
}

.chart-delete {
  margin-left: auto;
  color: #a40000;
}

.chart-subsection {
  margin-top: 8px;
  padding-left: 12px;
}

.chart-subtitle {
  font-size: 12px;
  color: #333333;
  display: flex;
  gap: 8px;
  align-items: center;
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

.chart-shot-item {
  padding: 4px 6px;
  border: 1px solid #e0e0e0;
  background: #fafafa;
}

.chart-empty {
  font-size: 12px;
  color: #999999;
  margin-top: 6px;
}
</style>

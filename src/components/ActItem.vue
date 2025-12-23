<template>
  <div class="chart-section" :class="{ 'chart-section-active': isActive }">
    <div class="chart-title">
      幕 {{ index + 1 }}
      <span class="chart-range">{{ formatRange(act.start, act.end) }}</span>
      <button class="chart-button" type="button" @click="emitPlayFromAct(act.start)">播放</button>
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
      <button class="chart-button" type="button" @click="emitSetStart(act.createdAt)">取当前</button>
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
      <button class="chart-button" type="button" @click="emitSetEnd(act.createdAt)">取当前</button>
    </div>

    <div v-if="sections.length === 0" class="chart-empty">暂无节</div>
    <div
      v-for="(sectionGroup, sectionIndex) in sections"
      :key="'section-' + sectionGroup.section.createdAt + '-' + sectionIndex"
      class="chart-subsection"
    >
      <div class="chart-subtitle">
        节 {{ sectionIndex + 1 }}
        <span class="chart-range">{{ formatRange(sectionGroup.section.start, sectionGroup.effectiveEnd) }}</span>
      </div>
      <div class="chart-controls chart-controls-small">
        <label class="chart-label">起</label>
        <input
          v-model="sectionEdit(sectionGroup.section).start"
          class="chart-input chart-input-small"
          type="text"
          inputmode="decimal"
          step="0.01"
          @blur="commitSectionStart(sectionGroup.section)"
          @change="commitSectionStart(sectionGroup.section)"
          @keydown.enter.prevent="commitSectionStart(sectionGroup.section)"
          @keydown.ctrl.s.prevent="commitSectionStart(sectionGroup.section)"
        />
        <button class="chart-button" type="button" @click="emitSetSectionStart(sectionGroup.section.createdAt)">取当前</button>
        <label class="chart-label">止</label>
        <input
          v-model="sectionEdit(sectionGroup.section).end"
          class="chart-input chart-input-small"
          type="text"
          inputmode="decimal"
          step="0.01"
          @blur="commitSectionEnd(sectionGroup.section)"
          @change="commitSectionEnd(sectionGroup.section)"
          @keydown.enter.prevent="commitSectionEnd(sectionGroup.section)"
          @keydown.ctrl.s.prevent="commitSectionEnd(sectionGroup.section)"
        />
        <button class="chart-button" type="button" @click="emitSetSectionEnd(sectionGroup.section.createdAt)">取当前</button>
      </div>
      <div class="chart-shot-list">
        <div
          v-for="(shot, shotIndex) in sectionGroup.shots"
          :key="'shot-' + shot.createdAt + '-' + shotIndex"
          class="chart-shot-item"
        >
          <div class="chart-shot-title">Shot {{ shotIndex + 1 }} · {{ formatShotTime(shot) }}</div>
          <div class="chart-controls chart-controls-small">
            <label class="chart-label">起</label>
            <input
              v-model="shotEdit(shot).start"
              class="chart-input chart-input-small"
              type="text"
              inputmode="decimal"
              step="0.01"
              @blur="commitShotStart(shot)"
              @change="commitShotStart(shot)"
              @keydown.enter.prevent="commitShotStart(shot)"
              @keydown.ctrl.s.prevent="commitShotStart(shot)"
            />
            <button class="chart-button" type="button" @click="emitSetShotStart(shot.createdAt)">取当前</button>
            <label class="chart-label">止</label>
            <input
              v-model="shotEdit(shot).end"
              class="chart-input chart-input-small"
              type="text"
              inputmode="decimal"
              step="0.01"
              @blur="commitShotEnd(shot)"
              @change="commitShotEnd(shot)"
              @keydown.enter.prevent="commitShotEnd(shot)"
              @keydown.ctrl.s.prevent="commitShotEnd(shot)"
            />
            <button class="chart-button" type="button" @click="emitSetShotEnd(shot.createdAt)">取当前</button>
          </div>
        </div>
        <div v-if="sectionGroup.shots.length === 0" class="chart-empty">暂无 Shot</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

type NormalizedRange = { start: number; end: number | undefined; createdAt: number }
type SectionGroup = {
  section: NormalizedRange
  effectiveEnd: number | undefined
  shots: NormalizedRange[]
}
type UpdateActPayload = { createdAt: number; start?: number | null; end?: number | null }
type EditState = { start: string; end: string }

const props = defineProps<{
  act: NormalizedRange
  index: number
  sections: SectionGroup[]
  currentTime: number
}>()

const emit = defineEmits<{
  (e: 'update-act', payload: UpdateActPayload): void
  (e: 'set-act-start', createdAt: number): void
  (e: 'set-act-end', createdAt: number): void
  (e: 'delete-act', createdAt: number): void
  (e: 'play-act', start: number): void
  (e: 'update-section', payload: UpdateActPayload): void
  (e: 'set-section-start', createdAt: number): void
  (e: 'set-section-end', createdAt: number): void
  (e: 'update-shot', payload: UpdateActPayload): void
  (e: 'set-shot-start', createdAt: number): void
  (e: 'set-shot-end', createdAt: number): void
}>()

const editState = ref<EditState>({ start: '', end: '' })
const sectionEditMap = ref<Record<string, EditState>>({})
const shotEditMap = ref<Record<string, EditState>>({})

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

const sectionEdit = (section: NormalizedRange): EditState => {
  const key = String(section.createdAt)
  if (!sectionEditMap.value[key]) {
    sectionEditMap.value[key] = {
      start: formatNumber(section.start),
      end: section.end === undefined ? '' : formatNumber(section.end),
    }
  }
  return sectionEditMap.value[key]
}

const shotEdit = (shot: NormalizedRange): EditState => {
  const key = String(shot.createdAt)
  if (!shotEditMap.value[key]) {
    shotEditMap.value[key] = {
      start: formatNumber(shot.start),
      end: shot.end === undefined ? '' : formatNumber(shot.end),
    }
  }
  return shotEditMap.value[key]
}

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

const commitSectionStart = (section: NormalizedRange) => {
  const parsed = parseTime(sectionEdit(section).start)
  if (parsed === null) return
  emit('update-section', { createdAt: section.createdAt, start: parsed })
}

const commitSectionEnd = (section: NormalizedRange) => {
  const value = sectionEdit(section).end.trim()
  if (!value) {
    emit('update-section', { createdAt: section.createdAt, end: null })
    return
  }
  const parsed = parseTime(value)
  if (parsed === null) return
  emit('update-section', { createdAt: section.createdAt, end: parsed })
}

const commitShotStart = (shot: NormalizedRange) => {
  const parsed = parseTime(shotEdit(shot).start)
  if (parsed === null) return
  emit('update-shot', { createdAt: shot.createdAt, start: parsed })
}

const commitShotEnd = (shot: NormalizedRange) => {
  const value = shotEdit(shot).end.trim()
  if (!value) {
    emit('update-shot', { createdAt: shot.createdAt, end: null })
    return
  }
  const parsed = parseTime(value)
  if (parsed === null) return
  emit('update-shot', { createdAt: shot.createdAt, end: parsed })
}

const emitSetStart = (createdAt: number) => emit('set-act-start', createdAt)
const emitSetEnd = (createdAt: number) => emit('set-act-end', createdAt)
const emitSetSectionStart = (createdAt: number) => emit('set-section-start', createdAt)
const emitSetSectionEnd = (createdAt: number) => emit('set-section-end', createdAt)
const emitSetShotStart = (createdAt: number) => emit('set-shot-start', createdAt)
const emitSetShotEnd = (createdAt: number) => emit('set-shot-end', createdAt)
const emitPlayFromAct = (start: number) => emit('play-act', start)

const isActive = computed(() => {
  const end = props.act.end
  return props.currentTime >= props.act.start && (end === undefined || props.currentTime < end)
})

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

.chart-shot-title {
  margin-bottom: 4px;
}

.chart-empty {
  font-size: 12px;
  color: #999999;
  margin-top: 6px;
}

.chart-section {
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.chart-section-active {
  background: #fff7e6;
  border-bottom-color: #f0d7a8;
}
</style>

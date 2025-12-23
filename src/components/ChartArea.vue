<template>
  <div class="chart-area">
    <ActItem
      v-for="(group, actIndex) in grouped.actGroups"
      :key="'act-' + group.act.createdAt + '-' + actIndex"
      :act="group.act"
      :index="actIndex"
      :sections="group.sections"
      @update-act="emit('update-act', $event)"
      @set-act-start="emit('set-act-start', $event)"
      @set-act-end="emit('set-act-end', $event)"
      @delete-act="emit('delete-act', $event)"
    />

    <div
      v-if="grouped.orphanSectionGroups.length > 0 || grouped.orphanShots.length > 0"
      class="chart-section"
    >
      <div class="chart-title">未归类幕</div>
      <div
        v-for="(sectionGroup, sectionIndex) in grouped.orphanSectionGroups"
        :key="'orphan-section-' + sectionGroup.section.createdAt + '-' + sectionIndex"
        class="chart-subsection"
      >
        <div class="chart-subtitle">
          节 {{ sectionIndex + 1 }}
          <span class="chart-range">{{ formatRange(sectionGroup.section.start, sectionGroup.section.end) }}</span>
        </div>
        <div class="chart-shot-list">
          <div
            v-for="(shot, shotIndex) in sectionGroup.shots"
            :key="'orphan-shot-' + shot.createdAt + '-' + shotIndex"
            class="chart-shot-item"
          >
            Shot {{ shotIndex + 1 }} · {{ formatShotTime(shot) }}
          </div>
          <div v-if="sectionGroup.shots.length === 0" class="chart-empty">暂无 Shot</div>
        </div>
      </div>

      <div v-if="grouped.orphanShots.length > 0" class="chart-subsection">
        <div class="chart-subtitle">未归类节</div>
        <div class="chart-shot-list">
          <div
            v-for="(shot, shotIndex) in grouped.orphanShots"
            :key="'orphan-only-shot-' + shot.createdAt + '-' + shotIndex"
            class="chart-shot-item"
          >
            Shot {{ shotIndex + 1 }} · {{ formatShotTime(shot) }}
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="grouped.actGroups.length === 0 && grouped.orphanSectionGroups.length === 0 && grouped.orphanShots.length === 0"
      class="chart-empty"
    >
      暂无记录
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ActItem from './ActItem.vue'

type RangeItem = { start?: number; end?: number; time?: number; createdAt: number }
type NormalizedRange = { start: number; end: number | undefined; createdAt: number }

type SectionGroup = { section: NormalizedRange; shots: NormalizedRange[] }
type ActGroup = { act: NormalizedRange; sections: SectionGroup[] }

type GroupedData = {
  actGroups: ActGroup[]
  orphanSectionGroups: SectionGroup[]
  orphanShots: NormalizedRange[]
}

type UpdateActPayload = { createdAt: number; start?: number | null; end?: number | null }

type Emits = {
  (e: 'update-act', payload: UpdateActPayload): void
  (e: 'set-act-start', createdAt: number): void
  (e: 'set-act-end', createdAt: number): void
  (e: 'delete-act', createdAt: number): void
}

const emit = defineEmits<Emits>()

const props = defineProps<{
  acts: RangeItem[]
  sections: RangeItem[]
  shots: RangeItem[]
}>()

const toNormalizedRange = (item: RangeItem): NormalizedRange | null => {
  const start =
    typeof item.start === 'number'
      ? item.start
      : typeof item.time === 'number'
        ? item.time
        : null
  if (start === null) return null
  const end = typeof item.end === 'number' ? item.end : undefined
  return { start, end, createdAt: item.createdAt }
}

const normalize = (items: RangeItem[]): NormalizedRange[] =>
  items
    .map(toNormalizedRange)
    .filter((item): item is NormalizedRange => item !== null)
    .sort((a, b) => a.start - b.start)

const inRange = (time: number, start: number, end?: number) =>
  time >= start && (end === undefined || time < end)

const grouped = computed<GroupedData>(() => {
  const acts = normalize(props.acts)
  const sections = normalize(props.sections)
  const shots = normalize(props.shots)

  const actGroups: ActGroup[] = acts.map((act) => {
    const actSections = sections.filter((section) => inRange(section.start, act.start, act.end))
    const sectionGroups: SectionGroup[] = actSections.map((section) => ({
      section,
      shots: shots.filter((shot) => inRange(shot.start, section.start, section.end)),
    }))
    return { act, sections: sectionGroups }
  })

  const orphanSectionGroups: SectionGroup[] = sections
    .filter((section) => !acts.some((act) => inRange(section.start, act.start, act.end)))
    .map((section) => ({
      section,
      shots: shots.filter((shot) => inRange(shot.start, section.start, section.end)),
    }))

  const orphanShots: NormalizedRange[] = shots.filter(
    (shot) => !sections.some((section) => inRange(shot.start, section.start, section.end))
  )

  return { actGroups, orphanSectionGroups, orphanShots }
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
.chart-area {
  flex: 1 1 auto;
  min-height: 120px;
  border-top: 1px solid #d0d0d0;
  background: #ffffff;
  color: #1a1a1a;
  font-size: 12px;
  padding: 8px 12px;
  box-sizing: border-box;
}

.chart-section {
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.chart-title {
  font-size: 12px;
  color: #1a1a1a;
  font-weight: 600;
  display: flex;
  gap: 8px;
  align-items: center;
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

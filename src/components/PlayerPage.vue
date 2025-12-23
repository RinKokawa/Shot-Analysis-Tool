<template>
  <div class="player-page">
    <div class="player-container" :style="containerStyle">
      <div class="video-area" :style="videoAreaStyle">
        <video
          ref="videoRef"
          class="player-video"
          :src="src"
          controls
          autoplay
          @loadedmetadata="onLoadedMetadata"
        ></video>
        <div class="resize-handle" @pointerdown="onResizeStart" />
      </div>
      <WorkArea
        :width="workWidth"
        :height="videoHeight"
        :file-path="filePath"
        @back="onWorkAreaBack"
        @create-act="onCreateAct"
        @create-section="onCreateSection"
        @create-shot="onCreateShot"
      />
    </div>
    <ChartArea
      :acts="acts"
      :sections="sections"
      :shots="shots"
      @update-act="onUpdateAct"
      @set-act-start="onSetActStart"
      @set-act-end="onSetActEnd"
      @delete-act="onDeleteAct"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import WorkArea from './WorkArea.vue'
import ChartArea from './ChartArea.vue'

const emit = defineEmits<{
  (e: 'back'): void
}>()

const props = defineProps<{ src: string; filePath?: string | null }>()

const videoRef = ref<HTMLVideoElement | null>(null)
const aspectRatio = ref(16 / 9)
const videoWidth = ref(640)
const videoHeight = ref(360)
type RangeItem = { start?: number; end?: number; time?: number; createdAt: number }

const acts = ref<RangeItem[]>([])
const sections = ref<RangeItem[]>([])
const shots = ref<RangeItem[]>([])

const minWidth = 240
const viewportWidth = ref(window.innerWidth)
const savedWidth = ref<number | null>(null)

const workWidth = computed(() => Math.max(0, viewportWidth.value - videoWidth.value))

const containerStyle = computed(() => ({
  width: `${videoWidth.value + workWidth.value}px`,
  height: `${videoHeight.value}px`,
}))

const videoAreaStyle = computed(() => ({
  width: `${videoWidth.value}px`,
  height: `${videoHeight.value}px`,
}))


const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable
}

const onKeyDown = (event: KeyboardEvent) => {
  if (event.code !== 'Space' || isEditableTarget(event.target)) return
  event.preventDefault()

  const video = videoRef.value
  if (!video) return

  if (video.paused) {
    video.play()
  } else {
    video.pause()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
  const maxVideoWidth = Math.max(minWidth, Math.min(960, viewportWidth.value))
  videoWidth.value = maxVideoWidth
  videoHeight.value = Math.round(maxVideoWidth / aspectRatio.value)
  window.addEventListener('resize', onResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('resize', onResize)
})

const onResize = () => {
  viewportWidth.value = window.innerWidth
  if (videoWidth.value > viewportWidth.value) {
    videoWidth.value = Math.max(minWidth, viewportWidth.value)
    videoHeight.value = Math.round(videoWidth.value / aspectRatio.value)
  }
}

const onLoadedMetadata = () => {
  const video = videoRef.value
  if (!video || !video.videoWidth || !video.videoHeight) return
  aspectRatio.value = video.videoWidth / video.videoHeight
  if (savedWidth.value) {
    applySavedSize()
  } else {
    videoHeight.value = Math.round(videoWidth.value / aspectRatio.value)
  }
}

const onResizeStart = (event: PointerEvent) => {
  event.preventDefault()
  const startX = event.clientX
  const startY = event.clientY
  const startWidth = videoWidth.value
  const startHeight = videoHeight.value

  const onMove = (moveEvent: PointerEvent) => {
    const dx = moveEvent.clientX - startX
    const dy = moveEvent.clientY - startY
    const adjustByX = dx
    const adjustByY = dy * aspectRatio.value
    const useX = Math.abs(adjustByX) >= Math.abs(adjustByY)
    const nextWidth = startWidth + (useX ? adjustByX : adjustByY)
    const maxVideoWidth = Math.max(minWidth, viewportWidth.value)
    const clampedWidth = Math.max(minWidth, Math.min(maxVideoWidth, Math.round(nextWidth)))
    videoWidth.value = clampedWidth
    videoHeight.value = Math.round(clampedWidth / aspectRatio.value)
  }

  const onUp = () => {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    saveSize()
  }

  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
}

const applySavedSize = () => {
  if (!savedWidth.value) return
  const maxVideoWidth = Math.max(minWidth, viewportWidth.value)
  const clampedWidth = Math.max(minWidth, Math.min(maxVideoWidth, savedWidth.value))
  videoWidth.value = clampedWidth
  videoHeight.value = Math.round(clampedWidth / aspectRatio.value)
}

const loadAnalysis = async () => {
  if (!props.filePath || !window.ipcRenderer?.invoke) return
  const result = await window.ipcRenderer.invoke('analysis:read', {
    videoPath: props.filePath,
  })
  if (result && typeof result === 'object' && typeof result.videoWidth === 'number') {
    savedWidth.value = result.videoWidth
    applySavedSize()
  }
  if (result && typeof result === 'object' && Array.isArray(result.acts)) {
    acts.value = result.acts as RangeItem[]
  } else {
    acts.value = []
  }
  if (result && typeof result === 'object' && Array.isArray(result.sections)) {
    sections.value = result.sections as RangeItem[]
  } else {
    sections.value = []
  }
  if (result && typeof result === 'object' && Array.isArray(result.shots)) {
    shots.value = result.shots as RangeItem[]
  } else {
    shots.value = []
  }
}

const saveSize = async () => {
  if (!props.filePath || !window.ipcRenderer?.invoke) return
  await window.ipcRenderer.invoke('analysis:update', {
    videoPath: props.filePath,
    patch: {
      videoWidth: videoWidth.value,
      videoHeight: videoHeight.value,
      updatedAt: Date.now(),
    },
  })
}

const onWorkAreaBack = () => {
  saveSize()
  emit('back')
}

const onCreateAct = async () => {
  if (!props.filePath || !window.ipcRenderer?.invoke) return
  const video = videoRef.value
  if (!video) return
  const result = await window.ipcRenderer.invoke('analysis:addAct', {
    videoPath: props.filePath,
    time: video.currentTime,
  })
  if (result && typeof result === 'object' && Array.isArray(result.acts)) {
    acts.value = result.acts as RangeItem[]
  }
}

const onCreateSection = async () => {
  if (!props.filePath || !window.ipcRenderer?.invoke) return
  const video = videoRef.value
  if (!video) return
  const result = await window.ipcRenderer.invoke('analysis:addSection', {
    videoPath: props.filePath,
    time: video.currentTime,
  })
  if (result && typeof result === 'object' && Array.isArray(result.sections)) {
    sections.value = result.sections as RangeItem[]
  }
}

const onCreateShot = async () => {
  if (!props.filePath || !window.ipcRenderer?.invoke) return
  const video = videoRef.value
  if (!video) return
  const result = await window.ipcRenderer.invoke('analysis:addShot', {
    videoPath: props.filePath,
    time: video.currentTime,
  })
  if (result && typeof result === 'object' && Array.isArray(result.shots)) {
    shots.value = result.shots as RangeItem[]
  }
}

const onUpdateAct = async (payload: { createdAt: number; start?: number | null; end?: number | null }) => {
  if (!props.filePath || !window.ipcRenderer?.invoke) return
  const result = await window.ipcRenderer.invoke('analysis:updateAct', {
    videoPath: props.filePath,
    createdAt: payload.createdAt,
    start: payload.start,
    end: payload.end,
  })
  if (result && typeof result === 'object' && Array.isArray(result.acts)) {
    acts.value = result.acts as RangeItem[]
  }
}

const onSetActStart = async (createdAt: number) => {
  if (!props.filePath || !window.ipcRenderer?.invoke) return
  const video = videoRef.value
  if (!video) return
  const result = await window.ipcRenderer.invoke('analysis:updateAct', {
    videoPath: props.filePath,
    createdAt,
    start: video.currentTime,
  })
  if (result && typeof result === 'object' && Array.isArray(result.acts)) {
    acts.value = result.acts as RangeItem[]
  }
}

const onSetActEnd = async (createdAt: number) => {
  if (!props.filePath || !window.ipcRenderer?.invoke) return
  const video = videoRef.value
  if (!video) return
  const result = await window.ipcRenderer.invoke('analysis:updateAct', {
    videoPath: props.filePath,
    createdAt,
    end: video.currentTime,
  })
  if (result && typeof result === 'object' && Array.isArray(result.acts)) {
    acts.value = result.acts as RangeItem[]
  }
}

const onDeleteAct = async (createdAt: number) => {
  if (!props.filePath || !window.ipcRenderer?.invoke) return
  const result = await window.ipcRenderer.invoke('analysis:deleteAct', {
    videoPath: props.filePath,
    createdAt,
  })
  if (result && typeof result === 'object' && Array.isArray(result.acts)) {
    acts.value = result.acts as RangeItem[]
  }
}

watch(
  () => props.filePath,
  () => {
    loadAnalysis()
  },
  { immediate: true }
)
</script>

<style scoped>
.player-page {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  padding: 0;
  box-sizing: border-box;
  background: #f7f7f7;
  display: flex;
  flex-direction: column;
}

.player-container {
  background: #000000;
  position: relative;
  display: flex;
  align-items: stretch;
}

.video-area {
  position: relative;
  background: #000000;
}

.player-video {
  width: 100%;
  height: 100%;
  display: block;
  background: #000000;
  object-fit: contain;
}


.resize-handle {
  position: absolute;
  width: 16px;
  height: 16px;
  right: 0;
  bottom: 0;
  cursor: nwse-resize;
  background: rgba(255, 255, 255, 0.7);
  border-left: 1px solid rgba(0, 0, 0, 0.25);
  border-top: 1px solid rgba(0, 0, 0, 0.25);
  box-sizing: border-box;
  touch-action: none;
}

</style>

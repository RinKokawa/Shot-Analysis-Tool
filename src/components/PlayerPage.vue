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
      <WorkArea :width="workWidth" :height="videoHeight" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import WorkArea from './WorkArea.vue'

defineProps<{ src: string }>()

const videoRef = ref<HTMLVideoElement | null>(null)
const aspectRatio = ref(16 / 9)
const videoWidth = ref(640)
const videoHeight = ref(360)

const minWidth = 240
const viewportWidth = ref(window.innerWidth)

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
  videoHeight.value = Math.round(videoWidth.value / aspectRatio.value)
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
  }

  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
}
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

<template>
  <div class="player-page">
    <div class="player-container" :style="containerStyle">
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
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'

defineProps<{ src: string }>()

const videoRef = ref<HTMLVideoElement | null>(null)
const aspectRatio = ref(16 / 9)
const containerWidth = ref(640)
const containerHeight = ref(360)

const minWidth = 240

const containerStyle = computed(() => ({
  width: `${containerWidth.value}px`,
  height: `${containerHeight.value}px`,
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
  const maxWidth = Math.max(minWidth, Math.min(960, window.innerWidth))
  containerWidth.value = maxWidth
  containerHeight.value = Math.round(maxWidth / aspectRatio.value)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
})

const onLoadedMetadata = () => {
  const video = videoRef.value
  if (!video || !video.videoWidth || !video.videoHeight) return
  aspectRatio.value = video.videoWidth / video.videoHeight
  containerHeight.value = Math.round(containerWidth.value / aspectRatio.value)
}

const onResizeStart = (event: PointerEvent) => {
  event.preventDefault()
  const startX = event.clientX
  const startY = event.clientY
  const startWidth = containerWidth.value
  const startHeight = containerHeight.value

  const onMove = (moveEvent: PointerEvent) => {
    const dx = moveEvent.clientX - startX
    const dy = moveEvent.clientY - startY
    const adjustByX = dx
    const adjustByY = dy * aspectRatio.value
    const useX = Math.abs(adjustByX) >= Math.abs(adjustByY)
    const nextWidth = startWidth + (useX ? adjustByX : adjustByY)
    const maxWidth = Math.max(minWidth, window.innerWidth)
    const clampedWidth = Math.max(minWidth, Math.min(maxWidth, Math.round(nextWidth)))
    containerWidth.value = clampedWidth
    containerHeight.value = Math.round(clampedWidth / aspectRatio.value)
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
